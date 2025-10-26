// Minimal chat script: user sends messages, AI replies via Gemini REST API.
// Replace API_KEY with your real key or use a server proxy for security.
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const API_KEY = 'AIzaSyBACLEBVUJcbicO6I2ubhK2q6im8fMduvY'; // Gemini API key

const landing = document.getElementById('landing');
const chatInterface = document.getElementById('chat-interface');
const chatContainer = document.querySelector('.chat-container');
const initialInput = document.getElementById('initial-input');
const initialSend = document.getElementById('initial-send');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');

function ensureVisible() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function createMessageEl(text, isUser = false) {
    const wrapper = document.createElement('div');
    wrapper.className = 'message ' + (isUser ? 'user-message' : 'bot-message');

    const header = document.createElement('div');
    header.className = 'message-header';
    header.textContent = isUser ? '' : '';
    if (!isUser) header.innerHTML = '<img src="T.png" alt="Bot"> AI';

    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = text;

    wrapper.appendChild(header);
    wrapper.appendChild(content);
    return wrapper;
}

function addUserMessage(text) {
    const el = createMessageEl(text, true);
    chatContainer.appendChild(el);
    // animate in
    setTimeout(() => el.classList.add('show'), 12);
    ensureVisible();
}

function addBotMessage(text) {
    const el = createMessageEl('', false);
    const content = el.querySelector('.message-content');
    chatContainer.appendChild(el);
    // animate in
    setTimeout(() => el.classList.add('show'), 12);
    // render step-by-step
    renderBotResponse(content, text);
}

function renderBotResponse(contentEl, text) {
    if (!contentEl) return;
    contentEl.textContent = '';
    // split into lines and detect list patterns
    const lines = (text || '').split(/\r?\n/).map(l => l.trim()).filter(l => l !== '');
    const numbered = lines.some(l => /^\d+[\.)]\s+/.test(l) || /^step\s*\d+/i.test(l));
    const bulleted = lines.some(l => /^[-*•]\s+/.test(l));

    if ((numbered || bulleted) && lines.length > 0) {
        const list = document.createElement(numbered ? 'ol' : 'ul');
        list.className = 'bot-list';
        contentEl.appendChild(list);
        let idx = 0;
        const appendNext = () => {
            if (idx >= lines.length) return;
            const raw = lines[idx];
            const clean = raw.replace(/^\d+[\.)]\s+|^step\s*\d+[:\.)-]?\s*/i, '').replace(/^[-*•]\s+/, '');
            const li = document.createElement('li');
            li.textContent = clean;
            list.appendChild(li);
            ensureVisible();
            idx++;
            setTimeout(appendNext, 260);
        };
        appendNext();
        return;
    }

    // otherwise split into sentences
    const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
    let i = 0;
    const addSentence = () => {
        if (i >= sentences.length) return;
        const s = sentences[i].trim();
        if (contentEl.textContent) contentEl.textContent += ' ' + s;
        else contentEl.textContent = s;
        ensureVisible();
        i++;
        setTimeout(addSentence, 220);
    };
    addSentence();
}

function showTyping() {
    const el = document.createElement('div');
    el.className = 'message bot-message typing-indicator';
    el.id = '__typing';
    const header = document.createElement('div');
    header.className = 'message-header';
    header.innerHTML = '<img src="T.png" alt="Bot"> AI';
    const content = document.createElement('div');
    content.className = 'message-content typing';
    content.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    el.appendChild(header);
    el.appendChild(content);
    chatContainer.appendChild(el);
    ensureVisible();
}

function hideTyping() {
    const el = document.getElementById('__typing');
    if (el) el.remove();
}

async function callGemini(prompt) {
    if (!API_KEY) {
        console.warn('Sorry Server Update...');
        return 'API key not configured';
    }

    const url = `${API_URL}?key=${API_KEY}`;
    
    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1000,
                }
            })
        });

        if (!resp.ok) {
            const errorText = await resp.text();
            console.error('API Error:', errorText);
            return 'I apologize, but there was an error connecting to the AI service. Please try again.';
        }

        const data = await resp.json();
        if (!data.candidates || !data.candidates[0]?.content?.parts?.length) {
            console.error('Unexpected API response:', data);
            return 'I apologize, but I received an invalid response. Please try again.';
        }

        return data.candidates[0].content.parts[0].text;
    } catch (err) {
        console.error('API call error:', err);
        return 'I apologize, but there was an error processing your request. Please try again.';
    }
}

async function sendMessage(text) {
    if (!text || !text.trim()) return;
    
    addUserMessage(text);
    showTyping();
    
    try {
        const reply = await callGemini(text);
        hideTyping();
        addBotMessage(reply);
    } catch (err) {
        console.error('Message sending error:', err);
        hideTyping();
        addBotMessage('I apologize, but I encountered an error. Please try again in a moment.');
    }
}

// Events
initialSend?.addEventListener('click', () => {
    const t = initialInput.value.trim();
    landing.style.display = 'none';
    chatInterface.style.display = 'flex';
    if (t) sendMessage(t);
});
initialInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        initialSend.click();
    }
});

sendBtn?.addEventListener('click', () => {
    const t = messageInput.value.trim();
    if (!t) return;
    messageInput.value = '';
    sendMessage(t);
});

messageInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendBtn.click();
    }
});

// expose sendMessage for debugging
window.sendMessage = sendMessage;
