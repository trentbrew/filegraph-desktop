use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

/// Tracks active preview windows
pub struct PreviewState {
    pub windows: Mutex<HashMap<String, PreviewWindowInfo>>,
}

impl Default for PreviewState {
    fn default() -> Self {
        Self {
            windows: Mutex::new(HashMap::new()),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreviewWindowInfo {
    pub id: String,
    pub url: String,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreviewLogEntry {
    pub level: String,      // "log", "warn", "error", "info", "debug"
    pub message: String,
    pub args: Vec<String>,  // Serialized arguments
    pub timestamp: i64,
    pub stack: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreviewNetworkEntry {
    pub method: String,
    pub url: String,
    pub status: Option<u16>,
    pub duration: Option<u64>,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreviewSessionData {
    pub local_storage: HashMap<String, String>,
    pub session_storage: HashMap<String, String>,
}

/// JavaScript to inject into preview windows for capturing console/errors
const CAPTURE_SCRIPT: &str = r#"
(function() {
    // Prevent double-injection
    if (window.__filegraph_injected) return;
    window.__filegraph_injected = true;

    // Store for captured data
    window.__filegraph = {
        logs: [],
        errors: [],
        network: []
    };

    // Helper to safely stringify values
    function safeStringify(val) {
        try {
            if (val === undefined) return 'undefined';
            if (val === null) return 'null';
            if (typeof val === 'function') return val.toString();
            if (val instanceof Error) return val.stack || val.message;
            if (typeof val === 'object') return JSON.stringify(val, null, 2);
            return String(val);
        } catch (e) {
            return '[Unstringifiable]';
        }
    }

    // Capture console methods
    ['log', 'warn', 'error', 'info', 'debug'].forEach(function(level) {
        const original = console[level];
        console[level] = function(...args) {
            const entry = {
                level: level,
                message: args.map(safeStringify).join(' '),
                args: args.map(safeStringify),
                timestamp: Date.now(),
                stack: level === 'error' ? new Error().stack : null
            };

            window.__filegraph.logs.push(entry);

            // Send to Tauri
            if (window.__TAURI__) {
                window.__TAURI__.event.emit('preview-log', entry);
            }

            // Call original
            return original.apply(console, args);
        };
    });

    // Capture uncaught errors
    window.addEventListener('error', function(event) {
        const entry = {
            level: 'error',
            message: event.message,
            args: [event.message],
            timestamp: Date.now(),
            stack: event.error ? event.error.stack : null,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
        };

        window.__filegraph.errors.push(entry);

        if (window.__TAURI__) {
            window.__TAURI__.event.emit('preview-error', entry);
        }
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', function(event) {
        const entry = {
            level: 'error',
            message: 'Unhandled Promise Rejection: ' + safeStringify(event.reason),
            args: [safeStringify(event.reason)],
            timestamp: Date.now(),
            stack: event.reason && event.reason.stack ? event.reason.stack : null
        };

        window.__filegraph.errors.push(entry);

        if (window.__TAURI__) {
            window.__TAURI__.event.emit('preview-error', entry);
        }
    });

    // Intercept fetch for network logging
    const originalFetch = window.fetch;
    window.fetch = async function(input, init) {
        const url = typeof input === 'string' ? input : input.url;
        const method = init?.method || 'GET';
        const startTime = Date.now();

        try {
            const response = await originalFetch.apply(this, arguments);
            const entry = {
                method: method,
                url: url,
                status: response.status,
                duration: Date.now() - startTime,
                timestamp: startTime
            };

            window.__filegraph.network.push(entry);

            if (window.__TAURI__) {
                window.__TAURI__.event.emit('preview-network', entry);
            }

            return response;
        } catch (error) {
            const entry = {
                method: method,
                url: url,
                status: null,
                duration: Date.now() - startTime,
                timestamp: startTime,
                error: error.message
            };

            window.__filegraph.network.push(entry);

            if (window.__TAURI__) {
                window.__TAURI__.event.emit('preview-network', entry);
            }

            throw error;
        }
    };

    // Function to get localStorage (called from Rust)
    window.__filegraph_getStorage = function() {
        const local = {};
        const session = {};

        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                local[key] = localStorage.getItem(key);
            }
        } catch (e) {}

        try {
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                session[key] = sessionStorage.getItem(key);
            }
        } catch (e) {}

        return { localStorage: local, sessionStorage: session };
    };

    // Notify that injection is complete
    console.log('[Filegraph] Preview capture initialized');

    if (window.__TAURI__) {
        window.__TAURI__.event.emit('preview-ready', { timestamp: Date.now() });
    }
})();
"#;

/// Open a new preview window for a URL
#[tauri::command]
pub async fn preview_open(
    app: AppHandle,
    url: String,
    title: Option<String>,
) -> Result<PreviewWindowInfo, String> {
    let preview_id = format!("preview_{}", chrono::Utc::now().timestamp_millis());
    let window_title = title.unwrap_or_else(|| format!("Preview: {}", url));

    // Parse URL - ensure it's valid
    let webview_url = if url.starts_with("http://") || url.starts_with("https://") {
        WebviewUrl::External(url.parse().map_err(|e| format!("Invalid URL: {}", e))?)
    } else {
        WebviewUrl::External(
            format!("http://{}", url)
                .parse()
                .map_err(|e| format!("Invalid URL: {}", e))?,
        )
    };

    // Create the preview window
    let window = WebviewWindowBuilder::new(&app, &preview_id, webview_url)
        .title(&window_title)
        .inner_size(1280.0, 800.0)
        .min_inner_size(400.0, 300.0)
        .initialization_script(CAPTURE_SCRIPT)
        .devtools(true)
        .build()
        .map_err(|e| format!("Failed to create preview window: {}", e))?;

    // Track the window
    let info = PreviewWindowInfo {
        id: preview_id.clone(),
        url: url.clone(),
        title: window_title,
    };

    if let Some(state) = app.try_state::<PreviewState>() {
        let mut windows = state.windows.lock().unwrap();
        windows.insert(preview_id.clone(), info.clone());
    }

    // Listen for window close to clean up
    let app_handle = app.clone();
    let id_for_cleanup = preview_id.clone();
    window.on_window_event(move |event| {
        if let tauri::WindowEvent::CloseRequested { .. } = event {
            if let Some(state) = app_handle.try_state::<PreviewState>() {
                let mut windows = state.windows.lock().unwrap();
                windows.remove(&id_for_cleanup);
            }
            // Emit close event to frontend
            let _ = app_handle.emit("preview-closed", &id_for_cleanup);
        }
    });

    // Emit open event
    app.emit("preview-opened", &info)
        .map_err(|e| format!("Failed to emit event: {}", e))?;

    Ok(info)
}

/// Close a preview window
#[tauri::command]
pub async fn preview_close(app: AppHandle, preview_id: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&preview_id) {
        window
            .close()
            .map_err(|e| format!("Failed to close window: {}", e))?;
    }

    if let Some(state) = app.try_state::<PreviewState>() {
        let mut windows = state.windows.lock().unwrap();
        windows.remove(&preview_id);
    }

    Ok(())
}

/// Get session data (localStorage, sessionStorage) from a preview window
#[tauri::command]
pub async fn preview_get_session(
    app: AppHandle,
    preview_id: String,
) -> Result<PreviewSessionData, String> {
    let window = app
        .get_webview_window(&preview_id)
        .ok_or_else(|| "Preview window not found".to_string())?;

    // Note: eval doesn't return a value directly in Tauri 2.x
    // We'd need to use events or a different approach
    // Trigger the storage capture - data will come via events
    let _ = window.eval("JSON.stringify(window.__filegraph_getStorage())");

    // For now, return empty - we'll capture via events instead
    Ok(PreviewSessionData {
        local_storage: HashMap::new(),
        session_storage: HashMap::new(),
    })
}

/// List all active preview windows
#[tauri::command]
pub async fn preview_list(app: AppHandle) -> Result<Vec<PreviewWindowInfo>, String> {
    if let Some(state) = app.try_state::<PreviewState>() {
        let windows = state.windows.lock().unwrap();
        Ok(windows.values().cloned().collect())
    } else {
        Ok(vec![])
    }
}

/// Focus a preview window
#[tauri::command]
pub async fn preview_focus(app: AppHandle, preview_id: String) -> Result<(), String> {
    let window = app
        .get_webview_window(&preview_id)
        .ok_or_else(|| "Preview window not found".to_string())?;

    window
        .set_focus()
        .map_err(|e| format!("Failed to focus window: {}", e))?;

    Ok(())
}

/// Toggle DevTools for a preview window
#[tauri::command]
pub async fn preview_toggle_devtools(app: AppHandle, preview_id: String) -> Result<(), String> {
    #[cfg(debug_assertions)]
    {
        let window = app
            .get_webview_window(&preview_id)
            .ok_or_else(|| "Preview window not found".to_string())?;

        if window.is_devtools_open() {
            window.close_devtools();
        } else {
            window.open_devtools();
        }
    }

    #[cfg(not(debug_assertions))]
    {
        let _ = (app, preview_id);
        return Err("DevTools not available in release builds".to_string());
    }

    #[cfg(debug_assertions)]
    Ok(())
}
