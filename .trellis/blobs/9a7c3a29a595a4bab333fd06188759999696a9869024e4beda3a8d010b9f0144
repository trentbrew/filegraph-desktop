use std::fs;
use std::path::{Path, PathBuf};
use std::io::Read;
use std::sync::Mutex;
use std::time::Duration;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use encoding_rs::UTF_8;
use notify::{Watcher, RecursiveMode};
use notify_debouncer_full::{new_debouncer, Debouncer, FileIdMap};
use tauri::{AppHandle, Emitter, Manager};
use base64::{Engine as _, engine::general_purpose};
use sysinfo::{System, Disks};

mod terminal;
mod preview;
mod proxy;
mod oauth;
mod ephemeral_token;

struct ProxyPort(u16);

#[tauri::command]
fn get_proxy_port(state: tauri::State<ProxyPort>) -> u16 {
    state.0
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileItem {
    id: String,
    name: String,
    file_type: String, // "file" or "folder"
    size: Option<u64>,
    date_modified: DateTime<Utc>,
    extension: Option<String>,
    path: String,
}

#[tauri::command]
async fn read_file_base64(
    file_path: String,
    max_bytes: Option<u64>,
) -> Result<BinaryFileContent, String> {
    let path = Path::new(&file_path);

    if !path.exists() {
        return Err("File does not exist".to_string());
    }

    if path.is_dir() {
        return Err("Cannot read directory as file".to_string());
    }

    let metadata = fs::metadata(&path)
        .map_err(|e| format!("Failed to read file metadata: {}", e))?;

    let file_size = metadata.len();
    let max_bytes = max_bytes.unwrap_or(8 * 1024 * 1024); // Default 8MB
    let bytes_to_read = std::cmp::min(file_size, max_bytes);

    let mut file = fs::File::open(&path)
        .map_err(|e| format!("Failed to open file: {}", e))?;

    let mut buffer: Vec<u8> = Vec::with_capacity(bytes_to_read as usize);
    let mut limited_reader = file.by_ref().take(bytes_to_read);
    limited_reader
        .read_to_end(&mut buffer)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let encoded = general_purpose::STANDARD.encode(&buffer);
    Ok(BinaryFileContent {
        data: encoded,
        truncated: file_size > bytes_to_read,
        size: file_size,
    })
}

#[tauri::command]
async fn write_file_base64(file_path: String, data: String) -> Result<String, String> {
    let path = Path::new(&file_path);

    if path.is_dir() {
        return Err("Cannot write to directory".to_string());
    }

    if let Some(parent) = path.parent() {
        if !parent.exists() {
            if let Err(e) = fs::create_dir_all(parent) {
                return Err(format!("Failed to create parent directory: {}", e));
            }
        }
    }

    let bytes = general_purpose::STANDARD
        .decode(data.as_bytes())
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    match fs::write(&path, bytes) {
        Ok(_) => Ok("File saved successfully".to_string()),
        Err(e) => Err(format!("Failed to write file: {}", e)),
    }
}


#[derive(Debug, Serialize, Deserialize)]
pub struct TextFileContent {
    content: String,
    truncated: bool,
    encoding: String,
    size: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BinaryFileContent {
    data: String,
    truncated: bool,
    size: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FilesystemChange {
    kind: String,
    paths: Vec<String>,
}

const DEFAULT_VAULT_DIRNAME: &str = ".filegraph";

/// Result of vault initialization
#[derive(Debug, Serialize, Deserialize)]
pub struct VaultInitResult {
    pub path: String,
    pub is_new: bool,
    pub structure_created: Vec<String>,
}

fn ensure_default_vault() -> Result<PathBuf, String> {
    let home_dir = dirs::home_dir().ok_or_else(|| "Unable to determine home directory".to_string())?;
    let vault_dir = home_dir.join(DEFAULT_VAULT_DIRNAME);

    if !vault_dir.exists() {
        fs::create_dir_all(&vault_dir)
            .map_err(|e| format!("Failed to create default vault directory: {}", e))?;
    }

    Ok(vault_dir)
}

/// Initialize vault with opinionated structure
fn initialize_vault_structure(vault_dir: &Path) -> Result<Vec<String>, String> {
    let mut created: Vec<String> = Vec::new();

    // Create .filegraph internal directory
    let internal_dir = vault_dir.join(".filegraph");
    create_dir_if_not_exists(&internal_dir, &mut created)?;

    // Create internal subdirectories
    for subdir in &["config", "graph", "cache", "stages", "runtime"] {
        let path = internal_dir.join(subdir);
        create_dir_if_not_exists(&path, &mut created)?;
    }

    // Note: All namespace directories (@entities, @notes, etc.) are created by demo file copy (RFC-002)
    // We don't create any namespace directories here - they come from the bundled demo-files

    // Create vault config file
    let config_path = internal_dir.join("config").join("vault.json");
    if !config_path.exists() {
        let config_content = serde_json::json!({
            "version": 1,
            "name": "My Vault",
            "created": chrono::Utc::now().to_rfc3339(),
            "settings": {
                "showDotfiles": false,
                "defaultView": "table"
            }
        });
        fs::write(&config_path, serde_json::to_string_pretty(&config_content).unwrap())
            .map_err(|e| format!("Failed to write vault config: {}", e))?;
        created.push(config_path.display().to_string());
    }

    // Note: WELCOME.md is now provided by demo-files bundle

    Ok(created)
}

fn create_dir_if_not_exists(path: &Path, created: &mut Vec<String>) -> Result<(), String> {
    if !path.exists() {
        fs::create_dir_all(path)
            .map_err(|e| format!("Failed to create directory {}: {}", path.display(), e))?;
        created.push(path.display().to_string());
    }
    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
struct OllamaGenerateRequest {
    model: String,
    prompt: String,
    images: Vec<String>,
    stream: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct OllamaGenerateResponse {
    response: String,
    model: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct CaptionImageResult {
    description: String,
    model: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct PdfTextResult {
    text: String,
    page_count: usize,
    truncated: bool,
}

// Filesystem watcher state
type DebouncerType = Debouncer<notify::RecommendedWatcher, FileIdMap>;
pub struct WatcherState(Mutex<Option<DebouncerType>>);

#[tauri::command]
async fn start_watch(
    path: String,
    app_handle: AppHandle,
    state: tauri::State<'_, WatcherState>,
) -> Result<(), String> {
    let mut watcher_lock = state.0.lock().map_err(|e| format!("Failed to lock watcher: {}", e))?;

    // Stop existing watcher if any
    *watcher_lock = None;

    // Create new debounced watcher
    let app_handle_clone = app_handle.clone();
    let mut debouncer = new_debouncer(
        Duration::from_millis(500),
        None,
        move |result: Result<Vec<notify_debouncer_full::DebouncedEvent>, Vec<notify::Error>>| {
            match result {
                Ok(events) => {
                    for event in events {
                        // Convert event to serializable format
                        let fs_change = FilesystemChange {
                            kind: format!("{:?}", event.event.kind),
                            paths: event.paths.iter().map(|p| p.display().to_string()).collect(),
                        };
                        let _ = app_handle_clone.emit("fs-change", fs_change);
                    }
                }
                Err(errors) => {
                    for error in errors {
                        eprintln!("Filesystem watch error: {:?}", error);
                    }
                }
            }
        },
    ).map_err(|e| format!("Failed to create watcher: {}", e))?;

    // Watch the directory
    let watch_path = Path::new(&path);
    debouncer.watcher().watch(watch_path, RecursiveMode::Recursive)
        .map_err(|e| format!("Failed to watch directory: {}", e))?;

    *watcher_lock = Some(debouncer);

    Ok(())
}

#[tauri::command]
async fn stop_watch(state: tauri::State<'_, WatcherState>) -> Result<(), String> {
    let mut watcher_lock = state.0.lock().map_err(|e| format!("Failed to lock watcher: {}", e))?;
    *watcher_lock = None;
    Ok(())
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn get_current_directory() -> Result<String, String> {
    match std::env::current_dir() {
        Ok(path) => Ok(path.to_string_lossy().to_string()),
        Err(e) => Err(format!("Failed to get current directory: {}", e)),
    }
}

fn get_effective_extension(file_name: &str) -> Option<String> {
    if file_name.is_empty() {
        return None;
    }

    let parts: Vec<&str> = file_name.split('.').collect();
    if parts.len() == 1 {
        return None;
    }

    let last = parts[parts.len() - 1].to_lowercase();

    if last == "trellis" && parts.len() >= 3 {
        return Some(parts[parts.len() - 2].to_lowercase());
    }

    Some(last)
}

#[tauri::command]
async fn list_directory(path: String) -> Result<Vec<FileItem>, String> {
    let path = Path::new(&path);

    if !path.exists() {
        return Err("Directory does not exist".to_string());
    }

    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    let mut items = Vec::new();

    match fs::read_dir(path) {
        Ok(entries) => {
            for (index, entry) in entries.enumerate() {
                match entry {
                    Ok(entry) => {
                        let file_path = entry.path();
                        let metadata = match entry.metadata() {
                            Ok(meta) => meta,
                            Err(_) => continue,
                        };

                        let name = entry.file_name().to_string_lossy().to_string();
                        let is_dir = metadata.is_dir();
                        let size = if is_dir { None } else { Some(metadata.len()) };

                        let extension = if is_dir {
                            None
                        } else {
                            get_effective_extension(&name)
                        };

                        let modified = metadata.modified()
                            .unwrap_or(std::time::SystemTime::UNIX_EPOCH);
                        let date_modified = DateTime::<Utc>::from(modified);

                        let item = FileItem {
                            id: index.to_string(),
                            name: name.clone(),
                            file_type: if is_dir {
                                "folder".to_string()
                            } else if name.ends_with(".web") {
                                "web".to_string()
                            } else {
                                "file".to_string()
                            },
                            size,
                            date_modified,
                            extension,
                            path: file_path.to_string_lossy().to_string(),
                        };

                        items.push(item);
                    }
                    Err(_) => continue,
                }
            }
        }
        Err(e) => return Err(format!("Failed to read directory: {}", e)),
    }

    // Sort items: folders first, then files, both alphabetically
    items.sort_by(|a, b| {
        match (a.file_type.as_str(), b.file_type.as_str()) {
            ("folder", "file") => std::cmp::Ordering::Less,
            ("file", "folder") => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(items)
}

#[tauri::command]
async fn navigate_to_path(path: String) -> Result<Vec<FileItem>, String> {
    let path = Path::new(&path);
    if !path.exists() {
        return Err("Path does not exist".to_string());
    }
    if path.is_file() {
        // If it's a file, navigate to its parent directory
        if let Some(parent) = path.parent() {
            return list_directory(parent.to_string_lossy().to_string()).await;
        } else {
            return Err("Cannot navigate to file without parent directory".to_string());
        }
    }
    list_directory(path.to_string_lossy().to_string()).await
}

#[tauri::command]
async fn get_home_directory() -> Result<String, String> {
    ensure_default_vault().map(|path| path.to_string_lossy().to_string())
}

#[tauri::command]
async fn get_user_home_directory() -> Result<String, String> {
    dirs::home_dir()
        .ok_or_else(|| "Unable to determine home directory".to_string())
        .map(|path| path.to_string_lossy().to_string())
}

/// Check if this is a first-run (vault doesn't exist or isn't initialized)
/// We check for the vault config file, not just the directory, since the directory
/// might be created on startup but not yet initialized with the opinionated structure
#[tauri::command]
async fn check_vault_exists() -> Result<bool, String> {
    let home_dir = dirs::home_dir().ok_or_else(|| "Unable to determine home directory".to_string())?;
    let vault_dir = home_dir.join(DEFAULT_VAULT_DIRNAME);

    // Check for the vault config file as proof of initialization
    let config_path = vault_dir.join(".filegraph").join("config").join("vault.json");
    Ok(config_path.exists())
}

/// Initialize the vault with opinionated structure
#[tauri::command]
async fn initialize_vault(custom_path: Option<String>) -> Result<VaultInitResult, String> {
    let vault_dir = if let Some(path) = custom_path {
        PathBuf::from(path)
    } else {
        let home_dir = dirs::home_dir().ok_or_else(|| "Unable to determine home directory".to_string())?;
        home_dir.join(DEFAULT_VAULT_DIRNAME)
    };

    let is_new = !vault_dir.exists();

    // Create vault directory if it doesn't exist
    if is_new {
        fs::create_dir_all(&vault_dir)
            .map_err(|e| format!("Failed to create vault directory: {}", e))?;
    }

    // Initialize the opinionated structure
    let structure_created = initialize_vault_structure(&vault_dir)?;

    Ok(VaultInitResult {
        path: vault_dir.to_string_lossy().to_string(),
        is_new,
        structure_created,
    })
}

/// Get the actual project root directory (where package.json is located)
#[tauri::command]
async fn get_project_root() -> Result<String, String> {
    let mut current_dir = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?;

    // Walk up the directory tree to find package.json (project root)
    loop {
        let package_json_path = current_dir.join("package.json");
        if package_json_path.exists() {
            return Ok(current_dir.to_string_lossy().to_string());
        }

        // Go up one directory
        if !current_dir.pop() {
            return Err("Could not find project root (package.json)".to_string());
        }
    }
}

/// Get the default vault path without creating it
#[tauri::command]
async fn get_default_vault_path() -> Result<String, String> {
    let home_dir = dirs::home_dir().ok_or_else(|| "Unable to determine home directory".to_string())?;
    let vault_dir = home_dir.join(DEFAULT_VAULT_DIRNAME);
    Ok(vault_dir.to_string_lossy().to_string())
}

/// Copy demo files from bundled resources to the vault
/// This copies the entire demo-files directory structure to ~/.filegraph
#[tauri::command]
async fn copy_demo_files(app_handle: tauri::AppHandle) -> Result<String, String> {
    use tauri::Manager;

    let home_dir = dirs::home_dir()
        .ok_or_else(|| "Unable to determine home directory".to_string())?;
    let vault_dir = home_dir.join(DEFAULT_VAULT_DIRNAME);

    // Get the resource path for demo-files
    let resource_path = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("Failed to get resource dir: {}", e))?
        .join("demo-files");

    if !resource_path.exists() {
        return Err(format!("Demo files not found at {:?}", resource_path));
    }

    // Recursively copy all files from demo-files to vault
    fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<u32, String> {
        let mut count = 0;

        if !dst.exists() {
            fs::create_dir_all(dst)
                .map_err(|e| format!("Failed to create directory {:?}: {}", dst, e))?;
        }

        for entry in fs::read_dir(src)
            .map_err(|e| format!("Failed to read directory {:?}: {}", src, e))?
        {
            let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
            let src_path = entry.path();
            let file_name = entry.file_name();
            let dst_path = dst.join(&file_name);

            if src_path.is_dir() {
                count += copy_dir_recursive(&src_path, &dst_path)?;
            } else {
                // Only copy if destination doesn't exist (don't overwrite user files)
                if !dst_path.exists() {
                    fs::copy(&src_path, &dst_path)
                        .map_err(|e| format!("Failed to copy {:?}: {}", src_path, e))?;
                    count += 1;
                }
            }
        }

        Ok(count)
    }

    let copied = copy_dir_recursive(&resource_path, &vault_dir)?;
    Ok(format!("Copied {} demo files to vault", copied))
}

#[tauri::command]
async fn create_folder(path: String, name: String) -> Result<String, String> {
    let folder_path = Path::new(&path).join(&name);

    if folder_path.exists() {
        return Err("Folder already exists".to_string());
    }

    match fs::create_dir(&folder_path) {
        Ok(_) => Ok(format!("Folder '{}' created successfully", name)),
        Err(e) => Err(format!("Failed to create folder: {}", e)),
    }
}

#[tauri::command]
async fn create_directory(path: String) -> Result<String, String> {
    let dir_path = Path::new(&path);

    if dir_path.exists() {
        if dir_path.is_dir() {
            return Ok("Directory already exists".to_string());
        }
        return Err("Path exists and is not a directory".to_string());
    }

    match fs::create_dir_all(&dir_path) {
        Ok(_) => Ok("Directory created successfully".to_string()),
        Err(e) => Err(format!("Failed to create directory: {}", e)),
    }
}

#[tauri::command]
async fn delete_item(path: String) -> Result<String, String> {
    let item_path = Path::new(&path);

    if !item_path.exists() {
        return Err("Item does not exist".to_string());
    }

    let result = if item_path.is_dir() {
        fs::remove_dir_all(&item_path)
    } else {
        fs::remove_file(&item_path)
    };

    match result {
        Ok(_) => Ok("Item deleted successfully".to_string()),
        Err(e) => Err(format!("Failed to delete item: {}", e)),
    }
}

#[tauri::command]
async fn trash_items(paths: Vec<String>) -> Result<String, String> {
    // Get the .filegraph/.trash directory path
    let home_dir = dirs::home_dir().ok_or("Could not determine home directory")?;
    let trash_dir = home_dir.join(".filegraph").join(".trash");

    // Create trash directory if it doesn't exist
    if !trash_dir.exists() {
        fs::create_dir_all(&trash_dir)
            .map_err(|e| format!("Failed to create trash directory: {}", e))?;
    }

    let mut trashed_count = 0;
    let mut errors: Vec<String> = Vec::new();

    for source_path in paths {
        let source = Path::new(&source_path);

        if !source.exists() {
            errors.push(format!("Item does not exist: {}", source_path));
            continue;
        }

        let file_name = match source.file_name() {
            Some(name) => name.to_string_lossy().to_string(),
            None => {
                errors.push(format!("Invalid path: {}", source_path));
                continue;
            }
        };

        // Generate unique name if file already exists in trash
        let mut destination = trash_dir.join(&file_name);
        if destination.exists() {
            // Append timestamp to make it unique
            let timestamp = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_millis())
                .unwrap_or(0);

            // Split filename and extension
            let (name, ext) = if let Some(ext) = Path::new(&file_name).extension() {
                let stem = Path::new(&file_name).file_stem().unwrap_or_default().to_string_lossy();
                (stem.to_string(), format!(".{}", ext.to_string_lossy()))
            } else {
                (file_name.clone(), String::new())
            };

            destination = trash_dir.join(format!("{}_{}{}", name, timestamp, ext));
        }

        // Move to trash
        match fs::rename(&source, &destination) {
            Ok(_) => trashed_count += 1,
            Err(e) => {
                // If rename fails (e.g., cross-device move), try copy + delete
                let copy_result = if source.is_dir() {
                    copy_dir_recursive(&source, &destination)
                        .and_then(|_| fs::remove_dir_all(&source))
                } else {
                    fs::copy(&source, &destination)
                        .and_then(|_| fs::remove_file(&source))
                };

                match copy_result {
                    Ok(_) => trashed_count += 1,
                    Err(copy_err) => {
                        errors.push(format!("Failed to trash {}: {} (copy fallback: {})",
                            file_name, e, copy_err));
                    }
                }
            }
        }
    }

    if errors.is_empty() {
        Ok(format!("{} item(s) moved to trash", trashed_count))
    } else if trashed_count > 0 {
        Ok(format!("{} item(s) moved to trash. Errors: {}", trashed_count, errors.join("; ")))
    } else {
        Err(errors.join("; "))
    }
}

#[tauri::command]
async fn rename_item(old_path: String, new_name: String) -> Result<String, String> {
    let old_path = Path::new(&old_path);

    if !old_path.exists() {
        return Err("Item does not exist".to_string());
    }

    let parent = match old_path.parent() {
        Some(parent) => parent,
        None => return Err("Cannot rename root directory".to_string()),
    };

    let new_path = parent.join(&new_name);

    if new_path.exists() {
        return Err("An item with that name already exists".to_string());
    }

    match fs::rename(&old_path, &new_path) {
        Ok(_) => Ok(format!("Item renamed to '{}' successfully", new_name)),
        Err(e) => Err(format!("Failed to rename item: {}", e)),
    }
}

#[tauri::command]
async fn create_file(path: String, name: String) -> Result<String, String> {
    let base_path = Path::new(&path);

    if !base_path.exists() || !base_path.is_dir() {
        return Err("Directory does not exist".to_string());
    }

    let file_path = base_path.join(&name);

    if file_path.exists() {
        return Err("A file with that name already exists".to_string());
    }

    match fs::File::create(&file_path) {
        Ok(_) => Ok(format!("File '{}' created successfully", name)),
        Err(e) => Err(format!("Failed to create file: {}", e)),
    }
}

#[tauri::command]
async fn copy_items(source_paths: Vec<String>, destination_path: String) -> Result<String, String> {
    let dest_path = Path::new(&destination_path);

    if !dest_path.exists() || !dest_path.is_dir() {
        return Err("Destination directory does not exist".to_string());
    }

    let mut copied_count = 0;

    for source_path in source_paths {
        let source = Path::new(&source_path);

        if !source.exists() {
            continue; // Skip non-existent files
        }

        let file_name = match source.file_name() {
            Some(name) => name,
            None => continue,
        };

        let destination = dest_path.join(file_name);

        // Skip if destination already exists
        if destination.exists() {
            continue;
        }

        let result = if source.is_dir() {
            copy_dir_recursive(&source, &destination)
        } else {
            fs::copy(&source, &destination).map(|_| ())
        };

        match result {
            Ok(_) => copied_count += 1,
            Err(_) => continue, // Skip failed copies
        }
    }

    Ok(format!("{} item(s) copied successfully", copied_count))
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), std::io::Error> {
    fs::create_dir_all(dst)?;

    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)?;
        }
    }

    Ok(())
}

#[tauri::command]
async fn move_items(source_paths: Vec<String>, destination_path: String) -> Result<String, String> {
    let dest_path = Path::new(&destination_path);

    if !dest_path.exists() || !dest_path.is_dir() {
        return Err("Destination directory does not exist".to_string());
    }

    let mut moved_count = 0;

    for source_path in source_paths {
        let source = Path::new(&source_path);

        if !source.exists() {
            continue; // Skip non-existent files
        }

        let file_name = match source.file_name() {
            Some(name) => name,
            None => continue,
        };

        let destination = dest_path.join(file_name);

        // Skip if destination already exists
        if destination.exists() {
            continue;
        }

        match fs::rename(&source, &destination) {
            Ok(_) => moved_count += 1,
            Err(_) => continue, // Skip failed moves
        }
    }

    Ok(format!("{} item(s) moved successfully", moved_count))
}

#[tauri::command]
async fn open_file_with_default_app(file_path: String) -> Result<String, String> {
    let path = Path::new(&file_path);

    if !path.exists() {
        return Err("File does not exist".to_string());
    }

    if path.is_dir() {
        return Err("Cannot open directory with default app. Use navigate instead.".to_string());
    }

    // Use the system's default application to open the file
    match open::that(&file_path) {
        Ok(_) => Ok(format!("Opened '{}' with default application", path.file_name().unwrap_or_default().to_string_lossy())),
        Err(e) => Err(format!("Failed to open file: {}", e)),
    }
}

#[tauri::command]
async fn read_text_file(
    file_path: String,
    max_bytes: Option<u64>,
) -> Result<TextFileContent, String> {
    let path = Path::new(&file_path);

    if !path.exists() {
        return Err("File does not exist".to_string());
    }

    if path.is_dir() {
        return Err("Cannot read directory as text file".to_string());
    }

    // Get file metadata
    let metadata = match fs::metadata(&path) {
        Ok(meta) => meta,
        Err(e) => return Err(format!("Failed to read file metadata: {}", e)),
    };

    let file_size = metadata.len();
    let max_bytes = max_bytes.unwrap_or(4 * 1024 * 1024); // Default 4MB

    // Open file and read bytes
    let mut file = match fs::File::open(&path) {
        Ok(f) => f,
        Err(e) => return Err(format!("Failed to open file: {}", e)),
    };

    let bytes_to_read = std::cmp::min(file_size, max_bytes);
    let mut buffer = vec![0u8; bytes_to_read as usize];

    match file.read_exact(&mut buffer) {
        Ok(_) => {},
        Err(_) => {
            // If we can't read exact bytes, try reading what's available
            buffer.clear();
            let mut limited_file = file.take(max_bytes);
            match limited_file.read_to_end(&mut buffer) {
                Ok(_) => {},
                Err(e) => return Err(format!("Failed to read file: {}", e)),
            }
        }
    };

    // Detect encoding and decode
    let (decoded_content, encoding_used, _had_errors) = UTF_8.decode(&buffer);

    let truncated = file_size > max_bytes;

    Ok(TextFileContent {
        content: decoded_content.to_string(),
        truncated,
        encoding: encoding_used.name().to_string(),
        size: file_size,
    })
}

#[tauri::command]
async fn write_text_file(
    file_path: String,
    content: String,
) -> Result<String, String> {
    let path = Path::new(&file_path);

    if path.is_dir() {
        return Err("Cannot write to directory".to_string());
    }

    if let Some(parent) = path.parent() {
        if !parent.exists() {
            if let Err(e) = fs::create_dir_all(parent) {
                return Err(format!("Failed to create parent directory: {}", e));
            }
        }
    }

    match fs::write(&path, content.as_bytes()) {
        Ok(_) => Ok("File saved successfully".to_string()),
        Err(e) => Err(format!("Failed to write file: {}", e)),
    }
}

#[tauri::command]
async fn read_pdf_as_base64(file_path: String) -> Result<String, String> {
    let path = Path::new(&file_path);

    if !path.exists() {
        return Err("PDF file does not exist".to_string());
    }

    if path.is_dir() {
        return Err("Path is a directory, not a PDF file".to_string());
    }

    // Read the PDF file as bytes
    let bytes = match fs::read(&path) {
        Ok(data) => data,
        Err(e) => return Err(format!("Failed to read PDF: {}", e)),
    };

    // Encode to base64
    let base64_data = general_purpose::STANDARD.encode(&bytes);
    Ok(base64_data)
}

#[tauri::command]
async fn extract_pdf_text(
    file_path: String,
    max_pages: Option<usize>,
) -> Result<PdfTextResult, String> {
    let path = Path::new(&file_path);

    if !path.exists() {
        return Err("PDF file does not exist".to_string());
    }

    if path.is_dir() {
        return Err("Path is a directory, not a PDF file".to_string());
    }

    // Extract text from PDF
    let text = match pdf_extract::extract_text(&path) {
        Ok(content) => content,
        Err(e) => return Err(format!("Failed to extract PDF text: {}", e)),
    };

    // Get page count (rough estimate from text length)
    let page_count = (text.len() / 2000).max(1); // ~2000 chars per page estimate
    let max_pages = max_pages.unwrap_or(10);

    // Truncate if too long (keep first N pages worth)
    let max_chars = max_pages * 2000;
    let truncated = text.len() > max_chars;
    let final_text = if truncated {
        text.chars().take(max_chars).collect::<String>()
    } else {
        text
    };

    Ok(PdfTextResult {
        text: final_text,
        page_count,
        truncated,
    })
}

#[tauri::command]
async fn caption_image(
    file_path: String,
    host: String,
    model: String,
) -> Result<CaptionImageResult, String> {
    let path = Path::new(&file_path);

    if !path.exists() {
        return Err("Image file does not exist".to_string());
    }

    if path.is_dir() {
        return Err("Path is a directory, not an image file".to_string());
    }

    // Read the image file
    let image_bytes = match fs::read(&path) {
        Ok(bytes) => bytes,
        Err(e) => return Err(format!("Failed to read image file: {}", e)),
    };

    // Encode image to base64
    let base64_image = general_purpose::STANDARD.encode(&image_bytes);

    // Prepare Ollama API request
    let client = reqwest::Client::new();
    let api_url = format!("{}/api/generate", host);

    let request_body = OllamaGenerateRequest {
        model: model.clone(),
        prompt: "Describe this image in detail.".to_string(),
        images: vec![base64_image],
        stream: false,
    };

    // Call Ollama API
    let response = match client.post(&api_url)
        .json(&request_body)
        .send()
        .await
    {
        Ok(resp) => resp,
        Err(e) => return Err(format!("Failed to connect to Ollama: {}", e)),
    };

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("Ollama API error ({}): {}", status, error_text));
    }

    // Parse response
    let ollama_response: OllamaGenerateResponse = match response.json().await {
        Ok(resp) => resp,
        Err(e) => return Err(format!("Failed to parse Ollama response: {}", e)),
    };

    Ok(CaptionImageResult {
        description: ollama_response.response,
        model: ollama_response.model,
    })
}

#[tauri::command]
async fn read_web_file(path: String) -> Result<String, String> {
    let path = Path::new(&path);

    if !path.exists() {
        return Err("File does not exist".to_string());
    }

    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    // Simple format: first line is URL
    // We'll trim whitespace
    let url = content.trim().lines().next().unwrap_or("").trim().to_string();

    if url.is_empty() {
        return Err("Web file is empty".to_string());
    }

    Ok(url)
}

#[tauri::command]
async fn read_app_state(filename: String) -> Result<String, String> {
    // Get app data directory
    let app_data_dir = match dirs::data_dir() {
        Some(dir) => dir.join("com.filegraph.app"),
        None => return Err("Unable to determine app data directory".to_string()),
    };

    // Create directory if it doesn't exist
    if !app_data_dir.exists() {
        if let Err(e) = fs::create_dir_all(&app_data_dir) {
            return Err(format!("Failed to create app data directory: {}", e));
        }
    }

    let state_path = app_data_dir.join(filename);

    // Return empty string if file doesn't exist
    if !state_path.exists() {
        return Ok(String::new());
    }

    match fs::read_to_string(&state_path) {
        Ok(content) => Ok(content),
        Err(e) => Err(format!("Failed to read app state: {}", e)),
    }
}

#[tauri::command]
async fn write_app_state(filename: String, content: String) -> Result<String, String> {
    // Get app data directory
    let app_data_dir = match dirs::data_dir() {
        Some(dir) => dir.join("com.filegraph.app"),
        None => return Err("Unable to determine app data directory".to_string()),
    };

    // Create directory if it doesn't exist
    if !app_data_dir.exists() {
        if let Err(e) = fs::create_dir_all(&app_data_dir) {
            return Err(format!("Failed to create app data directory: {}", e));
        }
    }

    let state_path = app_data_dir.join(filename);

    match fs::write(&state_path, content) {
        Ok(_) => Ok("App state saved successfully".to_string()),
        Err(e) => Err(format!("Failed to write app state: {}", e)),
    }
}

#[derive(Debug, Serialize)]
pub struct DiskInfo {
    name: String,
    mount_point: String,
    total_bytes: u64,
    available_bytes: u64,
    used_bytes: u64,
    usage_percent: f64,
}

#[derive(Debug, Serialize)]
pub struct BatteryInfo {
    percentage: f64,
    is_charging: bool,
    time_to_empty_mins: Option<u64>,
    time_to_full_mins: Option<u64>,
}

#[derive(Debug, Serialize)]
pub struct SystemInfo {
    // OS
    os_name: String,
    os_version: String,
    kernel_version: String,
    hostname: String,

    // CPU
    cpu_brand: String,
    cpu_cores: usize,
    cpu_usage_percent: f32,

    // Memory
    total_memory_bytes: u64,
    used_memory_bytes: u64,
    available_memory_bytes: u64,
    memory_usage_percent: f64,

    // Swap
    total_swap_bytes: u64,
    used_swap_bytes: u64,

    // Disks
    disks: Vec<DiskInfo>,

    // Battery
    battery: Option<BatteryInfo>,

    // Uptime
    uptime_secs: u64,
}

#[tauri::command]
fn get_system_info() -> Result<SystemInfo, String> {
    let mut sys = System::new_all();
    sys.refresh_all();

    // CPU info
    let cpu_brand = sys.cpus().first()
        .map(|cpu| cpu.brand().to_string())
        .unwrap_or_else(|| "Unknown".to_string());
    let cpu_cores = sys.cpus().len();
    let cpu_usage = sys.global_cpu_usage();

    // Memory
    let total_memory = sys.total_memory();
    let used_memory = sys.used_memory();
    let available_memory = sys.available_memory();
    let memory_usage = if total_memory > 0 {
        (used_memory as f64 / total_memory as f64) * 100.0
    } else {
        0.0
    };

    // Disks
    let disks_info = Disks::new_with_refreshed_list();
    let disks: Vec<DiskInfo> = disks_info.iter().map(|disk| {
        let total = disk.total_space();
        let available = disk.available_space();
        let used = total.saturating_sub(available);
        let usage = if total > 0 {
            (used as f64 / total as f64) * 100.0
        } else {
            0.0
        };
        DiskInfo {
            name: disk.name().to_string_lossy().to_string(),
            mount_point: disk.mount_point().to_string_lossy().to_string(),
            total_bytes: total,
            available_bytes: available,
            used_bytes: used,
            usage_percent: usage,
        }
    }).collect();

    // Battery
    let battery_info = get_battery_info();

    Ok(SystemInfo {
        os_name: System::name().unwrap_or_else(|| "Unknown".to_string()),
        os_version: System::os_version().unwrap_or_else(|| "Unknown".to_string()),
        kernel_version: System::kernel_version().unwrap_or_else(|| "Unknown".to_string()),
        hostname: System::host_name().unwrap_or_else(|| "Unknown".to_string()),
        cpu_brand,
        cpu_cores,
        cpu_usage_percent: cpu_usage,
        total_memory_bytes: total_memory,
        used_memory_bytes: used_memory,
        available_memory_bytes: available_memory,
        memory_usage_percent: memory_usage,
        total_swap_bytes: sys.total_swap(),
        used_swap_bytes: sys.used_swap(),
        disks,
        battery: battery_info,
        uptime_secs: System::uptime(),
    })
}

fn get_battery_info() -> Option<BatteryInfo> {
    let manager = battery::Manager::new().ok()?;
    let mut batteries = manager.batteries().ok()?;
    let battery = batteries.next()?.ok()?;

    let percentage = battery.state_of_charge().value * 100.0;
    let is_charging = matches!(battery.state(), battery::State::Charging | battery::State::Full);

    let time_to_empty = battery.time_to_empty()
        .map(|t| (t.value / 60.0) as u64);
    let time_to_full = battery.time_to_full()
        .map(|t| (t.value / 60.0) as u64);

    Some(BatteryInfo {
        percentage: percentage as f64,
        is_charging,
        time_to_empty_mins: time_to_empty,
        time_to_full_mins: time_to_full,
    })
}

// Vault Agent Commands

#[derive(Debug, Serialize, Deserialize)]
pub struct VaultAgentResponse {
    output: String,
    success: bool,
    error: Option<String>,
}

#[tauri::command]
async fn vault_agent_query(query: String, vault_path: Option<String>) -> Result<VaultAgentResponse, String> {
    use std::process::Command;

    let vault = vault_path.unwrap_or_else(|| {
        dirs::home_dir()
            .map(|p| p.join(".filegraph").to_string_lossy().to_string())
            .unwrap_or_else(|| "~/.filegraph".to_string())
    });

    // In dev mode, scripts are in project root; in production, they'd be bundled
    let script_path = if cfg!(debug_assertions) {
        // Development: find project root from cargo manifest
        std::env::var("CARGO_MANIFEST_DIR")
            .map(|dir| std::path::PathBuf::from(dir).join("../scripts/vault-agent-interactive.sh"))
            .unwrap_or_else(|_| std::path::PathBuf::from("scripts/vault-agent-interactive.sh"))
    } else {
        // Production: relative to executable
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.to_path_buf()))
            .map(|p| p.join("../scripts/vault-agent-interactive.sh"))
            .unwrap_or_else(|| std::path::PathBuf::from("scripts/vault-agent-interactive.sh"))
    };

    if !script_path.exists() {
        return Err(format!("Vault agent script not found at: {}", script_path.display()));
    }

    let output = Command::new("bash")
        .arg(script_path)
        .arg(&query)
        .env("FILEGRAPH_VAULT", vault)
        .output()
        .map_err(|e| format!("Failed to execute vault agent: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    Ok(VaultAgentResponse {
        output: stdout,
        success: output.status.success(),
        error: if stderr.is_empty() { None } else { Some(stderr) },
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VaultChangeRequest {
    file_path: String,
    json_patch: String,
}

#[tauri::command]
async fn vault_agent_execute_change(
    file_path: String,
    json_patch: String,
    vault_path: Option<String>,
) -> Result<VaultAgentResponse, String> {
    use std::process::Command;

    let vault = vault_path.unwrap_or_else(|| {
        dirs::home_dir()
            .map(|p| p.join(".filegraph").to_string_lossy().to_string())
            .unwrap_or_else(|| "~/.filegraph".to_string())
    });

    // In dev mode, scripts are in project root; in production, they'd be bundled
    let script_path = if cfg!(debug_assertions) {
        // Development: find project root from cargo manifest
        std::env::var("CARGO_MANIFEST_DIR")
            .map(|dir| std::path::PathBuf::from(dir).join("../scripts/execute-vault-change.sh"))
            .unwrap_or_else(|_| std::path::PathBuf::from("scripts/execute-vault-change.sh"))
    } else {
        // Production: relative to executable
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.to_path_buf()))
            .map(|p| p.join("../scripts/execute-vault-change.sh"))
            .unwrap_or_else(|| std::path::PathBuf::from("scripts/execute-vault-change.sh"))
    };

    if !script_path.exists() {
        return Err(format!("Change execution script not found at: {}", script_path.display()));
    }

    let output = Command::new("bash")
        .arg(script_path)
        .arg(&file_path)
        .arg(&json_patch)
        .env("FILEGRAPH_VAULT", vault)
        .output()
        .map_err(|e| format!("Failed to execute change: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    Ok(VaultAgentResponse {
        output: stdout,
        success: output.status.success(),
        error: if stderr.is_empty() { None } else { Some(stderr) },
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(WatcherState(Mutex::new(None)))
        .manage(terminal::TerminalState::default())
        .manage(preview::PreviewState::default())
        .manage(oauth::OAuthState::default())
        .setup(|app| {
            if let Err(err) = ensure_default_vault() {
                eprintln!("[filegraph] Failed to initialize default vault: {}", err);
            }

            // Start local proxy
            let port = tauri::async_runtime::block_on(proxy::start_proxy())
                .expect("Failed to start proxy");
            println!("Proxy started on port {}", port);
            app.manage(ProxyPort(port));

            if let Some(win) = app.get_webview_window("main") {
                println!("Window found, attempting to show...");
                win.show().expect("Failed to show window");
                win.set_focus().expect("Failed to focus window");
                println!("Window should now be visible");
            } else {
                eprintln!("ERROR: Main window not found!");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            get_current_directory,
            list_directory,
            navigate_to_path,
            get_home_directory,
            get_user_home_directory,
            get_project_root,
            create_folder,
            create_directory,
            create_file,
            delete_item,
            trash_items,
            rename_item,
            copy_items,
            move_items,
            open_file_with_default_app,
            read_text_file,
            write_text_file,
            start_watch,
            stop_watch,
            caption_image,
            read_file_base64,
            write_file_base64,
            read_pdf_as_base64,
            extract_pdf_text,
            read_web_file,
            read_app_state,
            write_app_state,
            check_vault_exists,
            initialize_vault,
            get_default_vault_path,
            copy_demo_files,
            terminal::terminal_spawn,
            terminal::terminal_write,
            terminal::terminal_resize,
            terminal::terminal_close,
            terminal::terminal_list,
            terminal::shell_exec,
            preview::preview_open,
            preview::preview_close,
            preview::preview_list,
            preview::preview_focus,
            preview::preview_toggle_devtools,
            preview::preview_get_session,
            get_proxy_port,
            get_system_info,
            oauth::start_oauth_server_cmd,
            oauth::stop_oauth_server_cmd,
            oauth::get_oauth_callback_result,
            oauth::open_url,
            vault_agent_query,
            vault_agent_execute_change,
            ephemeral_token::get_ephemeral_token
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
