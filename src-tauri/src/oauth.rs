use std::sync::{Arc, Mutex};
use axum::{
    extract::{Query, State},
    response::Html,
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tokio::sync::oneshot;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OAuthCallbackResult {
    pub success: bool,
    pub code: Option<String>,
    pub state: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct OAuthCallbackParams {
    code: Option<String>,
    state: Option<String>,
    error: Option<String>,
    error_description: Option<String>,
}

pub struct OAuthServerState {
    app_handle: AppHandle,
    result: Arc<Mutex<Option<OAuthCallbackResult>>>,
}

impl Default for OAuthServerState {
    fn default() -> Self {
        panic!("OAuthServerState must be initialized with app_handle")
    }
}

pub struct OAuthState(pub Mutex<Option<OAuthServerHandle>>);

impl Default for OAuthState {
    fn default() -> Self {
        Self(Mutex::new(None))
    }
}

pub struct OAuthServerHandle {
    pub shutdown_tx: oneshot::Sender<()>,
    pub result: Arc<Mutex<Option<OAuthCallbackResult>>>,
}

async fn oauth_callback(
    Query(params): Query<OAuthCallbackParams>,
    State(state): State<Arc<OAuthServerState>>,
) -> Html<String> {
    let result = if let Some(error) = params.error {
        OAuthCallbackResult {
            success: false,
            code: None,
            state: params.state.clone(),
            error: Some(params.error_description.unwrap_or(error)),
        }
    } else if let Some(code) = params.code {
        OAuthCallbackResult {
            success: true,
            code: Some(code),
            state: params.state.clone(),
            error: None,
        }
    } else {
        OAuthCallbackResult {
            success: false,
            code: None,
            state: params.state.clone(),
            error: Some("No authorization code received".to_string()),
        }
    };

    // Store result
    if let Ok(mut r) = state.result.lock() {
        *r = Some(result.clone());
    }

    // Emit event to frontend
    let _ = state.app_handle.emit("oauth-callback", result.clone());

    // Return success page
    let html = if result.success {
        r#"
        <!DOCTYPE html>
        <html>
        <head>
            <title>Authorization Successful</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                       display: flex; justify-content: center; align-items: center; height: 100vh;
                       margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
                .card { background: white; padding: 40px; border-radius: 16px; text-align: center;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.2); }
                h1 { color: #22c55e; margin-bottom: 16px; }
                p { color: #666; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>✓ Authorization Successful</h1>
                <p>You can close this window and return to Filegraph.</p>
            </div>
        </body>
        </html>
        "#.to_string()
    } else {
        format!(r#"
        <!DOCTYPE html>
        <html>
        <head>
            <title>Authorization Failed</title>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                       display: flex; justify-content: center; align-items: center; height: 100vh;
                       margin: 0; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }}
                .card {{ background: white; padding: 40px; border-radius: 16px; text-align: center;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.2); }}
                h1 {{ color: #ef4444; margin-bottom: 16px; }}
                p {{ color: #666; }}
            </style>
        </head>
        <body>
            <div class="card">
                <h1>✗ Authorization Failed</h1>
                <p>{}</p>
            </div>
        </body>
        </html>
        "#, result.error.unwrap_or_else(|| "Unknown error".to_string()))
    };

    Html(html)
}

pub async fn start_oauth_server(app_handle: AppHandle, port: u16) -> Result<OAuthServerHandle, String> {
    let result = Arc::new(Mutex::new(None));
    let result_clone = result.clone();

    let state = Arc::new(OAuthServerState {
        app_handle,
        result: result_clone,
    });

    let app = Router::new()
        .route("/oauth/callback", get(oauth_callback))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(format!("127.0.0.1:{}", port))
        .await
        .map_err(|e| format!("Failed to bind OAuth server: {}", e))?;

    let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();

    tokio::spawn(async move {
        axum::serve(listener, app)
            .with_graceful_shutdown(async {
                let _ = shutdown_rx.await;
            })
            .await
            .ok();
    });

    Ok(OAuthServerHandle {
        shutdown_tx,
        result,
    })
}

#[tauri::command]
pub fn start_oauth_server_cmd(
    port: u16,
    app_handle: AppHandle,
    state: tauri::State<'_, OAuthState>,
) -> Result<(), String> {
    // Stop existing server if any
    let mut oauth_state = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    if let Some(handle) = oauth_state.take() {
        let _ = handle.shutdown_tx.send(());
    }

    // Start server in async runtime
    let handle = tauri::async_runtime::block_on(start_oauth_server(app_handle, port))?;
    *oauth_state = Some(handle);

    Ok(())
}

#[tauri::command]
pub fn stop_oauth_server_cmd(
    state: tauri::State<'_, OAuthState>,
) -> Result<(), String> {
    let mut oauth_state = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;

    if let Some(handle) = oauth_state.take() {
        let _ = handle.shutdown_tx.send(());
    }

    Ok(())
}

#[tauri::command]
pub fn get_oauth_callback_result(
    state: tauri::State<'_, OAuthState>,
) -> Result<Option<OAuthCallbackResult>, String> {
    let oauth_state = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;

    if let Some(handle) = oauth_state.as_ref() {
        let result = handle.result.lock().map_err(|e| format!("Lock error: {}", e))?;
        Ok(result.clone())
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn open_url(url: String) -> Result<(), String> {
    open::that(&url).map_err(|e| format!("Failed to open URL: {}", e))
}
