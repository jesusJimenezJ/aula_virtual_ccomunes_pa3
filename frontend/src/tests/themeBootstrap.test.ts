import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(__dirname, '../..')
const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8')

const bootstrapSource = (): string => {
        const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
                (match) => match[1]
        )
        const source = scripts.find((body) => body.includes('data-theme'))
        if (!source) throw new Error('index.html has no data-theme bootstrap')
        return source
}

const runBootstrap = (): string | null => {
        let attribute: string | null = null
        const documentStub = {
                documentElement: {
                        setAttribute: (name: string, value: string) => {
                                if (name === 'data-theme') attribute = value
                        },
                },
        }
        new Function('window', 'document', 'localStorage', bootstrapSource())(
                {},
                documentStub,
                { getItem: () => 'dark' }
        )
        return attribute
}

afterEach(() => {
        vi.unstubAllGlobals()
        localStorage.clear()
        document.documentElement.removeAttribute('data-theme')
})

describe('the theme applied before first paint', () => {
        it('sets the document to light before the stylesheet paints', () => {
                expect(runBootstrap()).toBe('light')
        })

        it('keeps the bootstrap in the document head', () => {
                const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>'))
                expect(head).toContain(bootstrapSource())
        })

        it('keeps the runtime theme fixed to light', async () => {
                localStorage.setItem('themePreference', 'dark')
                vi.resetModules()
                const module = await import('../utils/theme')
                expect(module.theme.value).toBe('light')
                expect(document.documentElement.getAttribute('data-theme')).toBe('light')
        })
})
