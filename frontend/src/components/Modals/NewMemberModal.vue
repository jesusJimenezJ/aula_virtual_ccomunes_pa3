
<template>
	<!-- Modal principal: agregar o editar miembro -->
	<Dialog
		v-model:open="show"
		:title="isEdit ? __('Editar miembro') : __('Agregar miembro')"
		size="lg"
		:actions="[
			{
				label: __('Cancelar'),
				variant: 'subtle',
				theme: 'red',
				onClick: ({ close }: any) => close(),
			},
			{
				label: isEdit ? __('Guardar cambios') : __('Agregar'),
				variant: 'solid',
				theme: 'blue',
				onClick: ({ close }: any) => submit(close),
			},
		]"
	>
		<template #default>
			<div class="space-y-5">
				<FormControl
					v-model="member.email"
					class="member-field"
					:label="__('Correo electrónico')"
					placeholder="ejemplo@correo.com"
					type="email"
					:required="!isEdit"
					:disabled="isEdit"
					@keyup.enter="submit()"
				/>

				<div
					v-if="!isEdit"
					class="grid grid-cols-1 gap-4 sm:grid-cols-2"
				>
					<FormControl
						v-model="member.first_name"
						class="member-field"
						:label="__('Primer nombre')"
						placeholder="Juan"
						type="text"
					/>

					<FormControl
						v-model="member.last_name"
						class="member-field"
						:label="__('Apellido')"
						placeholder="Pérez"
						type="text"
					/>
				</div>

				<div class="flex flex-col gap-3">
					<div class="text-p-sm-medium text-ink-gray-9">
						{{ __('Perfil del usuario') }}
					</div>

					<RoleSwitches
						:model-value="roles"
						@toggle="(key, value) => (roles[key] = value)"
					/>
				</div>
			</div>
		</template>
	</Dialog>

	<!-- Diálogo unificado para todas las alertas -->
	<Dialog
		v-model:open="alertDialogOpen"
		:title="alertTitle"
		size="sm"
	>
		<template #default>
			<div class="flex items-center gap-3 px-1 py-1">
				<div
					class="flex size-10 shrink-0 items-center justify-center rounded-full border"
					:class="{
						'border-outline-red-2 bg-surface-red-2': alertType === 'error',
						'border-outline-green-2 bg-surface-green-1': alertType === 'success',
						'border-outline-blue-2 bg-surface-blue-1': alertType === 'info',
					}"
				>
					<!-- Icono de error -->
					<svg
						v-if="alertType === 'error'"
						xmlns="http://www.w3.org/2000/svg"
						class="size-5 text-ink-red-6"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path
							d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"
						/>
						<path d="M12 8v4" />
						<path d="M12 16h.01" />
					</svg>

					<!-- Icono de éxito -->
					<svg
						v-else-if="alertType === 'success'"
						xmlns="http://www.w3.org/2000/svg"
						class="size-5 text-ink-green-6"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M20 6 9 17l-5-5" />
						<circle cx="12" cy="12" r="10" />
					</svg>

					<!-- Icono informativo -->
					<svg
						v-else
						xmlns="http://www.w3.org/2000/svg"
						class="size-5 text-ink-blue-6"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<circle cx="12" cy="12" r="10" />
						<path d="M12 16v-4" />
						<path d="M12 8h.01" />
					</svg>
				</div>

				<div class="flex min-w-0 flex-col gap-1">
					<h3 class="text-sm font-semibold text-ink-gray-9">
						{{ alertHeading }}
					</h3>

					<p class="text-xs leading-5 text-ink-gray-6">
						{{ alertMessage }}
					</p>
				</div>
			</div>

			<!-- Botón de confirmación -->
			<div class="mt-4 flex justify-end">
				<button
					type="button"
					class="member-alert-confirm"
					@click="alertDialogOpen = false"
				>
					{{ __('Entendido') }}
				</button>
			</div>
		</template>
	</Dialog>
</template>

<script setup lang="ts">
import { call, Dialog, FormControl } from 'frappe-ui'
import RoleSwitches from '@/components/Controls/RoleSwitches.vue'
import { computed, reactive, ref, watch } from 'vue'
import { cleanError } from '@/utils'
import {
	ROLE_ROWS,
	noRoles,
	type MemberRoleKey,
} from '@/components/Settings/Members/members'

const show = defineModel<boolean>({ default: false })
const submitting = ref(false)

/* =========================================================
   PROPIEDADES Y EVENTOS
========================================================= */

const props = defineProps<{
	defaultRoles?: string[]
	editMember?: {
		name: string
		full_name?: string
		roles?: string[]
	} | null
}>()

const emit = defineEmits<{
	created: [user: any]
	updated: []
}>()

const isEdit = computed(() => !!props.editMember)

/* =========================================================
   SISTEMA UNIFICADO DE ALERTAS
========================================================= */

