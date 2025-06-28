# OpenConverse

A beautiful, modern cross-platform desktop chat application built with Electron, Next.js, TypeScript, and Chakra UI.

## Features

- 🎨 **Beautiful UI**: Modern, responsive design with Chakra UI v3
- 🚀 **Cross-Platform**: Runs on macOS, Windows, and Linux via Electron
- 💬 **Conversation Management**: Multiple conversation support with easy switching
- ✨ **Smooth Animations**: Framer Motion powered animations for delightful interactions
- 🎯 **TypeScript**: Full type safety throughout the application
- 🔥 **Hot Reload**: Fast development experience with Next.js and tsc-watch

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI Framework**: Chakra UI v3 with custom theme
- **Desktop App**: Electron 37
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Bundling**: Webpack, TypeScript Compiler

## Project Structure

```
├── src/                    # Next.js application code
│   ├── components/         # React components
│   ├── pages/             # Next.js pages
│   ├── styles/            # Global styles
│   └── components/ui/     # UI provider components
├── src-electron/          # Electron main process code
├── shared/                # Shared types and utilities
├── assets/                # Static assets (icons, images)
├── public/                # Public assets
└── dist-electron/         # Compiled Electron code
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd openconverse
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

This will start both the Next.js development server and Electron with hot reload enabled.

## Available Scripts

- `npm start` - Start the development environment (Next.js + Electron)
- `npm run dev:next` - Start only the Next.js development server
- `npm run build:next` - Build the Next.js application
- `npm run build:ts` - Compile TypeScript for Electron
- `npm run build:electron` - Bundle Electron application

## Features in Detail

### Conversation Management
- Create and switch between multiple conversations
- Each conversation maintains its own message history
- Beautiful conversation list with search functionality

### Message Experience
- Real-time message sending and receiving
- Animated message bubbles with hover effects
- User and AI avatars
- Typing indicators and smooth transitions

### UI/UX
- Modern gradient backgrounds that change per conversation
- Responsive design that works on different screen sizes
- Dark/light mode support via next-themes
- Smooth animations and micro-interactions

### Keyboard Shortcuts
- `⌘+Enter` (or `Ctrl+Enter`) to send messages
- Intuitive navigation and interactions

## Development

The application follows modern development practices:

- **TypeScript**: Strict type checking with separate configs for Next.js and Electron
- **Code Splitting**: Optimized bundle sizes with Webpack
- **Security**: Electron security best practices with context isolation
- **Performance**: Lazy loading and efficient re-renders

## Customization

### Themes
Modify the Chakra UI theme in `src/components/ui/provider.tsx` to customize colors, fonts, and spacing.

### Adding Features
- New components should be added to `src/components/`
- Shared types go in `shared/types.ts`
- Electron main process code goes in `src-electron/`

## Building for Production

1. Build the Next.js app:
   ```bash
   npm run build:next
   ```

2. Compile Electron TypeScript:
   ```bash
   npm run build:ts
   ```

3. Package the Electron app:
   ```bash
   npm run build:electron
   ```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Built with ❤️ using modern web technologies.
