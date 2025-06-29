# OpenConverse

A beautiful, modern cross-platform desktop chat application built with Tauri, Next.js, TypeScript, and advanced memory management.

## Features

- 🎨 **Beautiful UI**: Modern, responsive design with Chakra UI v3
- 🚀 **Cross-Platform**: Runs on macOS, Windows, and Linux via Tauri
- 💬 **Conversation Management**: Multiple conversation support with session-based organization
- 🧠 **Advanced Memory**: Session-based memory architecture with vector search capabilities
- ✨ **Smooth Animations**: Framer Motion powered animations for delightful interactions
- 🎯 **TypeScript**: Full type safety throughout the application
- 🔥 **Fast & Secure**: Tauri provides smaller binaries and better security than Electron

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI Framework**: Chakra UI v3 with custom theme
- **Desktop App**: Tauri 2.1 (Rust backend)
- **Database**: SQLite with async operations
- **Memory Architecture**: Session → Conversation → Message design
- **Animations**: Framer Motion
- **Icons**: Lucide React

## Architecture Overview

### Component Organization

OpenConverse follows a **modular component architecture** with clear separation of concerns:

- **📨 Chat Components** (`src/components/chat/`) - All chat-related functionality
- **🧭 Navigation Components** (`src/components/navigation/`) - Sidebar and navigation
- **🎨 Layout Components** (`src/components/layout/`) - Page layouts and UI states  
- **🔧 Common Components** (`src/components/common/`) - Reusable utility components
- **⚙️ Settings Components** (`src/components/settings/`) - Modular settings management
- **🗃️ Database Components** (`src/components/database/`) - Database viewers and tools
- **🎯 UI Components** (`src/components/ui/`) - Core UI providers and theme
- **🚧 Development Components** (`src/components/development/`) - Testing and dev tools

**Benefits of this organization:**
- ✅ **Discoverability** - Easy to find components by purpose
- ✅ **Maintainability** - Related components grouped together
- ✅ **Scalability** - Clear structure for adding new features
- ✅ **Reusability** - Clean barrel exports for importing
- ✅ **Type Safety** - Consistent TypeScript patterns throughout

### Memory System

OpenConverse uses a sophisticated three-table memory architecture:

- **Session**: User sessions with roles and goals
- **Conversation**: Conversation sessions linked to sessions
- **Message**: Individual messages with optional embeddings for semantic search

This design provides:
- ✅ Better data organization with clear relationships
- ✅ Improved query performance with proper indexing
- ✅ Vector search ready for AI integration
- ✅ Clean API with focused operations

### Project Structure

