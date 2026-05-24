//! Ephemeral Token Provisioning for Gemini Live API
//!
//! Provisions short-lived tokens from the Gemini API so the browser renderer
//! can connect directly to the Live API without exposing the long-lived API key.

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct EphemeralToken {
    pub name: String,
    pub expire_time: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct AuthTokenRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    uses: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    expire_time: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    new_session_expire_time: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct AuthTokenConfig {
    config: AuthTokenRequest,
}

#[derive(Debug, Deserialize)]
struct AuthTokenResponse {
    name: Option<String>,
    #[serde(rename = "expireTime")]
    expire_time: Option<String>,
}

/// Provision an ephemeral token from the Gemini API.
///
/// The token is short-lived (30 min default) and can only be used to start
/// Live API sessions. The long-lived API key stays server-side.
#[tauri::command]
pub async fn get_ephemeral_token(api_key: String) -> Result<EphemeralToken, String> {
    let client = reqwest::Client::new();

    // Token expires in 30 minutes
    let expire_time = chrono::Utc::now() + chrono::Duration::minutes(30);
    let expire_time_str = expire_time.to_rfc3339();

    // New sessions can be started within 2 minutes of token creation
    let new_session_expire = chrono::Utc::now() + chrono::Duration::minutes(2);
    let new_session_expire_str = new_session_expire.to_rfc3339();

    let url = format!(
        "https://generativelanguage.googleapis.com/v1alpha/authTokens?key={}",
        api_key
    );

    let body = serde_json::json!({
        "config": {
            "uses": 1,
            "expireTime": expire_time_str,
            "newSessionExpireTime": new_session_expire_str
        }
    });

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Failed to request ephemeral token: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!(
            "Ephemeral token request failed ({}): {}",
            status, body_text
        ));
    }

    let token_response: AuthTokenResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse ephemeral token response: {}", e))?;

    let name = token_response
        .name
        .ok_or("Ephemeral token response missing 'name' field")?;

    Ok(EphemeralToken {
        name,
        expire_time: token_response
            .expire_time
            .unwrap_or_else(|| expire_time_str),
    })
}