type AlertType = 'error' | 'success' | 'info'

const alertDialogOpen = ref(false)
const alertTitle = ref('')
const alertHeading = ref('')
const alertMessage = ref('')
const alertType = ref<AlertType>('error')

const showAlert = (
	title: string,
	heading: string,
	message: string,
	type: AlertType = 'error'
) => {
	alertTitle.value = title
	alertHeading.value = heading
	alertMessage.value = message
	alertType.value = type
	alertDialogOpen.value = true
}

/* =========================================================
   MAPEO DE PERFILES Y ROLES TÉCNICOS
========================================================= */

const ROLE_MAP = Object.fromEntries(
	ROLE_ROWS.map((row) => [row.key, row.role])
) as Record<MemberRoleKey, string>

const member = reactive({
	email: '',
	first_name: '',
	last_name: '',
})

const roles = reactive(noRoles())
const initialRoles = reactive({ ...roles })

/* =========================================================
   FORMULARIO
========================================================= */

const resetForm = () => {
	member.email = ''
	member.first_name = ''
	member.last_name = ''

	for (const row of ROLE_ROWS) {
		roles[row.key] = props.defaultRoles?.includes(row.key) ?? false
	}
}

const loadMember = () => {
	member.email = props.editMember?.name ?? ''
	member.first_name = ''
	member.last_name = ''

	const current = props.editMember?.roles ?? []

	for (const key of Object.keys(ROLE_MAP) as MemberRoleKey[]) {
		roles[key] = current.includes(ROLE_MAP[key])
		initialRoles[key] = roles[key]
	}
}

watch(show, (isOpen) => {
	if (!isOpen) return

	if (isEdit.value) {
		loadMember()
	} else {
		resetForm()
	}
})

const submit = (close?: () => void) => {
	if (submitting.value) return

	return isEdit.value
		? saveRoles(close)
		: addMember(close)
}

/* =========================================================
   ASIGNACIÓN DE ROLES
========================================================= */

const assignRoles = async (userEmail: string) => {
	const selectedRoles = (
		Object.entries(roles) as [MemberRoleKey, boolean][]
	).filter(([_, checked]) => checked)

	for (const [key] of selectedRoles) {
		await call('lms.lms.api.save_role', {
			user: userEmail,
			role: ROLE_MAP[key],
			value: 1,
		})
	}
}

/* =========================================================
   DETECCIÓN DE ERRORES
========================================================= */

const getErrorText = (err: any): string => {
	const values = [
		err?.messages,
		err?.message,
		err?.exc,
		err?.exception,
		err?._server_messages,
		err?.response?.data,
	]

	return values
		.map((value) => {
			if (typeof value === 'string') return value

			if (Array.isArray(value)) {
				return value
					.map((item) =>
						typeof item === 'string'
							? item
							: item?.message ?? JSON.stringify(item)
					)
					.join(' ')
			}

			if (value && typeof value === 'object') {
				return value.message ?? JSON.stringify(value)
			}

			return ''
		})
		.filter(Boolean)
		.join(' ')
		.toLowerCase()
}

const isPermissionError = (err: any): boolean => {
	const rawMessage = getErrorText(err)

	return (
		rawMessage.includes('no tiene acceso') ||
		rawMessage.includes('no tienes acceso') ||
		rawMessage.includes('permiso de rol') ||
		rawMessage.includes('documento usuario') ||
		rawMessage.includes('no tienes permiso') ||
		rawMessage.includes('no tiene permiso') ||
		rawMessage.includes('permisos insuficientes') ||
		rawMessage.includes('sin autorización') ||
		rawMessage.includes('sin autorizacion') ||
		rawMessage.includes('not permitted') ||
		rawMessage.includes('permission denied') ||
		rawMessage.includes('insufficient permissions') ||
		rawMessage.includes('does not have access') ||
		rawMessage.includes('no permission') ||
		(rawMessage.includes('doctype') &&
			(rawMessage.includes('permission') ||
				rawMessage.includes('access')))
	)
}

/* =========================================================
   MANEJO CENTRALIZADO DE ERRORES
========================================================= */

const handleRequestError = (
	err: any,
	fallback: string
) => {
	console.error('Error en la gestión de miembros:', err)

	if (isPermissionError(err)) {
		showAlert(
			__('Acceso restringido'),
			__('Permisos insuficientes'),
			__('No tienes permisos para realizar esta acción. Contacta con el administrador.')
		)
		return
	}

	const errorMessage =
		err?.messages?.[0]?.message ??
		err?.messages?.[0] ??
		err?.message ??
		err?.exc

	showAlert(
		__('No se pudo completar la operación'),
		__('Ocurrió un problema'),
		cleanError(errorMessage) || fallback
	)
}

/* =========================================================
   CREAR MIEMBRO
========================================================= */

