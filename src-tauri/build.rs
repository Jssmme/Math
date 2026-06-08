fn main() {
  println!("cargo:rustc-link-lib=dwmapi");
  tauri_build::build()
}
