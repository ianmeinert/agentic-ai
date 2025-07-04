"""
Agentic AI FastAPI backend

- Provides endpoints for Gemini LLM, MCP tools, and configurable pipeline
- Handles session-based PII masking/restoration
- Loads config from environment and mcp_config.json
"""
import json
import os
import re
from pathlib import Path
from typing import Dict, List

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Load environment variables from .env
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
GEMINI_API_URL = os.getenv("GEMINI_API_URL")

if not GEMINI_API_URL:
    if GEMINI_API_KEY and GEMINI_MODEL:
        GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    else:
        GEMINI_API_URL = None

app = FastAPI()

# Allow CORS for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LLMRequest(BaseModel):
    prompt: str
    model: str = None  # Accept model but ignore for now

@app.get("/")
def read_root():
    """Root health check endpoint."""
    return {"message": "Agentic AI FastAPI backend is running."}

@app.post("/llm/gemini")
def call_gemini_llm(request: LLMRequest):
    """Call Gemini LLM with a prompt and return the response."""
    if not GEMINI_API_URL:
        raise HTTPException(status_code=500, detail="Gemini API URL not configured.")
    payload = {
        "contents": [{"parts": [{"text": request.prompt}]}]
    }
    response = requests.post(GEMINI_API_URL, json=payload)
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Gemini API error: " + response.text)
    data = response.json()
    return {"response": data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")}

def gemini_llm_call(prompt: str) -> str:
    """Helper function to call Gemini LLM and return the response text."""
    if not GEMINI_API_URL:
        return "[LLM not configured]"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    response = requests.post(GEMINI_API_URL, json=payload)
    if response.status_code != 200:
        return f"[Gemini API error: {response.text}]"
    data = response.json()
    return data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")

# In-memory PII mapping store
PII_MAPPINGS = {}

PII_PATTERNS = [
    (r"\b\d{3}-\d{2}-\d{4}\b", "SSN"),
    (r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}", "EMAIL"),
    (r"(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", "PHONE"),
    (r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b", "NAME"),
    (r"\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir|Way|Place|Pl)", "ADDRESS"),
    (r"\b(?:\d[ -]*?){13,16}\b", "CREDIT_CARD"),
]

import uuid


def sanitize_input(text: str, session_id: str = None) -> str:
    """
    Mask PII in the input text and store mapping for the session.
    Supported PII: SSN, email, phone, name, address, credit card (last 4 digits only).
    """
    if not session_id:
        session_id = str(uuid.uuid4())
    if session_id not in PII_MAPPINGS:
        PII_MAPPINGS[session_id] = {}
    mapping = PII_MAPPINGS[session_id]
    def mask(match, pii_type):
        original = match.group(0)
        if pii_type == "CREDIT_CARD":
            # Only show last 4 digits
            digits = re.sub(r"\D", "", original)
            last4 = digits[-4:] if len(digits) >= 4 else digits
            masked = f"[MASKED_CREDIT_CARD:{last4}]"
        else:
            masked = f"[MASKED_{pii_type}]"
        mapping[masked] = original
        return masked
    for pattern, pii_type in PII_PATTERNS:
        text = re.sub(pattern, lambda m: mask(m, pii_type), text)
    return text

def restore_pii(text: str, session_id: str = None) -> str:
    """
    Restore masked PII in the text using the session mapping.
    """
    if not session_id or session_id not in PII_MAPPINGS:
        return text
    mapping = PII_MAPPINGS[session_id]
    for masked, original in mapping.items():
        text = text.replace(masked, original)
    return text

# MCP server scaffolding
@app.get("/mcp/health")
def mcp_health():
    """Health check for MCP server."""
    return {"status": "MCP server is healthy"}

@app.get("/mcp/tools")
def list_mcp_tools() -> List[Dict[str, str]]:
    """List available MCP tools and their descriptions."""
    return [
        {"name": "text-analysis", "description": "Analyze text for sentiment, keywords, and more."},
        {"name": "file-upload", "description": "Upload a file for processing."},
        {"name": "image-analysis", "description": "Analyze an image for content, objects, or text."},
        {"name": "web-search", "description": "Perform a web search and return results."},
        {"name": "code-exec", "description": "Execute code snippets in a safe environment."},
        {"name": "external-api", "description": "Integrate with external APIs (e.g., weather, news)."},
    ]

@app.post("/mcp/text-analysis")
def mcp_text_analysis(text: str):
    """Stub endpoint for text analysis tool."""
    return {"sentiment": "neutral", "keywords": ["example", "keywords"]}

@app.post("/mcp/file-upload")
def mcp_file_upload(file: UploadFile = File(...)):
    """Stub endpoint for file upload tool."""
    return {"filename": file.filename, "status": "received"}

@app.post("/mcp/image-analysis")
def mcp_image_analysis(file: UploadFile = File(...)):
    """Stub endpoint for image analysis tool."""
    return {"filename": file.filename, "analysis": "not implemented"}

@app.post("/mcp/web-search")
def mcp_web_search(query: str):
    """Stub endpoint for web search tool."""
    return {"query": query, "results": ["result 1", "result 2"]}

@app.post("/mcp/code-exec")
def mcp_code_exec(code: str):
    """Stub endpoint for code execution tool."""
    return {"output": "code execution not implemented"}

@app.post("/mcp/external-api")
def mcp_external_api(api: str, params: dict):
    """Stub endpoint for external API integration tool."""
    return {"api": api, "params": params, "result": "not implemented"}

class ProcessRequest(BaseModel):
    prompt: str

@app.post("/process")
def process_request(req: ProcessRequest):
    """
    Run the configured MCP pipeline (preprocessing, LLM, postprocessing) on the prompt.
    Handles session-based PII masking/restoration and tool orchestration.
    """
    # Load MCP config
    config_path = Path(__file__).parent / "mcp_config.json"
    with open(config_path, "r") as f:
        config = json.load(f)

    import uuid
    session_id = str(uuid.uuid4())

    def run_pipeline(pipeline, text, stage, session_id):
        """
        Run a pipeline of tools (pre or post processing) on the text.
        Handles PII tools and stubs for other tools.
        """
        for step in pipeline:
            server = step.get("server")
            tool = step.get("tool")
            desc = step.get("description", "")
            params = step.get("parameters", {}).copy()
            # Always use the same session_id for PII tools
            if server == "pii-handler":
                params["session_id"] = session_id
            if server == "pii-handler" and tool == "sanitize_input":
                text = sanitize_input(text, session_id=params["session_id"])
            elif server == "pii-handler" and tool == "restore_pii":
                text = restore_pii(text, session_id=params["session_id"])
            else:
                # Stub for other tools
                text += f" [processed by {server}.{tool} ({desc})]"
        return text

    # Preprocessing
    processed = req.prompt
    pre_cfg = config.get("preprocessing", {})
    if pre_cfg.get("enabled") and pre_cfg.get("pipeline"):
        processed = run_pipeline(pre_cfg["pipeline"], processed, stage="pre", session_id=session_id)

    # LLM (real Gemini call)
    llm_result = gemini_llm_call(processed)

    # Postprocessing
    post_cfg = config.get("postprocessing", {})
    if post_cfg.get("enabled") and post_cfg.get("pipeline"):
        llm_result = run_pipeline(post_cfg["pipeline"], llm_result, stage="post", session_id=session_id)

    return {
        "result": llm_result,
        "preprocessing": pre_cfg,
        "postprocessing": post_cfg,
        "session_id": session_id
    }
