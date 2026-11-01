<template>
	<SettingsLayout
		:title="formTitle"
		show-back
		:unsaved="isDirty"
		:save-label="refusal ? undefined : __('Guardar')"
		:saving="saving"
		:can-save="isDirty"
		save-testid="member-save"
		@back="emit('back')"
		@save="save"
	>
		<div v-if="refusal" class="text-p-base text-ink-gray-6">
			{{ refusal }}
		</div>
		<div
			v-else-if="!member"
			class="flex flex-1 items-center justify-center py-20"
		>
			<LoadingIndicator class="size-5 text-ink-gray-5" />
		</div>
		<div v-else data-testid="member-fields" class="space-y-4">
			<div class="grid grid-cols-2 gap-4">
				<FormControl
					v-model="member.first_name"
					:label="__('Nombres')"
					type="text"
					placeholder="Ada"
					required
					autocomplete="off"
				/>
				<FormControl
					v-model="member.last_name"
					:label="__('Apellidos')"
					type="text"
					placeholder="Lovelace"
					autocomplete="off"
				/>
				<FormControl
					v-model="member.email"
					:label="__('Correo electrónico')"
					type="email"
					placeholder="ada@example.com"
					:disabled="isEdit"
					:required="!isEdit"
					autocomplete="off"
				/>
				<FormControl
					v-model="member.username"
					:label="__('Nombre de usuario')"
					type="text"
					placeholder="ada"
					autocomplete="off"
				/>
				<FormControl
					v-model="member.phone"
					:label="__('Teléfono')"
					type="text"
					placeholder="+51 1 234 5678"
					autocomplete="off"
				/>
				<FormControl
					v-model="member.mobile_no"
					:label="__('Celular')"
					type="text"
					placeholder="+51 999 999 999"
					autocomplete="off"
				/>
				<FormControl
					v-model="member.location"
					:label="__('Ubicación')"
					type="text"
					placeholder="Lima"
					autocomplete="off"
				/>
			</div>

			<FormControl
				v-model="member.bio"
				:label="__('Biografía')"
				type="textarea"
				:rows="3"
				:placeholder="__('Escribe una breve descripción de esta persona')"
				autocomplete="off"
			/>

			<div class="h-px border-t border-outline-elevation-2" />

			<div class="text-p-lg-semibold text-ink-gray-8">{{ __('Perfiles') }}</div>

			<RoleSwitches
				:model-value="roles"
				@toggle="(key, value) => (roles[key] = value)"
			/>
		</div>
	</SettingsLayout>
</template>

<script setup lang="ts">
import { FormControl, LoadingIndicator, call, createResource } from 'frappe-ui'
import { computed, inject, reactive, ref } from 'vue'
import { useOnboarding } from '@framework/ui/components/Onboarding/index'
import { useTelemetry } from '@framework/ui/telemetry/index'
import RoleSwitches from '@/components/Controls/RoleSwitches.vue'
import SettingsLayout from '@/components/Layouts/settings/desktop/SettingsLayout.vue'
import {
	MEMBERS_DOCTYPE,
	ROLE_ROWS,
	memberError,
	noRoles,
	rolesFrom,
} from '@/components/Settings/Members/members'
import { useSettingsRecord } from '@/composables/useSettingsRecord'
import { runSave, useSaveState } from '@/composables/useSettingsSave'
import { NEW_RECORD } from '@/composables/useSettingsSource'
import { notifyMembersChanged } from '@/stores/members'
import { sanitizeHTML } from '@/utils'
import type { SessionUser, SettingsListRow } from '@/types'

/**
 * One member, behind both New and a row. Hand-rolled rather than routed
 * through SettingsFields, because a member is two things saved two different
 * ways: a User document, and four roles each saved via `save_role`.
 */

const props = defineProps<{
	name?: string | null
	row?: SettingsListRow | null
}>()

const emit = defineEmits<{ back: [] }>()

const user = inject<SessionUser>('$user')!
const { capture } = useTelemetry()
const { updateOnboardingStep } = useOnboarding('learning')

const state = useSaveState()
const saving = state.saving

const record = computed(() => props.name ?? null)

const isEdit = computed(
	() => Boolean(record.value) && record.value !== NEW_RECORD
)

