// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Disable GPU acceleration for better WSL performance
    std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
    
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}