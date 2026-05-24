use axum::{
    body::Body,
    extract::{Path, State},
    http::{HeaderMap, HeaderValue, Method, StatusCode},
    response::Response,
    routing::get,
    Router,
};
use base64::{engine::general_purpose, Engine as _};
use reqwest::Client;
use std::sync::{Arc, Mutex};
use tokio::net::TcpListener;
use tower_http::cors::CorsLayer;

// State to hold the port (assigned after binding)
#[derive(Clone)]
pub struct ProxyState {
    pub client: Client,
    pub port: Arc<Mutex<u16>>,
}

pub async fn start_proxy() -> Result<u16, String> {
    let client = Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .no_gzip()
        .no_brotli()
        .no_deflate()
        .build()
        .map_err(|e| e.to_string())?;

    let state = ProxyState {
        client,
        port: Arc::new(Mutex::new(0)),
    };

    let app = Router::new()
        // Wildcard path handler (expects 2 args)
        .route("/p/:target/*path", get(handle_proxy).post(handle_proxy))
        // Root handlers (expect 1 arg)
        .route(
            "/p/:target/",
            get(handle_proxy_root).post(handle_proxy_root),
        )
        .route("/p/:target", get(handle_proxy_root).post(handle_proxy_root))
        .layer(CorsLayer::permissive())
        .with_state(state.clone());

    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| e.to_string())?;

    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    *state.port.lock().unwrap() = port;

    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });

    Ok(port)
}

// Handler for /p/:target/ and /p/:target
async fn handle_proxy_root(
    State(state): State<ProxyState>,
    Path(target): Path<String>,
    method: Method,
    headers: HeaderMap,
    body: Body,
) -> Result<Response, StatusCode> {
    // Forward to handle_proxy with empty/root path
    handle_proxy(
        State(state),
        Path((target, "/".to_string())),
        method,
        headers,
        body,
    )
    .await
}

