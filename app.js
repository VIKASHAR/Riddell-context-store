/**
 * Riddell SAP Knowledge Portal — Clean Client Logic
 * Connects securely to Lyzr Agent API via server-side .env credentials.
 */

// ============================================================================
// State & Defaults
// ============================================================================
let appState = {
  config: {
    endpoint: '/api/chat',
    apiKey: '',
    agentId: '',
    userId: '',
    sessionId: ''
  },
  messages: [],
  isQuerying: false
};

// ============================================================================
// DOM Elements
// ============================================================================
const DOM = {
  chatViewport: document.getElementById('chat-viewport'),
  welcomeHero: document.getElementById('welcome-hero'),
  messagesContainer: document.getElementById('messages-container'),
  thinkingIndicator: document.getElementById('thinking-indicator'),
  thinkingLabel: document.getElementById('thinking-label'),

  messageInput: document.getElementById('message-input'),
  sendBtn: document.getElementById('send-btn'),
  newChatBtn: document.getElementById('new-chat-btn'),

  settingsBtn: document.getElementById('settings-btn'),
  settingsModal: document.getElementById('settings-modal'),
  closeModalBtn: document.getElementById('close-modal-btn'),
  cfgEndpoint: document.getElementById('cfg-endpoint'),
  cfgAgentId: document.getElementById('cfg-agent-id'),
  cfgUserId: document.getElementById('cfg-user-id'),
  cfgSessionId: document.getElementById('cfg-session-id'),
  cfgApiKey: document.getElementById('cfg-api-key'),
  testConnBtn: document.getElementById('test-conn-btn'),
  testConnResult: document.getElementById('test-conn-result'),
  saveSettingsBtn: document.getElementById('save-settings-btn'),
  toastContainer: document.getElementById('toast-container')
};

// ============================================================================
// Initialization
// ============================================================================
async function init() {
  await loadServerConfig();
  setupEventListeners();
}

async function loadServerConfig() {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      appState.config.agentId = data.agentId || '6ad09364bb3cc892445a6a34';
      appState.config.userId = data.userId || 'avikash@kaartech.com';
      appState.config.sessionId = data.sessionId || `riddell-session-${Date.now()}`;
      appState.config.endpoint = '/api/chat';
    }
  } catch (err) {
    console.warn('Could not load /api/config:', err);
  }
}

// ============================================================================
// Query Execution & Lyzr API
// ============================================================================
async function submitQuery(text) {
  const query = (text || DOM.messageInput.value).trim();
  if (!query || appState.isQuerying) return;

  DOM.messageInput.value = '';
  DOM.messageInput.style.height = 'auto';
  DOM.sendBtn.disabled = true;

  // Hide welcome hero on first query
  DOM.welcomeHero.classList.add('hidden');

  // Add User Message
  appendMessage({
    role: 'user',
    content: query,
    timestamp: new Date()
  });

  showThinking(true);

  try {
    const payload = {
      user_id: appState.config.userId,
      agent_id: appState.config.agentId,
      session_id: appState.config.sessionId,
      message: query
    };

    const headers = { 'Content-Type': 'application/json' };
    if (appState.config.apiKey) {
      headers['x-api-key'] = appState.config.apiKey;
    }

    const res = await fetch(appState.config.endpoint || '/api/chat', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || data.detail?.[0]?.msg || data.message || `HTTP ${res.status}`);
    }

    const answer = data.response || data.message || (typeof data === 'string' ? data : JSON.stringify(data));

    appendMessage({
      role: 'agent',
      content: answer,
      timestamp: new Date()
    });

  } catch (err) {
    console.error('Lyzr inference error:', err);
    appendMessage({
      role: 'agent',
      content: `**Query Error:** Unable to retrieve response from Lyzr Agent.\n\n*Error details:* \`${err.message}\``,
      timestamp: new Date()
    });
    showToast(`Error: ${err.message}`, 'error');
  } finally {
    showThinking(false);
    appState.isQuerying = false;
    DOM.messageInput.focus();
  }
}

function showThinking(show) {
  appState.isQuerying = show;
  if (show) {
    DOM.thinkingIndicator.classList.remove('hidden');
    DOM.chatViewport.scrollTo({ top: DOM.chatViewport.scrollHeight, behavior: 'smooth' });
  } else {
    DOM.thinkingIndicator.classList.add('hidden');
  }
}

// ============================================================================
// Render Chat Messages
// ============================================================================
function appendMessage(msg) {
  appState.messages.push(msg);

  const wrapper = document.createElement('div');
  wrapper.className = `message-wrapper ${msg.role}`;
  const timeStr = msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (msg.role === 'user') {
    wrapper.innerHTML = `
      <div class="message-avatar user-av">YOU</div>
      <div class="message-content-area">
        <div class="message-meta">
          <span class="sender-tag">User</span>
          <span>${timeStr}</span>
        </div>
        <div class="message-bubble">${escapeHtml(msg.content).replace(/\n/g, '<br>')}</div>
      </div>
    `;
  } else {
    const formattedHtml = renderMarkdown(msg.content);
    wrapper.innerHTML = `
      <div class="message-avatar agent-av">R</div>
      <div class="message-content-area">
        <div class="message-meta">
          <span class="sender-tag">Riddell Assistant</span>
          <span>${timeStr}</span>
        </div>
        <div class="message-bubble">${formattedHtml}</div>
        <div class="message-actions">
          <button class="action-pill-btn copy-btn" title="Copy answer">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span>Copy</span>
          </button>
        </div>
      </div>
    `;

    wrapper.querySelector('.copy-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(msg.content);
      showToast('Answer copied to clipboard', 'info');
    });
  }

  DOM.messagesContainer.appendChild(wrapper);
  DOM.chatViewport.scrollTo({ top: DOM.chatViewport.scrollHeight, behavior: 'smooth' });
}

