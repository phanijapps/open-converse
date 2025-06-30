# Agent Memory Integration Plan (Tauri, Modular, Pluggable)

## 1. Shared Memory Abstraction
- Use a generic `MemoryProvider` interface (see `shared/memory.ts`).
- Implement a `MessageMemoryProvider` for the current Session/Message model.
- All agent and UI code should depend only on this interface for memory operations.

## 2. Tauri Command Layer
- Add Tauri commands in Rust (`src-tauri/src/database/commands.rs`) for:
  - Fetching messages for a session (`get_memory`)
  - Adding a message to a session (`add_memory`)
- Commands should be generic and typed, supporting future memory providers.

## 3. TypeScript API Layer
- Create API endpoints (e.g., `src/pages/api/memory.ts`) that:
  - Call the Tauri commands for memory operations.
  - Are marked as `dynamic = 'force-dynamic'` to prevent pre-building.
  - Use shared types from `shared/database-types.ts` and `shared/memory.ts`.

## 4. Agent Integration
- Refactor agent logic (`src/agents/`) to depend only on the `MemoryProvider` interface.
- Inject the `MessageMemoryProvider` as the default implementation.
- All memory access goes through this provider, which calls the API layer.

## 5. Extensibility
- To add a new memory backend (e.g., vector db), implement a new provider class using the same interface, add corresponding Tauri commands, and wire up new API endpoints.
- Document the process for adding new providers in the codebase.

---

**Principles:**
- All memory access is abstracted and pluggable.
- Tauri commands are the only bridge to the database.
- No direct DB or Tauri calls from client-side or agent code.
- Easy to add new memory backends by implementing the interface and wiring up the command/API layers.