const formTitle = computed(() => {
	if (!isEdit.value) return __('Agregar nuevo usuario')
	return props.row?.full_name || __('Editar usuario')
})

// The backend independently validates member-management permissions.
const refusal = computed(() => {
	if ((window as Window & { read_only_mode?: boolean }).read_only_mode)
		return __('El sitio está en modo de solo lectura.')
	if (
        !user.data?.is_moderator &&
        !user.data?.is_system_manager &&
        !user.data?.is_administrator
    )
		return __('No tienes permiso para administrar usuarios.')
	return ''
})

const roles = reactive(noRoles())
const initialRoles = reactive(noRoles())

const rolesDirty = computed(() =>
	ROLE_ROWS.some((row) => roles[row.key] !== initialRoles[row.key])
)

// The User document itself. NEW_RECORD yields a draft that `save()` inserts,
// so New and edit share the same fields and handle. A member is dirty for two
// reasons: the profile fields, and the roles, saved through their own endpoint.
const {
	source,
	doc: member,
	isDirty,
} = useSettingsRecord({
	doctype: MEMBERS_DOCTYPE,
	record,
	dirty: (s) => s.isDirty || rolesDirty.value,
})

// get_member, not the list endpoint: that one hard-filters `enabled = 1` and
// pages, so a disabled member could never come back. It's also the only read
// of a member's roles a moderator without System Manager can make.
const memberFetch = createResource({
	url: 'lms.lms.api.get_member',
	makeParams: () => ({ member: record.value }),
	auto: false,
	onSuccess(row: { roles?: string[] }) {
		const granted = rolesFrom(row?.roles)
		// A switch flipped while the row was still in flight is the newer intent,
		// so only the baseline moves under it.
		if (!rolesDirty.value) Object.assign(roles, granted)
		Object.assign(initialRoles, granted)
	},
}) as unknown as { fetch: () => void }

// Named here rather than left to the server, which answers one missing field
// per round trip. Everything past the first gap still has to survive the server
// saying no.
const validate = (): string => {
	const doc = member.value
	if (!doc) return __('El usuario todavía no se ha cargado')
	if (!isEdit.value && !String(doc.email ?? '').trim())
		return __('El correo electrónico es obligatorio')
	if (!String(doc.first_name ?? '').trim()) return __('Los nombres son obligatorios')
	return ''
}

const saveRoles = async (name: string) => {
	for (const row of ROLE_ROWS) {
		if (roles[row.key] === initialRoles[row.key]) continue
		await call('lms.lms.api.save_role', {
			user: name,
			role: row.role,
			value: roles[row.key] ? 1 : 0,
		})
		// Recorded per row, not after the loop. A refused write partway through
		// leaves the rows already saved reported as saved, so a retry sends only
		// what is still outstanding.
		initialRoles[row.key] = roles[row.key]
	}
}

const save = () => {
	if (refusal.value || !isDirty.value) return

	const creating = !isEdit.value
	return runSave(state, {
		validate,
		toastInvalid: true,
		run: async () => {
			let name = record.value
			if (source.isDirty) {
				const doc = member.value
				// The same treatment the user's own profile form gives it: a bio is
				// drawn as HTML on the profile page.
				if (doc?.bio) doc.bio = sanitizeHTML(doc.bio)
				const saved = (await source.save()) as { name?: string } | undefined
				if (creating) name = saved?.name ?? null
			}

			if (name && name !== NEW_RECORD) await saveRoles(name)

			if (creating) {
				if (user.data?.is_system_manager)
					updateOnboardingStep('invite_students')
				capture('user_added')
			}
		},
		success: creating ? __('Usuario agregado correctamente') : __('Usuario actualizado correctamente'),
		after: () => {
			notifyMembersChanged()
			emit('back')
		},
		failure: (error: any) =>
			memberError(
				error,
				creating ? __('No se pudo agregar el usuario') : __('No se pudo actualizar el usuario')
			),
	})
}

// The roles read ran from openForm; the form mounts on one member now, so it
// runs at setup. Placed last because memberFetch is a const above it only by
// declaration order, this is the first point every initialiser has run.
if (isEdit.value && !refusal.value) memberFetch.fetch()
</script>
