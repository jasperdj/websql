// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use log::{error, info};
use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;

fn init_logging() {
    // Initialize env_logger for console logging (when available)
    env_logger::init();
    
    // Setup panic hook to log panics to file
    std::panic::set_hook(Box::new(|panic_info| {
        let msg = format!("PANIC: {}", panic_info);
        error!("{}", msg);
        
        // Also write to file for release builds
        if let Err(e) = write_to_log_file(&msg) {
            eprintln!("Failed to write panic to log file: {}", e);
        }
    }));
}

fn get_log_file_path() -> PathBuf {
    // Log to user's home directory on Windows
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| ".".to_string());
    
    PathBuf::from(home).join("websql-debug.log")
}

fn write_to_log_file(message: &str) -> std::io::Result<()> {
    let log_path = get_log_file_path();
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)?;
    
    let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
    writeln!(file, "[{}] {}", timestamp, message)?;
    file.flush()?;
    Ok(())
}

fn main() {
    // Initialize logging first
    init_logging();
    
    // Log startup
    info!("WebSQL starting up...");
    let log_path = get_log_file_path();
    info!("Log file: {}", log_path.display());
    
    // Write startup to log file for release builds
    let startup_msg = format!("WebSQL starting up - Log file: {}", log_path.display());
    if let Err(e) = write_to_log_file(&startup_msg) {
        error!("Failed to write to log file: {}", e);
    }
    
    // Disable GPU acceleration for better WSL performance
    std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
    
    // Build and run Tauri application
    let result = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            info!("Tauri app setup complete");
            write_to_log_file("Tauri app setup complete").ok();
            Ok(())
        })
        .run(tauri::generate_context!());
    
    match result {
        Ok(_) => {
            info!("WebSQL exited normally");
            write_to_log_file("WebSQL exited normally").ok();
        }
        Err(e) => {
            error!("Error running tauri application: {}", e);
            let error_msg = format!("Error running tauri application: {}", e);
            write_to_log_file(&error_msg).ok();
            
            // Re-panic to ensure proper exit code
            panic!("Failed to run tauri application: {}", e);
        }
    }
}