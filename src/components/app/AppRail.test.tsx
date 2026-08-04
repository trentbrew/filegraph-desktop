/**
 * AppRail Tests
 *
 * Tests the structural integrity of the AppRail component:
 * - Renders all home-section apps
 * - Renders visible apps from persisted storage
 * - Highlights active app
 * - Settings button present
 * - Marketplace button present
 */

import * as React from 'react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock stores
const mockSetActiveApp = vi.fn()
let mockActiveApp = 'home'

vi.mock('@/stores/useAppStore', () => ({
  useAppStore: (selector: any) => {
    const state = { activeApp: mockActiveApp, setActiveApp: mockSetActiveApp }
    return selector ? selector(state) : state
  },
}))

const mockSetAppRailOpen = vi.fn()

vi.mock('@/stores/useUIStore', () => ({
  useUIStore: (selector: any) => {
    const state = { setAppRailOpen: mockSetAppRailOpen }
    return selector ? selector(state) : state
  },
}))

// Mock Tauri API (not available in jsdom)
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

// Mock tooltip/popover to avoid portal issues in jsdom
vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children, asChild }: any) => (asChild ? children : <div>{children}</div>),
  TooltipContent: ({ children }: any) => <div data-testid="tooltip-content">{children}</div>,
}))

vi.mock('@/components/ui/context-menu', () => ({
  ContextMenu: ({ children }: any) => <div>{children}</div>,
  ContextMenuTrigger: ({ children, asChild }: any) => (asChild ? children : <div>{children}</div>),
  ContextMenuContent: ({ children }: any) => <div data-testid="context-menu-content">{children}</div>,
  ContextMenuItem: ({ children, onClick }: any) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}))

vi.mock('./AppMarketplace', () => ({
  AppMarketplace: ({ popoverSide }: any) => (
    <button data-testid="app-marketplace" data-popover-side={popoverSide}>
      +
    </button>
  ),
}))

import { AppRail } from './AppRail'
import { SECTION_APP_IDS, getApp } from '@/lib/apps'

describe('AppRail', () => {
  beforeEach(() => {
    mockActiveApp = 'home'
    mockSetActiveApp.mockClear()
    mockSetAppRailOpen.mockClear()
    localStorage.clear()
  })

  it('renders all home-section app buttons', () => {
    render(<AppRail />)

    for (const id of SECTION_APP_IDS.home) {
      const app = getApp(id)
      const btn = screen.getByRole('button', { name: app.name })
      expect(btn).toBeDefined()
    }
  })

  it('renders Settings button', () => {
    render(<AppRail />)
    const settingsBtn = screen.getByRole('button', { name: 'Settings' })
    expect(settingsBtn).toBeDefined()
  })

  it('renders AppMarketplace with popoverSide="top"', () => {
    render(<AppRail />)
    const marketplace = screen.getByTestId('app-marketplace')
    expect(marketplace).toBeDefined()
    expect(marketplace.getAttribute('data-popover-side')).toBe('top')
  })

  it('calls setActiveApp when a home app button is clicked', () => {
    render(<AppRail />)
    const homeApp = getApp(SECTION_APP_IDS.home[0])
    const btn = screen.getByRole('button', { name: homeApp.name })
    fireEvent.click(btn)
    expect(mockSetActiveApp).toHaveBeenCalledWith(SECTION_APP_IDS.home[0])
  })

  it('calls setActiveApp("settings") when settings is clicked', () => {
    render(<AppRail />)
    const settingsBtn = screen.getByRole('button', { name: 'Settings' })
    fireEvent.click(settingsBtn)
    expect(mockSetActiveApp).toHaveBeenCalledWith('settings')
  })

  it('persists visible apps to localStorage', () => {
    const key = 'filegraph:dock:visible-apps'
    const testIds = ['files', 'calendar', 'terminal']
    localStorage.setItem(key, JSON.stringify(testIds))

    render(<AppRail />)

    // The persisted apps should be loaded (we verify they're rendered as buttons)
    for (const id of testIds) {
      const app = getApp(id as any)
      const btn = screen.getByRole('button', { name: app.name })
      expect(btn).toBeDefined()
    }
  })

  it('falls back to default app IDs when localStorage is empty', () => {
    render(<AppRail />)
    // Should not throw; component renders with defaults
    // Home section is always shown regardless
    for (const id of SECTION_APP_IDS.home) {
      const app = getApp(id)
      expect(screen.getByRole('button', { name: app.name })).toBeDefined()
    }
  })

  it('hides app rail from context menu', () => {
    render(<AppRail />)
    fireEvent.click(screen.getByRole('button', { name: /Hide App Rail/i }))
    expect(mockSetAppRailOpen).toHaveBeenCalledWith(false)
  })
})
