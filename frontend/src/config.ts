// src/config.ts
// Configuration constants for API endpoints and LLM models used by the Agentic AI frontend.
//
// - API_BASE_URL: Base URL for backend API
// - GEMINI_LLM_ENDPOINT: Endpoint for Gemini LLM
// - MCP_HEALTH_ENDPOINT: Endpoint for MCP health check
// - MCP_TOOLS_ENDPOINT: Endpoint for listing MCP tools
// - LLM_MODELS: List of available LLM models for selection

export const API_BASE_URL = 'http://localhost:8000';
export const GEMINI_LLM_ENDPOINT = `${API_BASE_URL}/llm/gemini`;
export const MCP_HEALTH_ENDPOINT = `${API_BASE_URL}/mcp/health`;
export const MCP_TOOLS_ENDPOINT = `${API_BASE_URL}/mcp/tools`;

export const LLM_MODELS = [
  { label: 'Gemini 2.0 Flash', value: 'gemini-2.0-flash' },
  // { label: 'Other LLM (coming soon)', value: 'other-llm' },
]; 