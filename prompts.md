## Sequential Prompts for VS Code GitHub Copilot Agent Mode

Use these prompts one at a time in Copilot Agent mode. Each prompt is designed to guide the agent through a logical build sequence for your Electron Claude Desktop-like app.

**1. Initialize Electron Project**  
"Create a new Electron project "OpenConverse" using TypeScript and Webpack. Set up the project structure for a desktop chat application, and ensure it’s compatible with both macOS and Linux.

Use the conversational stream design specified in figma https://www.figma.com/design/VM2kqz4AyR15tpQdWdnuOq/Customizable-AI-Chat-Interface-UI-Design-for-Mobile-and-Web-Applications---Free-Download--Community-?node-id=3-2&p=f&t=CLIHi6DaGBiZ0S3h-0

I want the project to use NextJS and the best free CSS framework
"

**2. Set Up Main and Renderer Processes**  
"Configure the Electron main and renderer processes with secure IPC communication channels. Prepare the codebase for chat data, session management, and extension handling."

**3. Build the Chat Interface**  
"Develop a React-based chat interface. Include a message history panel with virtualized scrolling, markdown and code highlighting, streaming responses, and a sidebar for session management (list, create, delete, and search sessions)."

**4. Implement Local Session Management**  
"Add local session management using IndexedDB (with Dexie.js). Store message histories, session metadata, and model preferences. Ensure session data can be created, updated, deleted, and searched efficiently."

**5. Integrate OpenRouter API**  
"Create a service layer for interacting with the OpenRouter API. Implement functions to send chat messages, handle streaming responses, select models, and manage API keys securely."

**6. Add Model Selection and Rate Limit Handling**  
"Enhance the chat UI with a dropdown for selecting different OpenRouter models. Display rate limit information and implement fallback handling if a model is unavailable."

**7. Design the Extension System**  
"Implement an extensibility system using a manifest file for each extension. Allow extensions to register lifecycle hooks, request permissions, and communicate with the main app via a message bus."

**8. Create Extension Runtime and SDK**  
"Build an extension runtime that runs each extension in a sandboxed Node.js process. Develop an SDK for extension authors to access chat context, session data, and lifecycle hooks."

**9. Address Cross-Platform Features**  
"Implement platform-specific features: tray icon, notifications, keychain integration, and application packaging for both macOS and Linux. Abstract any OS-specific code."

**10. Add Testing and CI**  
"Set up unit tests with Jest and end-to-end tests with Playwright. Configure GitHub Actions for CI, testing on both macOS and Linux environments."

**11. Prepare Distribution Pipeline**  
"Configure code signing, notarization (macOS), and AppImage/DEB packaging (Linux). Set up an update server and automate the release process."

**12. Review and Polish**  
"Review the codebase for security, extensibility, and performance. Add documentation for extension development and user onboarding. Ensure the app is ready for public release."

> Execute each prompt in order, verifying results and adjusting as needed before moving to the next step.