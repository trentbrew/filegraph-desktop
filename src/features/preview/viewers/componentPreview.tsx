import * as React from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { transform } from 'sucrase'
import { Button } from '@/components/ui/button'

interface ComponentPreviewProps {
  filePath: string
  extension: string
}

interface TextFileContent {
  content: string
  truncated: boolean
  encoding: string
  size: number
}

export function ComponentPreview({ filePath, extension }: ComponentPreviewProps) {
  const [data, setData] = React.useState<TextFileContent | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Load component file content
  React.useEffect(() => {
    let cancelled = false

    const loadFile = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await invoke<TextFileContent>('read_text_file', {
          filePath,
          maxBytes: 4 * 1024 * 1024, // 4MB limit
        })

        if (!cancelled) {
          setData(result)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadFile()

    return () => {
      cancelled = true
    }
  }, [filePath])

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center text-muted-foreground max-w-sm">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive" />
          <p className="text-sm font-medium mb-1">Failed to load component</p>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return <ComponentRenderer code={data.content} extension={extension} filePath={filePath} />
}

interface ComponentRendererProps {
  code: string
  extension: string
  filePath: string
}

function ComponentRenderer({ code, extension, filePath }: ComponentRendererProps) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null)
  const [renderError, setRenderError] = React.useState<string | null>(null)
  const [isRendering, setIsRendering] = React.useState(true)

  const renderComponent = React.useCallback(() => {
    if (!iframeRef.current) return

    setIsRendering(true)
    setRenderError(null)

    try {
      // Transpile the code based on extension
      let transformedCode: string

      if (extension === 'tsx' || extension === 'jsx') {
        // Transpile TSX/JSX to JavaScript
        const result = transform(code, {
          transforms: ['typescript', 'jsx', 'imports'],
          production: false,
          jsxRuntime: 'automatic',
        })
        transformedCode = result.code
      } else if (extension === 'vue') {
        // Vue components need special handling - placeholder for now
        setRenderError('Vue component preview is not yet supported. Use code view to see the source.')
        setIsRendering(false)
        return
      } else if (extension === 'svelte') {
        // Svelte components need special handling - placeholder for now
        setRenderError('Svelte component preview is not yet supported. Use code view to see the source.')
        setIsRendering(false)
        return
      } else {
        transformedCode = code
      }

      // Create the iframe document with React loaded
      const iframeDoc = iframeRef.current.contentDocument
      if (!iframeDoc) {
        setRenderError('Failed to access iframe document')
        setIsRendering(false)
        return
      }

      // Base64 encode the transpiled code to safely pass it to iframe
      const encodedCode = btoa(unescape(encodeURIComponent(transformedCode)))

      // Build the HTML document with React, ReactDOM, and common dependencies
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script crossorigin src="https://unpkg.com/umd-react/dist/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/umd-react/dist/react-dom.development.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      padding: 2rem;
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    #root {
      width: 100%;
    }
    .error {
      color: #ef4444;
      background: #fee2e2;
      padding: 1rem;
      border-radius: 0.5rem;
      border: 1px solid #fecaca;
      font-family: monospace;
      font-size: 0.875rem;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    (function() {
      const React = window.React;
      const ReactDOM = window.ReactDOM;
      const { useState, useEffect, useCallback, useMemo, useRef } = React;

      try {
        // Decode the base64-encoded component code
        const encodedCode = '${encodedCode}';
        const componentCode = decodeURIComponent(escape(atob(encodedCode)));

        // Execute the component code in a function scope
        const moduleExports = {};
        const module = { exports: moduleExports };

        // Minimal require shim for supported modules
        function require(id) {
          if (id === 'react') {
            return React;
          }
          if (id === 'react/jsx-runtime' || id === 'react/jsx-dev-runtime') {
            return {
              jsx: React.createElement,
              jsxs: React.createElement,
              Fragment: React.Fragment,
            };
          }
          throw new Error('Module "' + id + '" is not supported in preview. Components with imports from other modules are not yet supported.');
        }

        // Create function with the component code
        const componentFactory = new Function(
          'React',
          'useState',
          'useEffect',
          'useCallback',
          'useMemo',
          'useRef',
          'module',
          'exports',
          'require',
          componentCode
        );

        // Execute the component code
        componentFactory(React, useState, useEffect, useCallback, useMemo, useRef, module, moduleExports, require);

        // Get the component (check both module.exports and exports.default)
        let Component = module.exports.default || module.exports || moduleExports.default || moduleExports;

        // If it's still an object, try to find the first function
        if (typeof Component === 'object' && Component !== null) {
          Component = Object.values(Component).find(val => typeof val === 'function');
        }

        if (!Component || typeof Component !== 'function') {
          throw new Error('Could not find component export. Make sure to export your component as default.');
        }

        // Render the component
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(Component));
      } catch (error) {
        console.error('Component render error:', error);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.innerHTML = '<strong>Render Error:</strong>\\n' +
          error.message + '\\n\\n' +
          (error.stack || '').substring(0, 500);
        document.getElementById('root').appendChild(errorDiv);
        window.parent.postMessage({ type: 'render-error', error: error.message }, '*');
      }
    })();
  </script>
</body>
</html>
`

      // Write to iframe
      iframeDoc.open()
      iframeDoc.write(html)
      iframeDoc.close()

      setIsRendering(false)
    } catch (error) {
      console.error('Transpilation error:', error)
      setRenderError(
        error instanceof Error ? `Transpilation failed: ${error.message}` : 'Failed to transpile component',
      )
      setIsRendering(false)
    }
  }, [code, extension, filePath])

  // Listen for errors from iframe
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'render-error') {
        setRenderError(event.data.error)
        setIsRendering(false)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Render component when mounted or code changes
  React.useEffect(() => {
    renderComponent()
  }, [renderComponent])

  if (renderError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-center max-w-lg space-y-4">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Preview Error</h3>
            <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg text-left font-mono">
              {renderError}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={renderComponent} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full relative bg-background">
      {isRendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="text-center space-y-2">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Rendering component...</p>
          </div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        title="Component Preview"
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  )
}
