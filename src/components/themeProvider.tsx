import { createContext, useContext, useEffect, useState } from 'react'
import { Theme, ThemeStyleProps } from '@/lib/themes/schema'
import { builtInThemes, defaultTheme } from '@/lib/themes/registry'

type ThemeMode = 'dark' | 'light' | 'system'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultMode?: ThemeMode
  defaultThemeId?: string
  storageKey?: string
}

type ThemeProviderState = {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  themeId: string
  setThemeId: (id: string) => void
  availableThemes: Theme[]
  addTheme: (theme: Theme) => void
  removeTheme: (id: string) => void
}

const initialState: ThemeProviderState = {
  mode: 'system',
  setMode: () => null,
  themeId: defaultTheme.id,
  setThemeId: () => null,
  availableThemes: builtInThemes,
  addTheme: () => null,
  removeTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultMode = 'system',
  defaultThemeId = defaultTheme.id,
  storageKey = 'vite-ui-theme',
  ...props
}: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>(
    () => (localStorage.getItem(`${storageKey}-mode`) as ThemeMode) || defaultMode,
  )

  const [themeId, setThemeId] = useState<string>(() => localStorage.getItem(`${storageKey}-id`) || defaultThemeId)

  const [customThemes, setCustomThemes] = useState<Theme[]>(() => {
    try {
      const stored = localStorage.getItem(`${storageKey}-custom`)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const availableThemes = [...builtInThemes, ...customThemes]

  // Listen for theme changes from agent actions (custom event for same-window)
  useEffect(() => {
    const handleThemeChange = (e: CustomEvent<{ mode?: string; preset?: string }>) => {
      if (e.detail.mode) {
        const newMode = e.detail.mode as ThemeMode
        localStorage.setItem(`${storageKey}-mode`, newMode)
        setMode(newMode)
      }
      if (e.detail.preset) {
        localStorage.setItem(`${storageKey}-id`, e.detail.preset)
        setThemeId(e.detail.preset)
      }
    }

    window.addEventListener('theme-change', handleThemeChange as EventListener)
    return () => window.removeEventListener('theme-change', handleThemeChange as EventListener)
  }, [storageKey])

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove('light', 'dark')

    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

    const effectiveMode = mode === 'system' ? systemTheme : mode
    root.classList.add(effectiveMode)

    // Apply theme variables
    const currentTheme = availableThemes.find((t) => t.id === themeId) || defaultTheme
    const styles = currentTheme.styles[effectiveMode]

    // Helper to convert camelCase to kebab-case for CSS variables
    const toCssVar = (key: string) => {
      // Handle chart variables specifically (chart1 -> --chart-1)
      if (/^chart\d+$/.test(key)) {
        return `--${key.replace('chart', 'chart-')}`
      }
      return `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
    }

    // Apply styles to root
    Object.entries(styles).forEach(([key, value]) => {
      root.style.setProperty(toCssVar(key), value as string)
    })
  }, [mode, themeId, availableThemes])

  const addTheme = (theme: Theme) => {
    const newThemes = [...customThemes, theme]
    setCustomThemes(newThemes)
    localStorage.setItem(`${storageKey}-custom`, JSON.stringify(newThemes))
  }

  const removeTheme = (id: string) => {
    const newThemes = customThemes.filter((t) => t.id !== id)
    setCustomThemes(newThemes)
    localStorage.setItem(`${storageKey}-custom`, JSON.stringify(newThemes))
    if (themeId === id) {
      setThemeId(defaultTheme.id)
    }
  }

  const value = {
    mode,
    setMode: (mode: ThemeMode) => {
      localStorage.setItem(`${storageKey}-mode`, mode)
      setMode(mode)
    },
    themeId,
    setThemeId: (id: string) => {
      localStorage.setItem(`${storageKey}-id`, id)
      setThemeId(id)
    },
    availableThemes,
    addTheme,
    removeTheme,
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider')

  return context
}