// ============================================================================
// Markdown Renderer
// ============================================================================
function renderMarkdown(rawText) {
  if (!rawText) return '';

  let html = rawText;

  // Code blocks
  html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre><code>${escapeHtml(code.trim())}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold & Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Lists
  html = html.replace(/^\s*[-*]\s+(.*)$/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gms, '<ul>$1</ul>');
  html = html.replace(/<\/ul>\s*<ul>/g, '');

  html = html.replace(/^\s*(\d+)\.\s+(.*)$/gim, '<li>$2</li>');

  // Paragraphs
  const blocks = html.split('\n\n');
  html = blocks.map(b => {
    b = b.trim();
    if (!b) return '';
    if (b.startsWith('<h') || b.startsWith('<ul') || b.startsWith('<ol') || b.startsWith('<pre')) {
      return b;
    }
    return `<p>${b.replace(/\n/g, '<br>')}</p>`;
  }).join('');

  return html;
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  DOM.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}

// ============================================================================
// Event Listeners
// ============================================================================
function setupEventListeners() {
  // Sample prompt cards
  document.querySelectorAll('.prompt-card').forEach(card => {
    card.addEventListener('click', () => {
      submitQuery(card.getAttribute('data-query'));
    });
  });

  // Input auto-expand & submit
  DOM.messageInput.addEventListener('input', () => {
    DOM.messageInput.style.height = 'auto';
    DOM.messageInput.style.height = Math.min(DOM.messageInput.scrollHeight, 120) + 'px';
    DOM.sendBtn.disabled = !DOM.messageInput.value.trim() || appState.isQuerying;
  });

  DOM.messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitQuery();
    }
  });

  DOM.sendBtn.addEventListener('click', () => submitQuery());

  // New Chat Button
  DOM.newChatBtn.addEventListener('click', () => {
    DOM.messagesContainer.innerHTML = '';
    DOM.welcomeHero.classList.remove('hidden');
    appState.messages = [];
    appState.config.sessionId = `riddell-session-${Date.now()}`;
    showToast('Started new conversation', 'info');
  });

  // Settings Modal Handlers
  DOM.settingsBtn.addEventListener('click', () => {
    DOM.cfgEndpoint.value = appState.config.endpoint;
    DOM.cfgAgentId.value = appState.config.agentId;
    DOM.cfgUserId.value = appState.config.userId;
    DOM.cfgSessionId.value = appState.config.sessionId;
    DOM.cfgApiKey.value = appState.config.apiKey;
    DOM.testConnResult.className = 'test-conn-result hidden';
    DOM.settingsModal.classList.remove('hidden');
  });

  DOM.closeModalBtn.addEventListener('click', () => {
    DOM.settingsModal.classList.add('hidden');
  });

  DOM.settingsModal.addEventListener('click', (e) => {
    if (e.target === DOM.settingsModal) DOM.settingsModal.classList.add('hidden');
  });

  DOM.testConnBtn.addEventListener('click', async () => {
    DOM.testConnBtn.disabled = true;
    DOM.testConnResult.className = 'test-conn-result';
    DOM.testConnResult.textContent = 'Testing connection...';
    DOM.testConnResult.classList.remove('hidden');

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (DOM.cfgApiKey.value.trim()) {
        headers['x-api-key'] = DOM.cfgApiKey.value.trim();
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          user_id: DOM.cfgUserId.value,
          agent_id: DOM.cfgAgentId.value,
          session_id: DOM.cfgSessionId.value,
          message: 'ping'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail?.[0]?.msg || `HTTP ${res.status}`);

      DOM.testConnResult.className = 'test-conn-result success';
      DOM.testConnResult.textContent = `✓ Connected successfully. (Agent: ${DOM.cfgAgentId.value})`;
    } catch (err) {
      DOM.testConnResult.className = 'test-conn-result error';
      DOM.testConnResult.textContent = `✕ Connection Failed: ${err.message}`;
    } finally {
      DOM.testConnBtn.disabled = false;
    }
  });

  DOM.saveSettingsBtn.addEventListener('click', () => {
    appState.config.endpoint = DOM.cfgEndpoint.value.trim() || '/api/chat';
    appState.config.agentId = DOM.cfgAgentId.value.trim();
    appState.config.userId = DOM.cfgUserId.value.trim();
    appState.config.sessionId = DOM.cfgSessionId.value.trim();
    appState.config.apiKey = DOM.cfgApiKey.value.trim();

    DOM.settingsModal.classList.add('hidden');
    showToast('Settings saved', 'success');
  });
}

document.addEventListener('DOMContentLoaded', init);
