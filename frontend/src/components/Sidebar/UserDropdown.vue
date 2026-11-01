
<template>
	<div class="ccomunes-user-header">
		<SidebarHeader
			:title="appName"
			:subtitle="
				userResource.data ? convertToTitleCase(userResource.data.full_name) : ''
			"
			:menuItems="userDropdownOptions"
		>
			<template #prefix>
				<img
					v-if="branding.data?.banner_image"
					:src="safeUrl(branding.data?.banner_image.file_url)"
					alt=""
					class="size-full object-cover"
				/>
				<LMSLogo v-else class="size-full" />
			</template>
		</SidebarHeader>
	</div>

	<SettingsModal
        v-if="
            userResource.data?.is_moderator ||
            userResource.data?.is_system_manager ||
            userResource.data?.is_administrator
        "
    />
</template>

<script setup>
import { sessionStore } from '@/stores/session'
import { call, createResource, SidebarHeader, toast } from 'frappe-ui'
import { useRouter } from 'vue-router'
import { convertToTitleCase } from '@/utils'
import { usersStore } from '@/stores/user'
import { useSettings } from '@/stores/settings'
import { h, computed } from 'vue'
import { createDialog } from '@/utils/dialogs'
import FrappeCloudIcon from '@/components/Icons/FrappeCloudIcon.vue'
import LMSLogo from '@/components/Icons/LMSLogo.vue'
import SettingsModal from '@/components/Settings/Settings.vue'
import { safeUrl } from '@/utils/safeUrl'
import { openExternal } from '@/utils/openExternal'
import { pushSettingsHash } from '@/composables/useSettingsHash'

const router = useRouter()
const { logout, branding } = sessionStore()
const { userResource } = usersStore()
const settingsStore = useSettings()
const { isLoggedIn } = sessionStore()

const frappeCloudBaseEndpoint = 'https://frappecloud.com'
const $dialog = createDialog

const appName = computed(() =>
	branding.data?.app_name && branding.data.app_name != 'Frappe'
		? branding.data.app_name
		: 'Ccomunes'
)


function isSystemUser() {
	const cookies = new URLSearchParams(document.cookie.split('; ').join('&'))
	return cookies.get('system_user') === 'yes'
}

// Solo los usuarios del sistema consultan las aplicaciones disponibles.
const apps = createResource({
	url: 'frappe.apps.get_apps',
	cache: 'apps',
	auto: isSystemUser(),
	transform: (data) => [deskApp(), ...siblingApps(data)],
})

function deskApp() {
	return {
		name: 'frappe',
		logo: '/assets/lms/images/desk.png',
		title: __('Desk'),
		route: '/desk/learning',
	}
}

function siblingApps(data) {
	return data
		.filter((app) => app.name !== 'lms')
		.map((app) => ({
			name: app.name,
			logo: app.logo,
			title: __(app.title),
			route: app.route,
		}))
}

const appMenuItems = computed(() => {
	return (apps.data || []).map((app) => ({
		label: app.title,
		onClick: () => {
			window.location.href = app.route
		},
		slots: {
			prefix: () =>
				h('img', {
					class: 'size-4 shrink-0 rounded-4',
					src: app.logo,
					alt: '',
				}),
		},
	}))
})

const userDropdownOptions = computed(() => {
	return [
		{
			group: '',
			options: [
				{
					icon: 'lucide-user',
					label: __('Mi perfil'),
					onClick: () => {
						router.push(`/user/${userResource.data?.username}`)
					},
					condition: () => {
						return isLoggedIn
					},
				},
				{
					icon: 'lucide-layout-grid',
					label: __('Apps'),
					submenu: appMenuItems.value,
					condition: isSystemUser,
				},
				{
					icon: 'lucide-settings',
					label: __('Ajustes'),
					onClick: () => {
						pushSettingsHash(router)
					},
					condition: () => {
						return (
                userResource.data?.is_moderator ||
                userResource.data?.is_system_manager ||
                userResource.data?.is_administrator
            )
					},
				},
				{
					icon: 'lucide-wrench',
					label: __('Configuration'),
					submenu: [
						{
							icon: 'lucide-arrow-down-to-line',
							label: __('Import'),
							onClick: () => {
								router.push({
									name: 'DataImportList',
									query: { step: 'list' },
								})
							},
						},
					],
					condition: () => {
						return userResource.data?.is_moderator
					},
				},
				{
					label: __('Borrar datos de demostración'),
					icon: 'lucide-trash-2',
					onClick: () => {
						clearDemoDataConfirmation()
					},
					condition: () => {
						return (
							userResource.data?.is_moderator &&
							settingsStore.settings.data?.demo_data_present
						)
					},
				},
				{
					icon: FrappeCloudIcon,
					label: __('Iniciar sesión en Frappe Cloud'),
					onClick: () => {
						$dialog({
							title: __('Login to Frappe Cloud?'),
							message: __(
								'Are you sure you want to login to your Frappe Cloud dashboard?'
							),
							actions: [
								{
									label: __('Confirm'),
									variant: 'solid',
									onClick({ close }) {
										loginToFrappeCloud()
										close()
									},
								},
							],
						})
					},
					condition: () => {
						return (
							userResource.data?.is_system_manager &&
							userResource.data?.is_fc_site
						)
					},
				},
				{
					icon: 'lucide-log-out',
					label: __('Cerrar sesión'),
					onClick: () => {
						logout.submit().then(() => {
							isLoggedIn = false
						})
					},
					condition: () => {
						return isLoggedIn
					},
				},
				{
					icon: 'lucide-log-in',
					label: __('Iniciar sesión'),
					onClick: () => {
						window.location.href = '/login'
					},
					condition: () => {
						return !isLoggedIn
					},
				},
			],
		},
	]
})

const loginToFrappeCloud = () => {
	const redirect_to = '/dashboard/sites/' + userResource.data.sitename
	openExternal(`${frappeCloudBaseEndpoint}${redirect_to}`)
}

const clearDemoDataConfirmation = () => {
	$dialog({
		title: __('Confirm clearing demo data?'),
		message: __(
			'Are you sure you want to clear the demo data? This would delete the course "A guide  to Frappe Learning" along with all its associated data. This action cannot be undone.'
		),
		actions: [
			{
				label: __('Confirm'),
				theme: 'red',
				variant: 'solid',
				onClick({ close }) {
					clearDemoData()
					close()
				},
			},
		],
	})
}

const clearDemoData = () => {
	call('lms.lms.api.clear_demo_data')
		.then(() => {
			window.location.href = '/lms'
			toast.success(__('Demo data cleared successfully'))
		})
		.catch((error) => {
			toast.error(__(error.message || 'Error clearing demo data'))
			console.error('Error clearing demo data:', error)
		})
}
</script>

<style scoped>
.ccomunes-user-header {
	padding: 0.65rem 0.55rem;
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	border-bottom: 1px solid #29415b;
	/* token-exempt-end */
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	color: #ffffff;
	/* token-exempt-end */
}

/* Colores del encabezado y del texto del usuario */
.ccomunes-user-header :deep(*) {
	color: inherit;
}

.ccomunes-user-header :deep(button:hover) {
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	background: #193957;
	/* token-exempt-end */
}
</style>
