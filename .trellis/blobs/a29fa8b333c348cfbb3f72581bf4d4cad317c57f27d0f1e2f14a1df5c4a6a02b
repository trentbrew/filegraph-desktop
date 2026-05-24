use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter, State};

/// Terminal session writer (thread-safe)
pub struct TerminalWriter {
    writer: Mutex<Box<dyn Write + Send>>,
}

impl TerminalWriter {
    pub fn write(&self, data: &[u8]) -> Result<(), String> {
        let mut writer = self.writer.lock().unwrap();
        writer
            .write_all(data)
            .map_err(|e| format!("Failed to write: {}", e))?;
        writer
            .flush()
            .map_err(|e| format!("Failed to flush: {}", e))?;
        Ok(())
    }
}

/// State to hold all terminal sessions
pub struct TerminalState {
    pub writers: Mutex<HashMap<String, Arc<TerminalWriter>>>,
    pub next_id: Mutex<u32>,
    pub running: Mutex<HashMap<String, bool>>,
}

impl Default for TerminalState {
    fn default() -> Self {
        Self {
            writers: Mutex::new(HashMap::new()),
            next_id: Mutex::new(1),
            running: Mutex::new(HashMap::new()),
        }
    }
}

#[derive(Serialize, Deserialize, Clone)]
pub struct TerminalSpawnResult {
    pub id: String,
    pub success: bool,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct TerminalData {
    pub id: String,
    pub data: String,
}

/// Spawn a new terminal session
#[tauri::command]
pub fn terminal_spawn(
    app: AppHandle,
    state: State<'_, TerminalState>,
    cwd: Option<String>,
    shell: Option<String>,
    cols: Option<u16>,
    rows: Option<u16>,
) -> Result<TerminalSpawnResult, String> {
    let pty_system = native_pty_system();

    let size = PtySize {
        rows: rows.unwrap_or(24),
        cols: cols.unwrap_or(80),
        pixel_width: 0,
        pixel_height: 0,
    };

    let pty_pair = pty_system
        .openpty(size)
        .map_err(|e| format!("Failed to open PTY: {}", e))?;

    // Determine shell to use
    let shell_path = shell.unwrap_or_else(|| {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string())
    });

    let mut cmd = CommandBuilder::new(&shell_path);
    cmd.arg("-l"); // Login shell

    // Set working directory
    if let Some(dir) = cwd {
        cmd.cwd(dir);
    } else if let Some(home) = dirs::home_dir() {
        cmd.cwd(home);
    }

    // Set environment variables
    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");

    // Spawn the shell
    let _child = pty_pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn shell: {}", e))?;

    // Get writer
    let writer = pty_pair
        .master
        .take_writer()
        .map_err(|e| format!("Failed to get PTY writer: {}", e))?;

    // Get reader
    let mut reader = pty_pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to get PTY reader: {}", e))?;

    // Generate session ID
    let mut next_id = state.next_id.lock().unwrap();
    let id = format!("term_{}", *next_id);
    *next_id += 1;
    drop(next_id);

    // Store writer
    let terminal_writer = Arc::new(TerminalWriter {
        writer: Mutex::new(writer),
    });
    state.writers.lock().unwrap().insert(id.clone(), terminal_writer);
    state.running.lock().unwrap().insert(id.clone(), true);

    // Spawn reader thread to emit events
    let session_id = id.clone();
    let app_handle = app.clone();
    thread::spawn(move || {
        let mut buffer = [0u8; 4096];
        loop {
            match reader.read(&mut buffer) {
                Ok(0) => {
                    // EOF - terminal closed
                    let _ = app_handle.emit("terminal-closed", TerminalData {
                        id: session_id.clone(),
                        data: String::new(),
                    });
                    break;
                }
                Ok(n) => {
                    // Convert to string (lossy for non-UTF8)
                    let data = String::from_utf8_lossy(&buffer[..n]).to_string();
                    let _ = app_handle.emit("terminal-data", TerminalData {
                        id: session_id.clone(),
                        data,
                    });
                }
                Err(e) => {
                    eprintln!("Terminal read error: {}", e);
                    break;
                }
            }
        }
    });

    Ok(TerminalSpawnResult { id, success: true })
}

/// Write data to a terminal session
#[tauri::command]
pub fn terminal_write(
    state: State<'_, TerminalState>,
    id: String,
    data: String,
) -> Result<(), String> {
    let writers = state.writers.lock().unwrap();
    let writer = writers
        .get(&id)
        .ok_or_else(|| format!("Terminal session not found: {}", id))?;

    writer.write(data.as_bytes())
}

