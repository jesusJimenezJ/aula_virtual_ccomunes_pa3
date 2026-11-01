import { call, toast } from 'frappe-ui'
import type { FrappeResourceError } from 'frappe-ui'
import { markRaw } from 'vue'
// @ts-expect-error utils/dialogs.js is still plain JS, so it has no declarations
import { createDialog } from '@/utils/dialogs'
import Members from '@/components/Settings/Members/Members.vue'
import { cleanError } from '@/utils'
import type { CustomPage, SelectOption } from '@/types/settingsSchema'
import type { SettingsListColumn, SettingsListRow } from '@/types'

/**
 * Settings > Users, as config: what the list shows, what a row offers, and
 * the roles the form can grant. Members.vue draws all of it.
 *
 * Every translated string is produced inside a function: `__` is installed
 * on window after main.js finishes importing the settings tree, so a
 * `__()` call at module scope would throw.
 */

export const MEMBERS_METHOD = 'lms.lms.api.get_members'

// Users, as far as list invalidation is concerned: get_members returns them
// and delete_member removes them.
export const MEMBERS_DOCTYPE = 'User'


/**
 * Perfiles funcionales definidos por el Sprint 1.
 * Los nombres técnicos corresponden a roles existentes de Frappe.
 */
const ROLE_LABELS: Record<string, () => string> = {
	'LMS Student': () => __('Estudiante'),
	'Course Creator': () => __('Docente'),
	Moderator: () => __('Personal de soporte'),
}

export const roleOptions = (): SelectOption[] => [
	{ label: __('Todos'), value: 'All' },
	...Object.entries(ROLE_LABELS).map(([value, label]) => ({
		label: label(),
		value,
	})),
]

/**
 * Los tres perfiles funcionales que se muestran en la administración.
 * Batch Evaluator se conserva como rol técnico interno y no se expone aquí.
 */
export const ROLE_ROWS = [
	{
		key: 'lms_student',
		role: 'LMS Student',
		label: () => __('Estudiante'),
		description: () => __('Accede a cursos y realiza actividades académicas'),
	},
	{
		key: 'course_creator',
		role: 'Course Creator',
		label: () => __('Docente'),
		description: () => __('Gestiona cursos, contenidos y actividades académicas'),
	},
	{
		key: 'moderator',
		role: 'Moderator',
		label: () => __('Personal de soporte'),
		description: () => __('Administra el aula virtual según sus permisos'),
	},
] as const

export type MemberRoleKey = typeof ROLE_ROWS[number]['key']

export type MemberRoles = Record<MemberRoleKey, boolean>

export const noRoles = (): MemberRoles => ({
	lms_student: false,
	course_creator: false,
	moderator: false,
})

/**
 * Convierte los roles técnicos de Frappe en perfiles visibles.
 * Los roles adicionales no se modifican.
 */
export const rolesFrom = (granted: string[] | undefined): MemberRoles => {
	const held = granted ?? []
	const roles = noRoles()

	for (const row of ROLE_ROWS) {
		roles[row.key] = held.includes(row.role)
	}

	return roles
}

export interface MemberRowActions {
	/** The member's own page, which is not a settings page. */
	profile: (row: SettingsListRow) => void
	remove: (row: SettingsListRow) => void
}

export const memberColumns = (
	actions: MemberRowActions
): SettingsListColumn[] => [
	{
		key: 'member',
		label: __('Usuario'),
		type: 'stacked',
		primary: (row) => row.full_name,
		secondary: (row) => row.name,
		avatar: (row) => ({ image: row.user_image, label: row.full_name }),
	},
	{
		key: 'roles',
		label: __('Perfiles'),
		type: 'badge',
		badges: (row) =>
			((row.roles || []) as string[])
				.filter((role) => ROLE_LABELS[role])
				.map((role) => ({
					label: ROLE_LABELS[role](),
					theme: 'gray' as const,
				})),
	},
	{
		key: 'actions',
		type: 'actions',
		ariaLabel: (row) => __('Acciones para {0}').format(row.full_name),
		// Editing is what a row click does now, so the menu carries the two
		// things a click cannot: the person's public profile, and deletion.
		options: (row) => [
			{
				label: __('Ir al perfil'),
				icon: 'lucide-user',
				onClick: () => actions.profile(row),
			},
			{
				label: __('Eliminar usuario'),
				icon: 'lucide-trash-2',
				theme: 'red',
				onClick: () => actions.remove(row),
			},
		],
	},
]

export const memberError = (
	error: FrappeResourceError,
	fallback: string
): string => {
	const message = error?.messages?.[0] || error?.message
	return message ? cleanError(message) : fallback
}

const removeMember = (
	row: SettingsListRow,
	close: (() => void) | undefined,
	onDeleted: () => void
) =>
	call('lms.lms.api.delete_member', { user: row.name })
		.then(() => {
			if (typeof close === 'function') close()
			toast.success(__('Usuario eliminado correctamente'))
			onDeleted()
		})
		.catch((error: FrappeResourceError) => {
			toast.error(memberError(error, __('No se pudo eliminar el usuario')))
			console.error(error)
		})

// Same confirmation the other settings lists put a delete behind (Categories,
// Transactions): a red solid Delete in a dialog that says what is lost. A user
// account is the most destructive row in settings, so it keeps one.
export const confirmMemberDeletion = (
	row: SettingsListRow,
	onDeleted: () => void
) => {
	createDialog({
		title: __('¿Eliminar a {0}?').format(row.full_name),
		message: __(
			'Esta acción eliminará permanentemente la cuenta y no se podrá deshacer.'
		),
		size: 'sm',
		actions: [
			{
				label: __('Eliminar'),
				theme: 'red',
				variant: 'solid',
				onClick({ close }: { close: () => void }) {
					removeMember(row, close, onDeleted)
				},
			},
		],
	})
}

// A getter, not a property: this module and Members.vue import each other,
// so whichever loads first finds the other's bindings uninitialized. Reading
// it when the panel renders, not while this module evaluates, keeps the pair safe.
export const membersSettingsPage: CustomPage = {
	kind: 'custom',
	get component() {
		return markRaw(Members)
	},
}
