# Backend – Agentic AI Platform

## Overview

This is the FastAPI backend for the Agentic AI Platform. It provides:

- REST API endpoints for LLM (Gemini) and MCP tools
- Configurable, session-based PII masking/restoration
- Dynamic, config-driven pipeline orchestration

---

## Setup

1. **Install dependencies:**

   ```sh
   cd backend
   uv venv
   uv pip install -r requirements.txt
   ```

2. **Copy and configure environment variables:**

   ```sh
   cp .env-sample .env
   # Edit .env with your Gemini API key and config
   ```

3. **Run the server:**

   ```sh
   uvicorn main:app --reload
   ```

---

## Environment Variables (`.env`)

- `GEMINI_API_KEY` – Your Google Gemini API key (required)
- `GEMINI_API_URL` – (Optional) Override Gemini API endpoint
- `GEMINI_MODEL` – (Optional) Model name (default: `gemini-2.0-flash`)
- `MCP_CONFIG_PATH` – (Optional) Path to MCP config JSON (default: `templates/mcp_config.json`)

---

## Gemini & MCP Config

- **Gemini:**
  - API key and model are loaded from `.env`.
  - Endpoint: `/llm/gemini` (POST)
  - Request: `{ "prompt": "...", "model": "..." }`
  - Response: `{ "response": "..." }`
- **MCP Pipeline:**
  - Config-driven via `mcp_config.json` (see `templates/`)
  - Supports dynamic tool orchestration, pre/post-processing, and session-based PII handling
  - Endpoint: `/mcp/pipeline` (POST)
  - Tools listed at `/mcp/tools`

---

## Endpoints

- `GET /` – Root health check
- `POST /llm/gemini` – Gemini LLM prompt/response
- `GET /mcp/health` – MCP server health
- `GET /mcp/tools` – List available MCP tools
- `POST /mcp/pipeline` – Run pipeline with config-driven tools

---

## PII Handling

- In-memory masking/restoration for SSNs, emails, phones, names, addresses, credit cards
- Session-based: Use the same `session_id` for pre- and post-processing
- Only last 4 digits of credit cards are shown

---

## Development Notes

- See `main.py` for API logic
- See `templates/mcp_config.json` for pipeline config structure
- Extend MCP tools in `mcp_tools/` (if present)
