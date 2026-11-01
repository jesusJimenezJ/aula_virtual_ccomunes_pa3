import { ref } from 'vue'

export type Theme = 'light' | 'dark'
export type ThemePreference = 'light' | 'dark' | 'system'

/**
 * CComunes utiliza exclusivamente el tema claro.
 * Se conservan los nombres y tipos exportados para
 * mantener compatibilidad con los componentes existentes.
 */

export const theme = ref<Theme>('light')
export const themePreference = ref<ThemePreference>('light')

const applyLightTheme = (): void => {
    theme.value = 'light'
    themePreference.value = 'light'

    if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', 'light')
        document.documentElement.style.colorScheme = 'light'
    }

    if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('themePreference')
    }
}

export const setThemePreference = (
    _preference: ThemePreference
): void => {
    applyLightTheme()
}

applyLightTheme()
