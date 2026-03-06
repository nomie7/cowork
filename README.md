# Tiger Cowork

A self-hosted AI-powered workspace that combines chat, file management, code execution, scheduled tasks, and a skill marketplace — all in one web interface. Powered by **TigerBot** LLM with tool-calling capabilities.

## Features

- **AI Chat** — Conversational AI assistant (TigerBot) with tool-calling support. The AI can search the web, fetch URLs, execute code, read/write files, and install skills — all from the chat interface.
- **File Manager** — Browse, create, edit, download, and delete files in a sandboxed directory. Includes a built-in code editor with preview.
- **Python Execution** — Run Python code directly from the chat or the dedicated Python runner. Output files (charts, reports) render in the output panel.
- **React Playground** — Generate and render interactive React/JSX components (dashboards, charts with Recharts, forms) right in the browser.
- **Scheduled Tasks** — Create cron-based scheduled jobs that run shell commands automatically. Supports common presets (every minute, hourly, daily, weekly).
- **Skills Marketplace (ClawHub)** — Search, install, and manage reusable AI skills from the ClawHub/OpenClaw catalog. Skills extend the AI's capabilities.
- **Web Search & URL Fetching** — The AI can search the internet (DuckDuckGo or Google) and fetch web pages or APIs.
- **Real-time Updates** — Socket.IO provides live streaming of AI responses, tool call progress, and execution results.

## Tech Stack

| Layer    | Technology                                      |
|----------|-------------------------------------------------|
| Frontend | React 18, React Router, Vite, Socket.IO Client  |
| Backend  | Node.js, Express, Socket.IO, TypeScript          |
| AI       | TigerBot API (OpenAI-compatible)                 |
| Runtime  | tsx (TypeScript execution), node-cron             |

## Prerequisites

- **Node.js** >= 18
- **npm** (comes with Node.js)
- **Python 3** (optional, for Python code execution)
- **TigerBot API Key** (or any OpenAI-compatible API key)

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/Sompote/tiger_cowork.git
cd tiger_cowork
```

### 2. Install server dependencies

```bash
npm install
```

### 3. Install client dependencies

```bash
cd client
npm install
cd ..
```

### 4. Run in development mode

```bash
npm run dev
```

The app will start at **http://localhost:3001** with hot-reload enabled for the frontend.

### 5. Build and run for production

```bash
npm run build
npm start
```

## Configuration

After launching the app, go to the **Settings** page in the web UI to configure:

### API Key Setup

1. Open the app in your browser at `http://localhost:3001`
2. Navigate to **Settings** (sidebar)
3. Enter your **TigerBot API Key**
4. (Optional) Change the **Model** — default is `TigerBot-70B-Chat`
5. (Optional) Change the **API URL** if using a different OpenAI-compatible endpoint
6. Click **Test Connection** to verify

### Environment Variables (optional)

| Variable      | Default        | Description                              |
|---------------|----------------|------------------------------------------|
| `PORT`        | `3001`         | Server port                              |
| `SANDBOX_DIR` | `.` (project root) | Directory for file manager sandbox  |
| `NODE_ENV`    | `development`  | Set to `production` for built assets     |

Example:

```bash
PORT=8080 SANDBOX_DIR=/home/user/workspace npm run dev
```

## Usage Guide

### Chat with AI

1. Open the app — you land on the **Chat** page
2. Type a message and press Enter
3. The AI will respond and can automatically use tools:
   - **Web search** — "Search for latest Node.js release"
   - **Code execution** — "Write a Python script to generate a chart"
   - **React components** — "Build a dashboard with Recharts"
   - **File operations** — "Read the contents of config.json"
   - **Shell commands** — "Install pandas with pip"
4. Tool calls and results appear in real-time as the AI works
5. Generated files (charts, reports, HTML) render in the output panel

### Manage Files

1. Go to the **Files** page
2. Browse the sandbox directory
3. Click a file to preview, click **Edit** to modify
4. Use **New file** to create files
5. Download files with the download button

### Scheduled Tasks

1. Go to the **Tasks** page
2. Click **New task**
3. Set a name, cron schedule (use presets or custom), and shell command
4. Tasks run automatically in the background
5. Pause, resume, or delete tasks as needed

### Skills

1. Go to the **Skills** page
2. Browse the built-in catalog or search ClawHub
3. Install skills to extend the AI's capabilities
4. The AI can also install skills directly from chat: "Install the duckduckgo-search skill"

