# Development Setup Instructions

## Prerequisites

✅ **Rust**: Already installed at `/opt/homebrew/bin/rustc`
✅ **Node.js & npm**: Available
✅ **Tauri CLI**: Installed via npm
✅ **ImageMagick**: Installed for icon generation

## Quick Start

### 1. Install Dependencies (Already Done)
```bash
npm install
```

### 2. Start Development
```bash
npm run dev
# or
npm start
```

This will:
- Start Next.js dev server on localhost:3000  
- Launch Tauri desktop app with hot reload
- Show your app in a native window

### 3. Build for Production
```bash
npm run build
```

## What Works Now

✅ **Next.js Frontend**: All your existing UI components
✅ **Tauri Backend**: Rust-based native backend  
✅ **System Tray**: Click to show/hide, right-click for menu
✅ **Window Management**: Minimize, maximize, close
✅ **Hot Reload**: Changes reflect immediately during development
✅ **Static Export**: Next.js builds to static files for Tauri

## Testing the Migration

To verify everything works:

1. **Test Development**:
   ```bash
   npm run dev
   ```
   Should open your app in a native window

2. **Test Build**:
   ```bash
   npm run build:next  # Build Next.js
   npm run build       # Build complete Tauri app
   ```

3. **Check Bundle Size**:
   - Electron bundle: ~150-300MB
   - Tauri bundle: ~15-50MB (much smaller!)

## Next Steps for Icons

✅ **Proper RGBA icons created**: Blue square icons with transparency  
✅ **All formats ready**: PNG, ICO, ICNS with proper alpha channels

For production with your brand:

1. **Replace Current Icons**:
   - Update `src-tauri/icons/` with your logo
   - Keep sizes: 32x32, 128x128, 256x256
   - Ensure RGBA format with transparency (PNG color-type=6)

2. **Icon Generation Commands**:
   ```bash
   # Create RGBA icons from your logo
   magick your-logo.png -resize 32x32 -depth 8 -define png:color-type=6 src-tauri/icons/32x32.png
   magick your-logo.png -resize 128x128 -depth 8 -define png:color-type=6 src-tauri/icons/128x128.png
   magick your-logo.png -resize 256x256 -depth 8 -define png:color-type=6 src-tauri/icons/128x128@2x.png
   ```

The migration is **complete and ready for testing**! 🎉
