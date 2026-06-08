#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      #[cfg(target_os = "windows")]
      remove_window_frame(app)?;
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

// ── Windows native FFI for removing the window frame ──

#[cfg(target_os = "windows")]
#[link(name = "dwmapi")]
extern "system" {
  fn DwmSetWindowAttribute(hwnd: isize, attr: u32, value: *const u32, size: u32) -> i32;
}

#[cfg(target_os = "windows")]
extern "system" {
  fn GetWindowLongW(hwnd: isize, index: i32) -> i32;
  fn SetWindowLongW(hwnd: isize, index: i32, value: i32) -> i32;
  fn SetWindowPos(hwnd: isize, after: isize, x: i32, y: i32, cx: i32, cy: i32, flags: u32) -> i32;
}

#[cfg(target_os = "windows")]
fn remove_window_frame(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
  use tauri::Manager;
  use raw_window_handle::HasWindowHandle;

  let window = app.get_webview_window("main").ok_or("main window not found")?;
  let win_handle = window.window_handle()?;
  let hwnd = match win_handle.as_ref() {
    raw_window_handle::RawWindowHandle::Win32(h) => h.hwnd.get() as isize,
    _ => return Err("expected Win32 window".into()),
  };

  const GWL_STYLE: i32 = -16;
  const WS_BORDER: i32 = 0x0080_0000;
  const WS_DLGFRAME: i32 = 0x0040_0000;
  const SWP_FRAMECHANGED: u32 = 0x0020;
  const SWP_NOMOVE: u32 = 0x0002;
  const SWP_NOSIZE: u32 = 0x0001;
  const SWP_NOZORDER: u32 = 0x0004;
  const DWMWA_NCRENDERING_POLICY: u32 = 2;
  const DWMNCRP_DISABLED: u32 = 1;

  unsafe {
    let style = GetWindowLongW(hwnd, GWL_STYLE);
    SetWindowLongW(hwnd, GWL_STYLE, style & !(WS_BORDER | WS_DLGFRAME));
    SetWindowPos(hwnd, 0, 0, 0, 0, 0, SWP_FRAMECHANGED | SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER);

    DwmSetWindowAttribute(hwnd, DWMWA_NCRENDERING_POLICY, &DWMNCRP_DISABLED, 4);
  }

  Ok(())
}
