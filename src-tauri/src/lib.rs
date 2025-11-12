use std::fs;
use std::path::Path;
use std::io::Read;
use std::sync::Mutex;
use std::time::Duration;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use encoding_rs::UTF_8;
use notify::{Watcher, RecursiveMode};
use notify_debouncer_full::{new_debouncer, Debouncer, FileIdMap};
use tauri::{AppHandle, Emitter};

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

#[derive(Debug, Serialize, Deserialize)]
pub struct TextFileContent {
    content: String,
    truncated: bool,
    encoding: String,
    size: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FilesystemChange {
    kind: String,
    paths: Vec<String>,
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
    debouncer.watcher().watch(watch_path, RecursiveMode::NonRecursive)
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
                            file_path.extension().map(|ext| ext.to_string_lossy().to_string())
                        };
                        
                        let modified = metadata.modified()
                            .unwrap_or(std::time::SystemTime::UNIX_EPOCH);
                        let date_modified = DateTime::<Utc>::from(modified);
                        
                        let item = FileItem {
                            id: index.to_string(),
                            name,
                            file_type: if is_dir { "folder".to_string() } else { "file".to_string() },
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
    match dirs::home_dir() {
        Some(path) => Ok(path.to_string_lossy().to_string()),
        None => Err("Unable to determine home directory".to_string()),
    }
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
    
    if !path.exists() {
        return Err("File does not exist".to_string());
    }
    
    if path.is_dir() {
        return Err("Cannot write to directory".to_string());
    }
    
    match fs::write(&path, content.as_bytes()) {
        Ok(_) => Ok("File saved successfully".to_string()),
        Err(e) => Err(format!("Failed to write file: {}", e)),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(WatcherState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            greet,
            get_current_directory,
            list_directory,
            navigate_to_path,
            get_home_directory,
            create_folder,
            create_file,
            delete_item,
            rename_item,
            copy_items,
            move_items,
            open_file_with_default_app,
            read_text_file,
            write_text_file,
            start_watch,
            stop_watch
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
