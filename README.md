# Mako-AI

> An English-first AI thinking workspace powered by Marokecho.

Mako-AI provides a focused web interface for turning raw questions, plans, and notes into clear next actions. The application combines a React client, an Express/tRPC server, and a server-side AI chat procedure. API credentials remain on the server and are never exposed to the browser.

## Repository state

The current repository includes `mako-ai-marokecho-web-release.patch`, the complete source release for the Mako-AI web application. Apply this patch once after cloning the repository to materialize the application source tree (`client/`, `server/`, `shared/`, and project configuration files).

## Features

| Area | Included capability |
|---|---|
| Conversation workspace | Responsive English interface with prompts, session context, copy controls, and keyboard-friendly composition |
| AI chat | A typed tRPC mutation that calls the language model only from the server |
| Security | Input validation, bounded message history, server-only credentials, and explicit error handling |
| Quality | TypeScript checks, Vitest coverage for chat validation, and a production build command |
| Styling | Signal & Sand visual system with responsive desktop and mobile layouts |

## Prerequisites

| Requirement | Recommended version | Purpose |
|---|---:|---|
| Git | Current stable release | Cloning the repository and applying the release patch |
| Node.js | 22 or later | Running the web application |
| pnpm | 10 or later | Installing locked JavaScript dependencies |
| MySQL-compatible database | Optional for chat-only evaluation | Required only when enabling account persistence and database features |

## Installation

Clone the repository and apply the included release patch. The patch adds the complete project source while leaving the release file intact.

```bash
git clone https://github.com/abdelatizarzori3-sys/Mako-AI.git
cd Mako-AI
git am mako-ai-marokecho-web-release.patch
pnpm install
```

If Git reports that the patch has already been applied, do not apply it a second time. Confirm the source layout instead:

```bash
test -f package.json && test -d client && test -d server && echo "Mako-AI source is ready"
```

## Configuration

Create a local `.env` file for non-platform development. Never commit this file or place API keys in client-side variables.

```bash
NODE_ENV=development
BUILT_IN_FORGE_API_URL=https://forge.manus.im
BUILT_IN_FORGE_API_KEY=replace_with_a_server_side_key
JWT_SECRET=replace_with_a_long_random_secret
```

The following environment variables are used by the server:

| Variable | Required | Purpose |
|---|---:|---|
| `BUILT_IN_FORGE_API_URL` | Yes for AI chat | Base URL for the server-side language model gateway |
| `BUILT_IN_FORGE_API_KEY` | Yes for AI chat | Server-side credential for the language model gateway |
| `JWT_SECRET` | Yes when authentication is enabled | Signs authentication cookies |
| `DATABASE_URL` | Optional | Enables persistent user and workspace data |
| `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL` | Optional | Enable the included OAuth workflow |

> Keep all secrets on the server. Do not expose `BUILT_IN_FORGE_API_KEY`, `JWT_SECRET`, or database credentials through `VITE_*` variables, browser code, commits, issues, or screenshots.

## Run locally

Start the development server:

```bash
pnpm dev
```

The application runs on the port selected by the server. Open the displayed local URL in a browser, enter a message, and use **Enter** to send or **Shift + Enter** for a new line.

## Development commands

| Command | Description |
|---|---|
| `pnpm dev` | Starts the Express and Vite development server |
| `pnpm check` | Runs TypeScript validation without emitting output |
| `pnpm test` | Runs the Vitest test suite |
| `pnpm build` | Produces the production client and server build in `dist/` |
| `pnpm start` | Runs the previously built production server |
| `pnpm format` | Formats supported source files with Prettier |
| `pnpm db:push` | Generates and applies database migrations when database features are enabled |

Before opening a pull request or deploying, run:

```bash
pnpm check
pnpm test
pnpm build
```

## Project structure

After applying the release patch, the repository is organized as a full-stack TypeScript application. The frontend and backend live in separate top-level directories while sharing types and runtime contracts.