/// Resize a terminal session (no-op for now, would need master reference)
#[tauri::command]
pub fn terminal_resize(
    _state: State<'_, TerminalState>,
    _id: String,
    _cols: u16,
    _rows: u16,
) -> Result<(), String> {
    // TODO: Store master reference for resize support
    Ok(())
}

/// Close a terminal session
#[tauri::command]
pub fn terminal_close(state: State<'_, TerminalState>, id: String) -> Result<(), String> {
    state.running.lock().unwrap().insert(id.clone(), false);
    state.writers.lock().unwrap().remove(&id);
    Ok(())
}

/// List all active terminal sessions
#[tauri::command]
pub fn terminal_list(state: State<'_, TerminalState>) -> Vec<String> {
    state
        .writers
        .lock()
        .unwrap()
        .keys()
        .cloned()
        .collect()
}

// ─────────────────────────────────────────────────────────────────────────────
// Shell Exec — Non-PTY subprocess for agent command execution
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ShellExecResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub timed_out: bool,
    pub truncated: bool,
    pub duration_ms: u64,
}

/// Execute a shell command as a subprocess (not a PTY).
/// Captures stdout/stderr, enforces a timeout, and limits output size.
/// Used by the agent's `run_command` tool.
#[tauri::command]
pub async fn shell_exec(
    cmd: String,
    cwd: Option<String>,
    timeout_ms: Option<u64>,
    max_output: Option<usize>,
) -> Result<ShellExecResult, String> {
    use std::process::Stdio;
    use tokio::process::Command as TokioCommand;
    use tokio::time::{timeout, Duration};
    use tokio::io::AsyncReadExt;

    let timeout_duration = Duration::from_millis(timeout_ms.unwrap_or(30_000));
    let max_bytes = max_output.unwrap_or(100_000);

    // Determine shell
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string());

    // Build the command
    let mut command = TokioCommand::new(&shell);
    command
        .arg("-l")
        .arg("-c")
        .arg(&cmd)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .stdin(Stdio::null());

    // Set working directory
    if let Some(ref dir) = cwd {
        let path = std::path::Path::new(dir);
        if path.exists() && path.is_dir() {
            command.current_dir(dir);
        } else {
            return Err(format!("Working directory does not exist: {}", dir));
        }
    } else if let Some(home) = dirs::home_dir() {
        command.current_dir(home);
    }

    let start = std::time::Instant::now();

    // Spawn the process
    let mut child = command
        .spawn()
        .map_err(|e| format!("Failed to spawn command: {}", e))?;

    // Read stdout and stderr with timeout
    let result = timeout(timeout_duration, async {
        let mut stdout_buf = Vec::new();
        let mut stderr_buf = Vec::new();

        if let Some(mut stdout) = child.stdout.take() {
            let _ = stdout.read_to_end(&mut stdout_buf).await;
        }
        if let Some(mut stderr) = child.stderr.take() {
            let _ = stderr.read_to_end(&mut stderr_buf).await;
        }

        let status = child.wait().await
            .map_err(|e| format!("Failed to wait for command: {}", e))?;

        Ok::<_, String>((stdout_buf, stderr_buf, status))
    })
    .await;

    let duration_ms = start.elapsed().as_millis() as u64;

    match result {
        Ok(Ok((stdout_buf, stderr_buf, status))) => {
            let stdout_truncated = stdout_buf.len() > max_bytes;
            let stderr_truncated = stderr_buf.len() > max_bytes;

            let stdout = String::from_utf8_lossy(
                &stdout_buf[..stdout_buf.len().min(max_bytes)]
            ).to_string();
            let stderr = String::from_utf8_lossy(
                &stderr_buf[..stderr_buf.len().min(max_bytes)]
            ).to_string();

            Ok(ShellExecResult {
                stdout,
                stderr,
                exit_code: status.code().unwrap_or(-1),
                timed_out: false,
                truncated: stdout_truncated || stderr_truncated,
                duration_ms,
            })
        }
        Ok(Err(e)) => Err(e),
        Err(_) => {
            // Timeout — kill the process
            let _ = child.kill().await;
            Ok(ShellExecResult {
                stdout: String::new(),
                stderr: format!("Command timed out after {}ms", timeout_duration.as_millis()),
                exit_code: -1,
                timed_out: true,
                truncated: false,
                duration_ms,
            })
        }
    }
}