async fn handle_proxy(
    State(state): State<ProxyState>,
    Path((target_b64, path)): Path<(String, String)>,
    method: Method,
    headers: HeaderMap,
    body: Body,
) -> Result<Response, StatusCode> {
    println!("[Proxy] Request: {} /p/{}/{}", method, target_b64, path);

    let target_root_vec = match general_purpose::URL_SAFE.decode(&target_b64) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("[Proxy] Base64 decode error: {}", e);
            return Err(StatusCode::BAD_REQUEST);
        }
    };
    let target_root = match String::from_utf8(target_root_vec) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("[Proxy] UTF8 error: {}", e);
            return Err(StatusCode::BAD_REQUEST);
        }
    };

    let target_root = target_root.trim_end_matches('/');
    let clean_path = path.trim_start_matches('/');
    let url = format!("{}/{}", target_root, clean_path);

    println!("[Proxy] Forwarding to: {}", url);

    let mut req_builder = state.client.request(method, &url);

    for (key, value) in headers.iter() {
        let key_str = key.as_str();
        if key_str.eq_ignore_ascii_case("host") {
            continue;
        }
        // CRITICAL: Strip compression support so we get plain text to modify
        if key_str.eq_ignore_ascii_case("accept-encoding") {
            continue;
        }
        if key_str.eq_ignore_ascii_case("origin") {
            // Spoof Origin to match target
            if let Ok(val) = HeaderValue::from_str(target_root) {
                req_builder = req_builder.header(key, val);
            }
            continue;
        }
        if key_str.eq_ignore_ascii_case("referer") {
            // Spoof Referer to match target - ensure generic match or specific?
            // Use target root to be safe
            if let Ok(val) = HeaderValue::from_str(target_root) {
                req_builder = req_builder.header(key, val);
            }
            continue;
        }

        req_builder = req_builder.header(key, value);
    }

    req_builder = req_builder.body(reqwest::Body::wrap_stream(body.into_data_stream()));

    let response = match req_builder.send().await {
        Ok(resp) => resp,
        Err(e) => {
            eprintln!("[Proxy] Upstream request failed: {}", e);
            return Err(StatusCode::BAD_GATEWAY);
        }
    };

    let status = response.status();
    println!("[Proxy] Upstream status: {}", status);

    let mut resp_headers = response.headers().clone();

    resp_headers.remove("x-frame-options");
    resp_headers.remove("content-security-policy");
    resp_headers.remove("x-content-security-policy");
    resp_headers.remove("frame-options");
    // Remove content-encoding since we decoded it (or requested plain text)
    resp_headers.remove("content-encoding");
    // Remove content-security-policy-report-only just in case
    resp_headers.remove("content-security-policy-report-only");

    if let Some(location) = resp_headers.get("location") {
        if let Ok(loc_str) = location.to_str() {
            println!("[Proxy] Redirect Location: {}", loc_str);
            if loc_str.starts_with(target_root) {
                let relative = &loc_str[target_root.len()..].trim_start_matches('/');
                let my_port = *state.port.lock().unwrap();
                let new_loc = format!("http://127.0.0.1:{}/p/{}/{}", my_port, target_b64, relative);
                if let Ok(val) = HeaderValue::from_str(&new_loc) {
                    resp_headers.insert("location", val);
                }
            } else if loc_str.starts_with('/') {
                let my_port = *state.port.lock().unwrap();
                let new_loc = format!(
                    "http://127.0.0.1:{}/p/{}/{}",
                    my_port,
                    target_b64,
                    loc_str.trim_start_matches('/')
                );
                if let Ok(val) = HeaderValue::from_str(&new_loc) {
                    resp_headers.insert("location", val);
                }
            }
        }
    }

    let is_html = resp_headers
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .map(|v| v.to_lowercase().contains("text/html"))
        .unwrap_or(false);

    if is_html {
        println!("[Proxy] Modifying HTML content");
        let bytes = match response.bytes().await {
            Ok(b) => b,
            Err(e) => {
                eprintln!("[Proxy] Failed to read response bytes: {}", e);
                return Err(StatusCode::INTERNAL_SERVER_ERROR);
            }
        };

        // Lossy conversion is fine for HTML usually
        let html_string = String::from_utf8_lossy(&bytes);

        let my_port = *state.port.lock().unwrap();
        let base_href = format!("http://127.0.0.1:{}/p/{}/", my_port, target_b64);
        let base_tag = format!(r#"<base href="{}">"#, base_href);

        // Find <head> or <head ...> (case-insensitive) and inject base tag after it
        let new_html = if let Some(head_pos) = html_string.to_lowercase().find("<head") {
            // Find the closing > of the head tag
            if let Some(close_pos) = html_string[head_pos..].find('>') {
                let insert_pos = head_pos + close_pos + 1;
                format!(
                    "{}{}{}",
                    &html_string[..insert_pos],
                    base_tag,
                    &html_string[insert_pos..]
                )
            } else {
                // Malformed HTML, prepend base tag
                format!("{}{}", base_tag, html_string)
            }
        } else {
            // No head tag found, prepend base tag
            format!("{}{}", base_tag, html_string)
        };

        let mut final_resp = Response::new(Body::from(new_html));
        *final_resp.status_mut() = status;
        *final_resp.headers_mut() = resp_headers;
        final_resp.headers_mut().remove("content-length"); // Let axum calculate it

        Ok(final_resp)
    } else {
        // Stream
        let stream = Body::from_stream(response.bytes_stream());
        let mut final_resp = Response::new(stream);
        *final_resp.status_mut() = status;
        *final_resp.headers_mut() = resp_headers;
        Ok(final_resp)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use base64::Engine;

    #[tokio::test]
    async fn test_proxy_strips_headers_and_injects_base() {
        // Start the proxy
        let port = start_proxy().await.expect("Failed to start proxy");

        // We'll proxy to example.com which is stable
        let target = "https://example.com";
        let target_b64 = general_purpose::URL_SAFE.encode(target);

        let client = reqwest::Client::new();
        // Test root path with trailing slash
        let proxy_url = format!("http://127.0.0.1:{}/p/{}/", port, target_b64);

        println!("Testing proxy url: {}", proxy_url);

        let resp = client
            .get(&proxy_url)
            .send()
            .await
            .expect("Failed to send request");

        assert_eq!(resp.status(), StatusCode::OK);

        // Check headers
        assert!(resp.headers().get("x-frame-options").is_none());
        assert!(resp.headers().get("content-security-policy").is_none());

        // Check body for base tag injection
        let body = resp.text().await.expect("Failed to get text");
        let expected_base = format!(r#"<base href="{}">"#, proxy_url);
        assert!(
            body.contains(&expected_base),
            "Body missing base tag. Expected to find: {}",
            expected_base
        );
    }
}
