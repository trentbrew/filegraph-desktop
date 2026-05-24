// import React from "react"; // Commented out with StrictMode
import ReactDOM from 'react-dom/client'
import App from './App'
import { ThemeProvider } from './components/themeProvider'
import { ErrorBoundary } from './components/ErrorBoundary'

// Suppress ResizeObserver loop errors (common with Monaco editor and dynamic layouts)
// These are benign and don't affect functionality
const resizeObserverErr = window.onerror
window.onerror = (message, ...args) => {
  if (typeof message === 'string' && message.includes('ResizeObserver loop')) {
    return true // Suppress the error
  }
  return resizeObserverErr ? resizeObserverErr(message, ...args) : false
}

// Also handle unhandled promise rejections for ResizeObserver
window.addEventListener('error', (e) => {
  if (e.message?.includes('ResizeObserver loop')) {
    e.stopPropagation()
    e.preventDefault()
  }
})

console.log('Starting app initialization...')
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  // Temporarily disabled Strict Mode due to remounting issues with async operations
  // TODO: Re-enable after fixing async initialization race conditions
  // <React.StrictMode>
  <ThemeProvider defaultMode="system" storageKey="vite-ui-theme">
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </ThemeProvider>,
  // </React.StrictMode>
)
