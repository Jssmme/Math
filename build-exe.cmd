@echo off
chcp 65001 >nul
title Notepad Calc - Build EXE

echo ====================================
echo  Notepad Calc - Tauri Build
echo ====================================
echo.

taskkill /f /im app.exe >nul 2>nul

:: Ensure cargo bin is in PATH (Rust installed via rustup)
set PATH=%USERPROFILE%\.cargo\bin;%PATH%

:: Check Rust
rustc --version >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERROR] Rust not found. Install from: https://rustup.rs
  pause & exit /b 1
)

:: Step 1: install deps
echo [1/3] Installing frontend dependencies...
call npm install
if %errorlevel% neq 0 ( echo [ERROR] npm install failed & pause & exit /b 1 )

:: Step 2: build (vite + cargo)
echo [2/3] Building... (first Rust build takes 2-5 min)
call npm run pack
if %errorlevel% neq 0 ( echo [ERROR] Build failed & pause & exit /b 1 )

:: Step 3: done
echo.
echo ====================================
echo  Done! Installer at:
echo    src-tauri\target\release\bundle\nsis\
echo ====================================
echo  Size: ~5-8 MB
echo ====================================