const addMember = async (close?: () => void) => {
	const email = member.email.trim()

	if (!email) {
		showAlert(
			__('Validación'),
			__('Campo obligatorio'),
			__('Escribe un correo electrónico para continuar.')
		)
		return
	}

	const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

	if (!emailPattern.test(email)) {
		showAlert(
			__('Validación'),
			__('Correo electrónico inválido'),
			__('Comprueba que el correo electrónico tenga un formato válido.')
		)
		return
	}

	submitting.value = true

	try {
		const user = await call('frappe.client.insert', {
			doc: {
				doctype: 'User',
				email,
				first_name: member.first_name.trim() || undefined,
				last_name: member.last_name.trim() || undefined,
			},
		})

		await assignRoles(user.name)

		emit('created', user)
		resetForm()
		close?.()

		showAlert(
			__('Operación completada'),
			__('Miembro agregado'),
			__('El miembro se ha agregado correctamente.'),
			'success'
		)
	} catch (err: any) {
		handleRequestError(
			err,
			__('No se pudo agregar el miembro. Inténtalo nuevamente.')
		)
	} finally {
		submitting.value = false
	}
}

/* =========================================================
   ACTUALIZAR PERFILES
========================================================= */

// Solo modifica los tres perfiles funcionales visibles.
// Los roles técnicos adicionales se conservan.
const saveRoles = async (close?: () => void) => {
	if (!props.editMember?.name) return

	submitting.value = true

	try {
		for (const key of Object.keys(ROLE_MAP) as MemberRoleKey[]) {
			if (roles[key] !== initialRoles[key]) {
				await call('lms.lms.api.save_role', {
					user: props.editMember.name,
					role: ROLE_MAP[key],
					value: roles[key] ? 1 : 0,
				})

				initialRoles[key] = roles[key]
			}
		}

		emit('updated')
		close?.()

		showAlert(
			__('Operación completada'),
			__('Cambios guardados'),
			__('La información del miembro se ha actualizado correctamente.'),
			'success'
		)
	} catch (err: any) {
		handleRequestError(
			err,
			__('No se pudo actualizar el miembro. Inténtalo nuevamente.')
		)
	} finally {
		submitting.value = false
	}
}
</script>

<style>
/* =========================================================
   CAMPOS DEL FORMULARIO
========================================================= */

.member-field input {
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	background-color: #f0f7ff !important;
	/* token-exempt-end */
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	border: 1px solid #c9def5 !important;
	/* token-exempt-end */
	border-radius: 10px !important;
	transition: all 0.2s ease;
}

.member-field input:hover:not(:disabled) {
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	border-color: #93bdf0 !important;
	/* token-exempt-end */
}

.member-field input:focus {
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	background-color: #ffffff !important;
	/* token-exempt-end */
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	border-color: #2583eb !important;
	/* token-exempt-end */
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	box-shadow: 0 0 0 2px rgba(37, 131, 235, 0.12) !important;
	/* token-exempt-end */
}

/* =========================================================
   BOTÓN DE CONFIRMACIÓN DE TODAS LAS ALERTAS
========================================================= */

button.member-alert-confirm {
	display: inline-flex !important;
	align-items: center !important;
	justify-content: center !important;
	padding: 9px 24px !important;

	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	background-color: #2583eb !important;
	/* token-exempt-end */
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	color: #ffffff !important;
	/* token-exempt-end */

	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	border: 1px solid #2583eb !important;
	/* token-exempt-end */
	border-radius: 12px !important;

	font-size: 14px !important;
	font-weight: 600 !important;

	overflow: hidden !important;
	transition: all 0.2s ease !important;
}

button.member-alert-confirm:hover {
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	background-color: #126bd1 !important;
	/* token-exempt-end */
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	border-color: #126bd1 !important;
	/* token-exempt-end */
	border-radius: 12px !important;
}

button.member-alert-confirm:focus,
button.member-alert-confirm:active,
button.member-alert-confirm:focus-visible {
	border-radius: 12px !important;
	outline: none !important;
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	box-shadow: 0 0 0 3px rgba(37, 131, 235, 0.18) !important;
	/* token-exempt-end */
}

/* =========================================================
   BOTÓN DE CERRAR: BORDE ROJO SUAVE
========================================================= */

body button[aria-label="Close"],
body button[aria-label="Cerrar"] {
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	border: 1px solid #fecaca !important;
	/* token-exempt-end */
	border-radius: 12px !important;
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	color: #dc2626 !important;
	/* token-exempt-end */
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	background-color: #fff7f7 !important;
	/* token-exempt-end */
	transition: all 0.2s ease;
}

body button[aria-label="Close"]:hover,
body button[aria-label="Cerrar"]:hover {
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	background-color: #fee2e2 !important;
	/* token-exempt-end */
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	border-color: #ef4444 !important;
	/* token-exempt-end */
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	color: #b91c1c !important;
	/* token-exempt-end */
}
</style>