```
├── src/                    # Next.js application code
│   ├── components/         # React components (modularly organized)
│   │   ├── chat/          # Chat functionality components
│   │   │   ├── ChatStream.tsx      # Main chat display
│   │   │   ├── MessageInput.tsx    # Message input with send
│   │   │   ├── TypingIndicator.tsx # AI typing animation
│   │   │   └── index.ts           # Barrel exports
│   │   ├── navigation/    # Navigation and sidebar components
│   │   │   ├── Sidebar.tsx        # Main sidebar with conversations
│   │   │   └── index.ts           # Barrel exports
│   │   ├── layout/        # Page layouts and UI states
│   │   │   ├── WelcomeScreen.tsx  # Initial onboarding
│   │   │   ├── ErrorState.tsx     # Error display
│   │   │   ├── LoadingState.tsx   # Loading indicators
│   │   │   └── index.ts           # Barrel exports
│   │   ├── common/        # Reusable utility components
│   │   │   ├── Icon.tsx           # SVG icon wrapper
│   │   │   ├── SilentToggle.tsx   # UI toggle component
│   │   │   └── index.ts           # Barrel exports
│   │   ├── settings/      # Settings management (modular)
│   │   │   ├── tabs/              # Settings tab components
│   │   │   ├── providers/         # LLM provider configs
│   │   │   ├── memory/            # Memory provider configs
│   │   │   ├── hooks/             # Settings state management
│   │   │   ├── SettingsPage.tsx   # Main settings component
│   │   │   └── index.ts           # Barrel exports
│   │   ├── database/      # Database management components
│   │   │   ├── DatabaseSidebar.tsx # Database navigation
│   │   │   ├── DatabaseTable.tsx   # Table viewer
│   │   │   └── index.ts           # Barrel exports
│   │   ├── ui/            # UI provider components & shared UI
│   │   │   ├── provider.tsx       # Chakra UI provider
│   │   │   ├── color-mode.tsx     # Theme provider
│   │   │   ├── SettingsDropdown.tsx # Settings menu
│   │   │   └── index.ts           # Barrel exports
│   │   ├── development/   # Development and testing components
│   │   │   ├── ProviderTestComponent.tsx # Provider testing
│   │   │   ├── TauriExample.tsx          # Tauri integration examples
│   │   │   └── index.ts                  # Barrel exports
│   │   └── index.ts       # Main component barrel export
│   ├── pages/             # Next.js pages and API routes
│   │   ├── api/           # API routes
│   │   └── settings/      # Settings pages
│   ├── styles/            # Global styles
│   └── utils/             # Utility functions and providers
├── src-tauri/             # Tauri Rust backend
│   ├── src/
│   │   ├── database/      # Memory management system
│   │   │   ├── models.rs  # Data models
│   │   │   ├── providers/ # Database providers
│   │   │   ├── commands.rs # Tauri commands
│   │   │   └── tests/     # Test suite
│   │   └── main.rs        # Tauri main process
│   ├── icons/             # Application icons
│   └── tauri.conf.json    # Tauri configuration
├── shared/                # Shared TypeScript types and utilities
├── assets/                # Static assets (icons, images)
└── public/                # Public assets
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Rust 1.70+ and Cargo
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd openconverse
   ```
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   # or
   npm run dev
   ```

This will start both the Next.js development server and Tauri with hot reload enabled.

## Available Scripts

- `npm start` / `npm run dev` - Start the development environment (Next.js + Tauri)
- `npm run dev:next` - Start only the Next.js development server
- `npm run build:next` - Build the Next.js application
- `npm run build` - Build the complete application (Next.js + Tauri)
- `npm run tauri` - Run Tauri CLI commands

## Features in Detail

### Session-Based Memory Architecture
- **Sessions**: Organize conversations by user roles and goals
- **Conversations**: Multiple conversation threads within each session
- **Messages**: Individual messages with semantic search capabilities
- **Advanced Database Management**: View and manage your data through the Advanced tab

### Conversation Management
- Create and switch between multiple conversations
- Session-based organization for better context management
- Beautiful conversation list with intuitive navigation
- Database viewer for advanced users

### Message Experience
- Real-time message sending and receiving
- Animated message bubbles with hover effects
- User and AI avatars
- Typing indicators and smooth transitions

### UI/UX
- **Settings Management**: Comprehensive settings with LLM provider configuration
- **Advanced Database View**: Explore sessions, conversations, and messages
- **Memory Management**: Clear specific data types or all conversation data
- Modern gradient backgrounds that adapt to your conversations
- Responsive design that works on different screen sizes
- Smooth animations and micro-interactions powered by Framer Motion

### Database Management
- **Preferences Tab**: Configure LLM providers and memory settings
- **Advanced Tab**: View and manage database tables directly
- **Memory Statistics**: Real-time database statistics and record counts
- **Data Operations**: Clear specific tables or all data with confirmation dialogs

### Keyboard Shortcuts
- `⌘+Enter` (or `Ctrl+Enter`) to send messages
- Intuitive navigation and interactions

## Development

The application follows modern development practices:

- **TypeScript**: Strict type checking with separate configs for Next.js and Tauri
- **Code Splitting**: Optimized bundle sizes with Webpack
- **Security**: Tauri security best practices with context isolation
- **Performance**: Lazy loading and efficient re-renders

## Customization

### Themes
Modify the Chakra UI theme in `src/components/ui/provider.tsx` to customize colors, fonts, and spacing.

### Adding Components
Follow the modular organization when adding new components:

- **Chat features** → `src/components/chat/`
- **Navigation elements** → `src/components/navigation/`
- **Page layouts** → `src/components/layout/`
- **Utility components** → `src/components/common/`
- **Settings panels** → `src/components/settings/`
- **Database tools** → `src/components/database/`

Always update the corresponding `index.ts` barrel exports when adding new components.

### Adding Features
- New components should follow the modular structure above
- Shared types go in `shared/types.ts`
- Utility functions go in `src/utils/`
- Tauri main process code goes in `src-tauri/`

## Building for Production

1. Build the Next.js app:
   ```bash
   npm run build:next
   ```

2. Build the complete Tauri application:
   ```bash
   npm run build
   ```

This will create platform-specific binaries in the `src-tauri/target/release/bundle/` directory.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## Technology Stack Summary

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Desktop Framework** | Tauri | 2.1+ | Cross-platform native app with Rust backend |
| **Frontend** | Next.js | 15+ | React-based web framework with SSG |
| **UI Library** | Chakra UI | v3 | Modern component library with theming |
| **Language** | TypeScript | 5+ | Type-safe development across frontend/backend |
| **Database** | SQLite | - | Embedded database with async operations |
| **Icons** | Lucide React | - | Beautiful, consistent icon library |
| **Animations** | Framer Motion | 12+ | Smooth, performant animations |
| **Backend Language** | Rust | 1.70+ | Fast, safe systems programming |

Built with ❤️ using modern web technologies for maximum performance and developer experience.
