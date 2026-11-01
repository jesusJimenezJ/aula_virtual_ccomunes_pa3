import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('frappe-ui', async () => {
	const actual = await vi.importActual<typeof import('frappe-ui')>('frappe-ui')

	return {
		...actual,
		call: vi.fn(),
		createResource: () => ({
			data: null,
			loading: false,
			submit: vi.fn(),
		}),
		toast: {
			success: vi.fn(),
			error: vi.fn(),
		},
		SidebarHeader: {
			name: 'SidebarHeader',
			props: ['title', 'subtitle', 'menuItems'],
			template: '<div><slot name="prefix" /></div>',
		},
	}
})

vi.mock('@/stores/session', () => ({
	sessionStore: () => ({
		logout: { submit: vi.fn() },
		branding: { data: null },
		isLoggedIn: true,
	}),
}))

vi.mock('@/stores/user', () => ({
	usersStore: () => ({
		userResource: { data: { is_moderator: false } },
	}),
}))

vi.mock('@/stores/settings', () => ({
	useSettings: () => ({
		settings: { data: null },
	}),
}))

vi.mock('@/composables/useSettingsHash', () => ({
	pushSettingsHash: vi.fn(),
}))
vi.mock('@/utils/openExternal', () => ({ openExternal: vi.fn() }))
vi.mock('@/utils/dialogs', () => ({ createDialog: vi.fn() }))
vi.mock('@/components/Icons/LMSLogo.vue', () => ({
	default: { template: '<div />' },
}))
vi.mock('@/components/Settings/Settings.vue', () => ({
	default: { template: '<div />' },
}))
vi.mock('vue-router', () => ({
	useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('@/utils', () => ({
	convertToTitleCase: (value: string) => value,
}))
vi.mock('@/utils/safeUrl', () => ({
	safeUrl: (value: string) => value,
}))

vi.stubGlobal('__', (value: string) => value)

import UserDropdown from '@/components/Sidebar/UserDropdown.vue'
import { setThemePreference, themePreference } from '@/utils/theme'

function build() {
	setActivePinia(createPinia())
	return mount(UserDropdown, {
		global: { mocks: { __: (value: string) => value } },
	})
}

function getMenuOptions(wrapper: ReturnType<typeof build>) {
	const menuItems = wrapper
		.findComponent({ name: 'SidebarHeader' })
		.props('menuItems') as Array<{
		label?: string
		options?: Array<{ label?: string }>
	}>

	return menuItems.flatMap((item) =>
		item.options ? item.options : [item],
	)
}

describe('UserDropdown: tema bloqueado en claro', () => {
	beforeEach(() => {
		setThemePreference('light')
	})

	afterEach(() => {
		setThemePreference('light')
	})

	it('no agrega un selector de tema al menú del usuario', () => {
		const options = getMenuOptions(build())
		const labels = options.map((option) => option.label)

		expect(labels).not.toContain('Theme')
		expect(labels).not.toContain('Tema')
	})

	it('mantiene el tema claro al solicitar la preferencia dark', () => {
		setThemePreference('dark')

		expect(themePreference.value).toBe('light')
	})

	it('mantiene el tema claro al solicitar la preferencia system', () => {
		setThemePreference('system')

		expect(themePreference.value).toBe('light')
	})

	it('mantiene el menú de usuario disponible sin opciones de tema', () => {
		const options = getMenuOptions(build())
		const labels = options
			.map((option) => option.label)
			.filter(Boolean)

		expect(labels).toContain('Mi perfil')
		expect(labels).toContain('Ajustes')
		expect(labels).toContain('Cerrar sesión')
		expect(labels).not.toContain('Theme')
		expect(labels).not.toContain('Tema')
	})
})
