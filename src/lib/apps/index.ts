/**
 * Apps Module
 * Centralized app registry and routing utilities.
 */

export {
  // Types
  type AppId,
  type AppSection,
  type AppStatus,
  type AppDefinition,
  // Registry
  APP_REGISTRY,
  APP_LIST,
  VISIBLE_APPS,
  APPS_BY_SECTION,
  SECTION_APP_IDS,
  ALL_APP_IDS,
  // Utilities
  getApp,
  isValidAppId,
  getImplementedApps,
  getPlaceholderApps,
  sectionToTabs,
  getDefaultAppIds,
  getMarketplaceApps,
  getAppsByCategory,
  CATEGORY_LABELS,
} from './registry'

export {
  // Router
  AppRouter,
  registerAppView,
  hasRegisteredView,
  getRegisteredViews,
  getAppIndex,
  // Types
  type AppViewProps,
  type AppViewComponent,
  type AppViewConfig,
  type AppRouterProps,
  type TransitionPreset,
} from './AppRouter'