### Settings

- Configure your API key and model
- Enable/disable web search
- Set up Google Custom Search (optional)
- Manage MCP tool integrations

## Project Structure

```
tiger_cowork/
├── server/
│   ├── index.ts              # Express + Socket.IO server entry
│   ├── routes/
│   │   ├── chat.ts           # Chat session CRUD + message API
│   │   ├── files.ts          # File manager (list, read, write, delete)
│   │   ├── tasks.ts          # Scheduled tasks CRUD
│   │   ├── skills.ts         # Skills catalog and management
│   │   ├── settings.ts       # App settings API
│   │   ├── python.ts         # Python code execution endpoint
│   │   ├── tools.ts          # Web search, URL fetch, MCP proxy
│   │   └── clawhub.ts        # ClawHub skill marketplace
│   └── services/
│       ├── tigerbot.ts       # TigerBot API client (chat, streaming, tools)
│       ├── socket.ts         # Real-time Socket.IO event handlers
│       ├── scheduler.ts      # Cron job scheduler (node-cron)
│       ├── data.ts           # JSON file-based data persistence
│       ├── python.ts         # Python subprocess runner
│       ├── toolbox.ts        # Tool definitions for AI function calling
│       ├── sandbox.ts        # Sandbox file operations
│       └── clawhub.ts        # ClawHub marketplace service
├── client/
│   ├── src/
│   │   ├── App.tsx           # React Router setup
│   │   ├── main.tsx          # App entry point
│   │   ├── pages/            # Chat, Files, Tasks, Skills, Settings pages
│   │   ├── components/       # Layout and shared components
│   │   ├── hooks/            # useSocket custom hook
│   │   └── styles/           # Global CSS
│   ├── package.json
│   └── vite.config.ts
├── data/                     # Auto-created JSON data storage
├── skills/                   # Installed ClawHub skills
├── package.json
└── tsconfig.json
```

## API Endpoints

| Method | Endpoint                           | Description                   |
|--------|------------------------------------|-------------------------------|
| GET    | `/api/chat/sessions`               | List all chat sessions        |
| POST   | `/api/chat/sessions`               | Create a new chat session     |
| GET    | `/api/chat/sessions/:id`           | Get session with messages     |
| DELETE | `/api/chat/sessions/:id`           | Delete a chat session         |
| PATCH  | `/api/chat/sessions/:id`           | Rename a chat session         |
| POST   | `/api/chat/sessions/:id/messages`  | Send a message                |
| GET    | `/api/files?path=`                 | List files in sandbox         |
| GET    | `/api/tasks`                       | List scheduled tasks          |
| POST   | `/api/tasks`                       | Create a scheduled task       |
| PATCH  | `/api/tasks/:id`                   | Update/toggle a task          |
| DELETE | `/api/tasks/:id`                   | Delete a task                 |
| GET    | `/api/skills`                      | List installed skills         |
| POST   | `/api/skills`                      | Install a custom skill        |
| GET    | `/api/skills/catalog`              | Browse skill catalog          |
| GET    | `/api/settings`                    | Get app settings              |
| PUT    | `/api/settings`                    | Update settings               |
| POST   | `/api/settings/test-connection`    | Test API connection           |
| POST   | `/api/python/run`                  | Execute Python code           |
| POST   | `/api/tools/web-search`            | Search the web                |
| POST   | `/api/tools/fetch`                 | Fetch a URL                   |
| GET    | `/api/clawhub/skills`              | List installed ClawHub skills |
| GET    | `/api/clawhub/search?q=`           | Search ClawHub marketplace    |
| POST   | `/api/clawhub/install`             | Install a ClawHub skill       |

## Socket.IO Events

| Event             | Direction       | Description                          |
|-------------------|-----------------|--------------------------------------|
| `chat:send`       | Client -> Server | Send a chat message                 |
| `chat:chunk`      | Server -> Client | Streamed AI response chunk          |
| `chat:status`     | Server -> Client | Status update (thinking, tool call) |
| `chat:response`   | Server -> Client | Final complete response             |
| `python:run`      | Client -> Server | Execute Python code                 |
| `python:status`   | Server -> Client | Python execution status             |
| `python:result`   | Server -> Client | Python execution result             |

## License

This project is private. All rights reserved.
