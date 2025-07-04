# Frontend – Agentic AI Platform

## Overview

This is the React frontend for the Agentic AI Platform. It provides:

- Modern chat UI for interacting with Gemini LLM and MCP tools
- Model selection, tool sidebar, health checks, and error handling

---

## Setup

1. **Install dependencies:**

   ```sh
   cd frontend
   npm install
   ```

2. **Start the development server:**

   ```sh
   npm run dev
   ```

3. **Open in browser:**
   - Visit [http://localhost:5173](http://localhost:5173)

---

## Available Scripts

- `npm run dev` – Start development server
- `npm run build` – Build for production
- `npm run preview` – Preview production build
- `npm run lint` – Lint code

---

## Features

- Chat with Gemini LLM
- Conversation history with markdown rendering
- Model selection dropdown
- MCP tools sidebar (toggleable, persistent)
- Health check/status indicators
- Error handling and loading spinners

---

## Configuration

- API endpoints are set in `src/config.ts`
- Ensure the backend server is running and accessible

---

## Development Notes

- UI built with React, Vite, and Material-UI (MUI)
- See `src/components/` for UI logic
- Customize styles and theming as needed
