Always use the latest stable versions of Electron and Next.js.

Structure the project with clear separation:

src for Next.js code

src-electron for Electron main process code

shared for code used in both contexts

assets for static files (icons, images).

Use TypeScript for all code. Place Electron-specific TypeScript configs in tsconfig-electron.json and Next.js configs in tsconfig.json.

Use contextIsolation: true and enable security best practices for all Electron BrowserWindow instances.

Use Webpack for bundling and enable code splitting and lazy loading to optimize renderer performance.

Minimize third-party dependencies; prefer lightweight or native solutions when possible.

Ensure all Next.js pages and API routes that access Electron APIs are marked as dynamic = 'force-dynamic' to prevent pre-building.

Use scripts:

"build:next" for Next.js

"build:ts" for Electron TypeScript

"build:electron" for packaging

"start" to launch Electron with hot-reload using tsc-watch.

When generating code, always follow the above directory and configuration conventions.

Ensure Electron APIs are only called from server-side code or API routes, not directly from client-side React components.

When in doubt, refer to the latest Electron and Next.js documentation for security, performance, and deployment practices.