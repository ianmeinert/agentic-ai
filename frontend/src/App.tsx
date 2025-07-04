// Agentic AI Platform – Main React App
// Provides chat UI, MCP tools sidebar, health checks, and conversation history
// Inspired by Claude Desktop UI
//
// Key features:
// - Chat with Gemini LLM
// - MCP tools sidebar (Claude-style)
// - Model selection, error handling, health checks
// - Markdown rendering for AI responses

import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Alert, Box, Button, CircularProgress, Container, IconButton, Paper, Stack, TextField, Typography } from '@mui/material';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import { useTheme } from '@mui/material/styles';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { GEMINI_LLM_ENDPOINT, LLM_MODELS, MCP_HEALTH_ENDPOINT, MCP_TOOLS_ENDPOINT } from './config';

interface Message {
  role: 'user' | 'ai'; // Message sender
  text: string;        // Message content
  timestamp: number;   // Unix timestamp
}

/**
 * Format a timestamp as a human-readable time string.
 */
function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Main App component for Agentic AI frontend.
 * Handles chat, MCP tools sidebar, health checks, and conversation history.
 */
function App() {
  // Prompt input state
  const [prompt, setPrompt] = useState('');
  // Last LLM response
  const [response, setResponse] = useState('');
  // Loading state for LLM call
  const [loading, setLoading] = useState(false);
  // Error message state
  const [error, setError] = useState('');
  // Show error banner
  const [showError, setShowError] = useState(false);
  // Conversation history (user/AI messages)
  const [history, setHistory] = useState<Message[]>([]);
  // MCP health status
  const [mcpHealth, setMcpHealth] = useState<string>('');
  // MCP health loading state
  const [mcpLoading, setMcpLoading] = useState(false);
  // MCP health error state
  const [mcpError, setMcpError] = useState('');
  // Selected LLM model
  const [selectedModel, setSelectedModel] = useState<string>(LLM_MODELS[0].value);
  // MCP tools list
  const [tools, setTools] = useState<{ name: string; description: string }[]>([]);
  // MCP tool dialog state
  const [toolDialogOpen, setToolDialogOpen] = useState(false);
  // Currently active tool in dialog
  const [activeTool, setActiveTool] = useState<{ name: string; description: string } | null>(null);
  // Sidebar anchor for popover
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  // Enabled tools (by name)
  const [enabledTools, setEnabledTools] = useState<{ [name: string]: boolean }>({});
  // Tool order (pre/post)
  const [toolOrder, setToolOrder] = useState<'pre' | 'post'>('pre');
  // Pipeline info for current process
  const [processInfo, setProcessInfo] = useState<{pre?: any, post?: any} | null>(null);
  // Sidebar open/close state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Toggle sidebar open/close
  const toggleSidebar = () => setSidebarOpen((open) => !open);
  const theme = useTheme();

  // Sidebar width for layout adjustment
  const SIDEBAR_WIDTH = 340;

  /**
   * Fetch MCP server health status from backend.
   */
  const fetchMcpHealth = async () => {
    setMcpLoading(true);
    setMcpError('');
    try {
      const res = await fetch(MCP_HEALTH_ENDPOINT);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setMcpHealth(data.status);
    } catch (err: any) {
      setMcpError(err.message || 'Unknown error');
      setMcpHealth('');
    } finally {
      setMcpLoading(false);
    }
  };

  // On mount: fetch MCP health and tools
  useEffect(() => {
    fetchMcpHealth();
    // Fetch MCP tools
    fetch(MCP_TOOLS_ENDPOINT)
      .then(res => res.json())
      .then(setTools)
      .catch(() => setTools([]));
  }, []);

  /**
   * Get MCP health status icon, color, and label for UI.
   */
  const getMcpStatus = () => {
    if (mcpLoading) return { icon: '\u23f3', color: '#888', label: 'Checking...' };
    if (mcpError) return { icon: '\u274c', color: '#b91c1c', label: 'Error: ' + mcpError };
    if (mcpHealth && mcpHealth.toLowerCase().includes('healthy')) return { icon: '\u2705', color: '#15803d', label: mcpHealth };
    if (mcpHealth) return { icon: '\u26a0\ufe0f', color: '#eab308', label: mcpHealth };
    return { icon: '\u2753', color: '#888', label: 'Unknown' };
  };

  const mcpStatus = getMcpStatus();

  /**
   * Handle prompt submission: send to backend, update history, handle errors.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setShowError(false);
    setResponse('');
    setProcessInfo(null);
    try {
      // Use /process endpoint for full pipeline
      const res = await fetch(`${GEMINI_LLM_ENDPOINT.replace('/llm/gemini', '/process')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) {
        let msg = 'An error occurred. Please try again.';
        try {
          const errData = await res.json();
          msg = errData.detail || msg;
        } catch {}
        throw new Error(msg);
      }
      const data = await res.json();
      setResponse(data.result);
      setProcessInfo({ pre: data.preprocessing, post: data.postprocessing });
      const aiMsg: Message = { role: 'ai', text: data.result, timestamp: Date.now() };
      setHistory(prev => [...prev, aiMsg]);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      setShowError(true);
    } finally {
      setLoading(false);
      setPrompt('');
    }
  };

  // Dismiss error banner
  const dismissError = () => setShowError(false);

  // Open MCP tool dialog
  const openToolDialog = (tool: { name: string; description: string }) => {
    setActiveTool(tool);
    setToolDialogOpen(true);
  };
  // Close MCP tool dialog
  const closeToolDialog = () => {
    setToolDialogOpen(false);
    setActiveTool(null);
  };

  // Open/close popover for tool options
  const openPopover = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const closePopover = () => {
    setAnchorEl(null);
  };
  const popoverOpen = Boolean(anchorEl);

  // Toggle tool enabled/disabled
  const handleToolToggle = (toolName: string) => {
    setEnabledTools(prev => ({ ...prev, [toolName]: !prev[toolName] }));
  };
  // Change tool order (pre/post)
  const handleOrderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setToolOrder(e.target.value as 'pre' | 'post');
  };

  return (
    <>
      {/* Sidebar toggle button, flush with sidebar */}
      <Button
        variant="contained"
        color="secondary"
        sx={{
          position: 'fixed',
          top: 32,
          left: sidebarOpen ? SIDEBAR_WIDTH + 32 : 32,
          zIndex: 2000,
          borderRadius: '50%',
          minWidth: 56,
          minHeight: 56,
          boxShadow: 3,
          fontSize: 28,
          p: 0,
          transition: 'left 0.3s',
        }}
        onClick={toggleSidebar}
      >
        {sidebarOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
      </Button>
      {/* Claude-style MCP Tools Sidebar on the left (persistent sidepane) */}
      <Drawer
        anchor="left"
        open={sidebarOpen}
        onClose={toggleSidebar}
        variant="persistent"
        PaperProps={{ sx: { width: SIDEBAR_WIDTH, p: 2 } }}
      >
        <Typography variant="h6" fontWeight={700} mb={2}>MCP Tools</Typography>
        {/* MCP Health in sidebar */}
        <Box mb={2} p={1} borderRadius={1} display="flex" alignItems="center" gap={1} minHeight={28} bgcolor="#f8fafc" border="1px solid #e5e7eb">
          <Typography fontSize={13} color="text.secondary" display="flex" alignItems="center" gap={1}>
            MCP Health:
            <span style={{ fontSize: 16, color: mcpStatus.color }}>{mcpStatus.icon}</span>
          </Typography>
          <Typography fontSize={13} color={mcpStatus.color} fontWeight={500}>{mcpStatus.label}</Typography>
          <Box flexGrow={1} />
          <IconButton onClick={fetchMcpHealth} disabled={mcpLoading} title="Refresh MCP health status" size="small" sx={{ color: 'text.secondary' }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Box>
        {/* List of available MCP tools */}
        <List>
          {tools.length === 0 ? (
            <ListItem>
              <ListItemText primary="No tools available." />
            </ListItem>
          ) : (
            tools.map(tool => (
              <ListItem key={tool.name} alignItems="flex-start" sx={{ bgcolor: '#f8fafc', mb: 1, borderRadius: 1 }}>
                <ListItemText
                  primary={<Typography fontWeight={600}>{tool.name}</Typography>}
                  secondary={<Typography fontSize={13} color="text.secondary">{tool.description}</Typography>}
                />
              </ListItem>
            ))
          )}
        </List>
        <Divider sx={{ my: 2 }} />
        {/* Active pipeline info (pre/post-processing) */}
        <Typography fontWeight={600} fontSize={15} color="primary" mb={1}>Active Pipeline</Typography>
        {processInfo && (
          <Box>
            {processInfo.pre?.enabled && processInfo.pre?.pipeline?.length > 0 && (
              <Box mb={1}>
                <Typography fontWeight={600} fontSize={14} color="primary">Preprocessing:</Typography>
                {processInfo.pre.pipeline.map((step: any, idx: number) => (
                  <Typography key={idx} fontSize={13} color="text.secondary">- {step.server}.{step.tool}: {step.description}</Typography>
                ))}
              </Box>
            )}
            {processInfo.post?.enabled && processInfo.post?.pipeline?.length > 0 && (
              <Box>
                <Typography fontWeight={600} fontSize={14} color="primary">Postprocessing:</Typography>
                {processInfo.post.pipeline.map((step: any, idx: number) => (
                  <Typography key={idx} fontSize={13} color="text.secondary">- {step.server}.{step.tool}: {step.description}</Typography>
                ))}
              </Box>
            )}
          </Box>
        )}
      </Drawer>
      {/* Main content with left margin if sidebar is open */}
      <Box sx={{ ml: sidebarOpen ? `${SIDEBAR_WIDTH + 32}px` : 0, transition: 'margin-left 0.3s' }}>
        <Container maxWidth="sm" sx={{ py: 4 }}>
          <Typography variant="h4" fontWeight={700} align="center" gutterBottom>Agentic AI (Gemini LLM)</Typography>
          {/* Error banner for failed requests */}
          {showError && error && (
            <Alert severity="error" sx={{ mb: 2 }} action={
              <IconButton color="inherit" size="small" onClick={dismissError}>
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }>Error: {error}</Alert>
          )}
          {/* Loading overlay when waiting for LLM response */}
          {loading && (
            <Box position="fixed" top={0} left={0} width="100vw" height={"100vh"} zIndex={1000} display="flex" alignItems="center" justifyContent="center" sx={{ background: 'rgba(255,255,255,0.5)' }}>
              <Paper elevation={3} sx={{ p: 4, borderRadius: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <CircularProgress color="primary" sx={{ mb: 2 }} />
                <Typography color="primary" fontWeight={500}>Waiting for Gemini response...</Typography>
              </Paper>
            </Box>
          )}
          {/* Chat history with avatars and markdown rendering */}
          <Paper sx={{ mb: 3, p: 2, borderRadius: 2, background: '#f7f7fa', border: '1px solid #eee', maxHeight: 350, overflowY: 'auto' }}>
            <Stack spacing={2}>
              {/* Show pipeline steps if present */}
              {processInfo && (
                <Box mb={2}>
                  {processInfo.pre?.enabled && processInfo.pre?.pipeline?.length > 0 && (
                    <Box mb={1}>
                      <Typography fontWeight={600} fontSize={14} color="primary">Preprocessing Tools Used:</Typography>
                      {processInfo.pre.pipeline.map((step: any, idx: number) => (
                        <Typography key={idx} fontSize={13} color="text.secondary">- {step.server}.{step.tool}: {step.description}</Typography>
                      ))}
                    </Box>
                  )}
                  {processInfo.post?.enabled && processInfo.post?.pipeline?.length > 0 && (
                    <Box>
                      <Typography fontWeight={600} fontSize={14} color="primary">Postprocessing Tools Used:</Typography>
                      {processInfo.post.pipeline.map((step: any, idx: number) => (
                        <Typography key={idx} fontSize={13} color="text.secondary">- {step.server}.{step.tool}: {step.description}</Typography>
                      ))}
                    </Box>
                  )}
                </Box>
              )}
              {/* Show conversation history */}
              {history.length === 0 && <Typography color="text.secondary">No conversation yet.</Typography>}
              {history.map((msg, idx) => (
                <Box key={idx} display="flex" alignItems="flex-start" gap={2}>
                  <Box>
                    {msg.role === 'user' ? (
                      <span style={{ fontSize: 24, background: '#e0e7ff', borderRadius: '50%', padding: '2px 8px' }}> 9d1</span>
                    ) : (
                      <span style={{ fontSize: 24, background: '#ffe0e0', borderRadius: '50%', padding: '2px 8px' }}> 916</span>
                    )}
                  </Box>
                  <Box flex={1}>
                    <Typography fontWeight={500} color={msg.role === 'user' ? 'primary.dark' : 'error.dark'}>
                      {msg.role === 'user' ? 'You' : 'Gemini'} <Typography component="span" fontWeight={400} fontSize={12} color="text.secondary" ml={1}>{formatTime(msg.timestamp)}</Typography>
                    </Typography>
                    <Paper sx={{ background: msg.role === 'user' ? '#eef2ff' : '#fff1f2', borderRadius: 1, p: 1, mt: 0.5, whiteSpace: 'pre-wrap' }} elevation={0}>
                      {msg.role === 'ai' ? <ReactMarkdown>{msg.text}</ReactMarkdown> : msg.text}
                    </Paper>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Paper>
          {/* Prompt input form */}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              label="Enter your prompt..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              multiline
              minRows={4}
              fullWidth
              margin="normal"
              disabled={loading}
            />
            <Button type="submit" variant="contained" color="primary" disabled={loading || !prompt.trim()} fullWidth sx={{ minHeight: 48, fontWeight: 600 }}>
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Send'}
            </Button>
          </Box>
        </Container>
      </Box>
      {/* Tool Dialog for MCP tool details (future extensibility) */}
      <Dialog open={toolDialogOpen} onClose={closeToolDialog} fullWidth maxWidth="sm">
        <DialogTitle>{activeTool ? activeTool.name : ''}</DialogTitle>
        <DialogContent>
          <Typography>{activeTool ? activeTool.description : ''}</Typography>
          {/* Tool-specific form will go here */}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeToolDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default App;
