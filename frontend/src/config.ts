// src/config.ts

export const API_BASE_URL = 'http://localhost:8000';
export const GEMINI_LLM_ENDPOINT = `${API_BASE_URL}/llm/gemini`;
export const MCP_HEALTH_ENDPOINT = `${API_BASE_URL}/mcp/health`;
export const MCP_TOOLS_ENDPOINT = `${API_BASE_URL}/mcp/tools`;

export const LLM_MODELS = [
  { label: 'Gemini 2.0 Flash', value: 'gemini-2.0-flash' },
  // { label: 'Other LLM (coming soon)', value: 'other-llm' },
]; 