```text
Mako-AI/
├── client/                         # React 19 browser application
│   ├── index.html                  # HTML document, metadata, and font loading
│   ├── public/                     # Small public configuration assets only
│   └── src/
│       ├── pages/Home.tsx          # Marokecho conversation workspace and UI state
│       ├── components/             # Reusable UI, chat, and layout components
│       ├── components/ui/          # Prebuilt accessible interface primitives
│       ├── contexts/               # Theme and client-wide React contexts
│       ├── hooks/                  # Reusable client interaction hooks
│       ├── lib/trpc.ts             # Typed tRPC client binding
│       ├── main.tsx                # React, Query Client, and tRPC providers
│       └── index.css               # Signal & Sand design tokens and responsive styling
├── server/                         # Express and tRPC server application
│   ├── routers.ts                  # Public API router and ai.chat mutation
│   ├── routers.chat.test.ts        # Chat validation and response contract tests
│   ├── db.ts                       # Database connection and user persistence helpers
│   ├── storage.ts                  # Server-side storage helpers
│   └── _core/                      # Framework integration and protected server utilities
│       ├── index.ts                # Server bootstrap and Vite integration
│       ├── trpc.ts                 # tRPC procedures and context helpers
│       ├── llm.ts                  # Server-only language-model gateway helper
│       ├── env.ts                  # Typed access to server environment variables
│       ├── oauth.ts                # OAuth callback and authentication integration
│       └── storageProxy.ts          # Authenticated storage proxy
├── drizzle/                        # Drizzle schema, relations, and database migrations
├── shared/                         # Shared types, error helpers, and constants
├── patches/                        # Dependency patches required by pnpm
├── package.json                    # Scripts, runtime dependencies, and toolchain versions
├── vite.config.ts                  # Vite client build configuration
├── vitest.config.ts                # Vitest test-runner configuration
└── README.md                       # Installation, operations, and contribution guide
```

### Responsibility guide

| Location | Responsibility | When to change it |
|---|---|---|
| `client/src/pages/Home.tsx` | Product-facing chat experience, prompts, notices, and local message state | Changing the main conversation workflow or visible copy |
| `client/src/components/` | Reusable presentation and interaction elements | Adding or refining an interface component used in more than one place |
| `client/src/lib/trpc.ts` | Typed frontend access to the server API | Rarely; only if the tRPC client setup itself changes |
| `server/routers.ts` | API contracts, input validation, model invocation, and response shapes | Adding a server capability or changing the chat contract |
| `server/_core/llm.ts` | Credentialed model gateway invoked on the server | Extending supported model-call behavior; never expose it to the browser |
| `server/db.ts` and `drizzle/` | Persistent data access and schema evolution | Adding durable user, session, or workspace data |
| `shared/` | Types and constants used by both client and server | Sharing a stable contract across the application boundary |
| `.env` and deployment secrets | Runtime credentials and environment-specific configuration | Configuring an environment; never commit these files |

### Request flow

The chat path is intentionally server mediated. The browser never calls the model gateway directly and never receives the gateway key.

```text
Home.tsx
  → trpc.ai.chat.useMutation()
  → POST /api/trpc/ai.chat
  → server/routers.ts validates message and bounded history
  → server/_core/llm.ts invokes the configured model gateway
  → typed reply returns through tRPC
  → Home.tsx appends the assistant message to the conversation
```

This structure keeps model credentials out of the frontend, limits the request payload through Zod validation, and makes the API behavior directly testable through `server/routers.chat.test.ts`.

## Deployment notes

Build the project with `pnpm build`, then run it with `pnpm start` in an environment that provides the required server-side variables. Use a managed secret store for production credentials, enforce HTTPS, and configure database backups before enabling persistent user data.

## Contributing

Create a feature branch, keep changes focused, add or update tests for behavior changes, and verify `pnpm check`, `pnpm test`, and `pnpm build` before submitting a pull request. Do not commit `.env` files, credentials, or generated dependency directories.

## License

The repository currently declares the MIT license in its project metadata. Add a root `LICENSE` file before distributing the code publicly.
