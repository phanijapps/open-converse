# OpenConverse

A desktop chat application built with Electron, TypeScript, and Webpack. OpenConverse is designed to be a modern, extensible chat client similar to Claude Desktop, with support for multiple AI models and a plugin system.

## Features

- 🚀 Built with Electron and TypeScript for cross-platform compatibility
- 💬 Modern chat interface with session management
- 🎨 Dark theme with clean, intuitive design
- 🔧 Extensible architecture for future AI integrations
- 📱 Native desktop experience on macOS and Linux
- ⚡ Fast build system with Webpack

## Development Setup

### Prerequisites

- Node.js (v16 or later)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd open-chat-app
```

2. Install dependencies:
```bash
npm install
```

3. Build the application:
```bash
npm run build
```

4. Start the application:
```bash
npm start
```

### Development Scripts

- `npm run build` - Build both main and renderer processes
- `npm run build:main` - Build only the main process
- `npm run build:renderer` - Build only the renderer process
- `npm start` - Build and start the application
- `npm run dev` - Build and start in development mode
- `npm run clean` - Clean the dist directory

### Distribution

- `npm run pack` - Package the app (without creating installer)
- `npm run dist` - Create distributable packages for current platform
- `npm run dist:mac` - Create macOS distributable (DMG)
- `npm run dist:linux` - Create Linux distributables (AppImage, DEB)

## Project Structure

```
src/
├── main/           # Electron main process
│   ├── main.ts     # Main application entry point
│   └── preload.ts  # Preload script for secure IPC
├── renderer/       # Electron renderer process
│   ├── components/ # UI components
│   ├── styles/     # CSS styles
│   ├── index.html  # Main HTML template
│   └── index.ts    # Renderer entry point
└── shared/         # Shared types and utilities
    ├── types.ts    # TypeScript type definitions
    └── utils.ts    # Shared utility functions
```

## Architecture

OpenConverse follows a secure Electron architecture:

- **Main Process**: Handles system interactions, window management, and secure APIs
- **Renderer Process**: Manages the UI and user interactions
- **Preload Script**: Provides secure communication bridge between main and renderer
- **Shared**: Common types and utilities used across processes

## Cross-Platform Support

The application is configured to build for:

- **macOS**: DMG installer with support for both Intel (x64) and Apple Silicon (arm64)
- **Linux**: AppImage and DEB packages for x64 architecture

## Security

- Context isolation enabled
- Node.js integration disabled in renderer
- Secure IPC communication through preload scripts
- CSP (Content Security Policy) implemented

## Next Steps

This is the foundation for OpenConverse. The next development phases will include:

1. Secure IPC communication setup
2. React-based chat interface
3. Local session management with IndexedDB
4. OpenRouter API integration
5. Extension system implementation
6. Cross-platform features and packaging

## License

MIT License - see LICENSE file for details
