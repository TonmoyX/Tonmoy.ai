// Global variables for handling attachments and sidebar
let currentImage = null;
let currentModel = 'GPT-4 Turbo';
const supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const maxFileSize = 5 * 1024 * 1024; // 5MB

// Initialize AI model selection
document.addEventListener('DOMContentLoaded', () => {
    const modelItems = document.querySelectorAll('.ai-model-item');
    modelItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all items
            modelItems.forEach(i => i.classList.remove('active'));
            // Add active class to clicked item
            item.classList.add('active');
            // Update current model
            currentModel = item.querySelector('.model-name').textContent;
        });
    });
});

// Initialize DOM elements
const sidebarToggleBtn = document.getElementById('sidebar-toggle');
const sidebar = document.querySelector('.sidebar');

// Sidebar toggle functionality
function toggleSidebar() {
    if (sidebar.style.left === '0px' || !sidebar.style.left) {
        sidebar.style.left = '300px';
    } else {
        sidebar.style.left = '0px';
    }
}

// Add click event listener to sidebar toggle button
sidebarToggleBtn?.addEventListener('click', toggleSidebar);

// Initialize DOM elements for attachments
const initialAttachment = document.getElementById('initial-attachment');
const attachmentBtn = document.getElementById('attachment-btn');
const imagePreviewContainer = document.createElement('div');
imagePreviewContainer.className = 'image-preview';
document.body.appendChild(imagePreviewContainer);

// Handle file attachments
function handleFileAttachment(sourceButton) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = supportedImageTypes.join(',');
    input.style.display = 'none';
    document.body.appendChild(input);

    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!supportedImageTypes.includes(file.type)) {
            alert('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
            return;
        }

        // Validate file size
        if (file.size > maxFileSize) {
            alert('File size must be less than 5MB');
            return;
        }

        // Read and preview the image
        const reader = new FileReader();
        reader.onload = (event) => {
            currentImage = {
                data: event.target.result,
                name: file.name,
                type: file.type,
                size: file.size
            };
            
            // Show preview
            showImagePreview(sourceButton);
        };

        reader.onerror = () => {
            alert('Error reading file. Please try again.');
            currentImage = null;
        };

        reader.readAsDataURL(file);
    };

    input.click();
    document.body.removeChild(input);
}

function showImagePreview(sourceButton) {
    if (!currentImage) return;

    // Update button state
    sourceButton.classList.add('has-attachment');
    
    // Format file size
    const size = currentImage.size < 1024 * 1024 
        ? `${(currentImage.size / 1024).toFixed(1)} KB`
        : `${(currentImage.size / (1024 * 1024)).toFixed(1)} MB`;

    // Show preview tooltip
    imagePreviewContainer.innerHTML = `
        <div class="preview-content">
            <img src="${currentImage.data}" alt="Preview">
            <div class="preview-info">
                <span class="preview-name">${currentImage.name}</span>
                <span class="preview-size">${size}</span>
            </div>
            <button class="remove-image" onclick="removeAttachment()">×</button>
        </div>
    `;
    
    // Position preview
    const buttonRect = sourceButton.getBoundingClientRect();
    imagePreviewContainer.style.display = 'block';
    imagePreviewContainer.style.top = `${buttonRect.top - imagePreviewContainer.offsetHeight - 10}px`;
    imagePreviewContainer.style.left = `${buttonRect.left}px`;
}

function removeAttachment() {
    currentImage = null;
    imagePreviewContainer.style.display = 'none';
    document.querySelectorAll('.attachment-btn').forEach(btn => {
        btn.classList.remove('has-attachment');
    });
}

// Attach event listeners for file buttons
initialAttachment?.addEventListener('click', () => handleFileAttachment(initialAttachment));
attachmentBtn?.addEventListener('click', () => handleFileAttachment(attachmentBtn));

// Click outside to close preview
document.addEventListener('click', (e) => {
    if (!e.target.closest('.image-preview') && 
        !e.target.closest('.attachment-btn')) {
        imagePreviewContainer.style.display = 'none';
    }
});

// Minimal chat script: user sends messages, AI replies via Gemini REST API.
// Replace API_KEY with your real key or use a server proxy for security.
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const API_KEY = 'AIzaSyDRWc0KY6c9jT05VnkgAeKeSVQCPtLoyog'; // Gemini API key

const landing = document.getElementById('landing');
const chatInterface = document.getElementById('chat-interface');
const chatContainer = document.querySelector('.chat-container');
const initialInput = document.getElementById('initial-input');
const initialSend = document.getElementById('initial-send');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');

// Track user's scroll state
let userHasScrolled = false;

// Listen for user scroll events
chatContainer.addEventListener('scroll', () => {
    userHasScrolled = true;
    // Reset when user scrolls to bottom
    if (chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 20) {
        userHasScrolled = false;
    }
});

function ensureVisible(force = false) {
    // Don't scroll if user has scrolled up, unless forced
    if (userHasScrolled && !force) return;
    
    chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: 'smooth'
    });
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

    // Function to animate a single word
    const animateWord = async (container, word, isFirst = false) => {
        const span = document.createElement('span');
        span.textContent = (isFirst ? '' : ' ') + word;
        span.style.opacity = '0';
        span.style.transform = 'translateY(5px)';
        container.appendChild(span);

        return new Promise(resolve => {
            requestAnimationFrame(() => {
                span.style.transition = 'opacity 0.01s ease-out, transform 0.01s ease-out';
                span.style.opacity = '1';
                span.style.transform = 'translateY(0)';
                setTimeout(resolve, 100); // 0.1 second per word
            });
        });
    };

    // Handle lists
    const lines = (text || '').split(/\r?\n/).map(l => l.trim()).filter(l => l !== '');
    const numbered = lines.some(l => /^\d+[\.)]\s+/.test(l) || /^step\s*\d+/i.test(l));
    const bulleted = lines.some(l => /^[-*•]\s+/.test(l));

    if ((numbered || bulleted) && lines.length > 0) {
        const list = document.createElement(numbered ? 'ol' : 'ul');
        list.className = 'bot-list';
        contentEl.appendChild(list);
        
        const animateListItem = async (index) => {
            if (index >= lines.length) return;

            const raw = lines[index];
            const clean = raw.replace(/^\d+[\.)]\s+|^step\s*\d+[:\.)-]?\s*/i, '').replace(/^[-*•]\s+/, '');
            const li = document.createElement('li');
            list.appendChild(li);

            const words = clean.split(/\s+/);
            for (let i = 0; i < words.length; i++) {
                await animateWord(li, words[i], i === 0);
            }

            ensureVisible();
            setTimeout(() => animateListItem(index + 1), 200);
        };

        animateListItem(0);
        return;
    }

    // Handle regular text with word-by-word animation
    const words = text.split(/\s+/);
    let lastWordTime = Date.now();

    const animateAllWords = async (index = 0) => {
        if (index >= words.length) return;

        const now = Date.now();
        const timeSinceLastWord = now - lastWordTime;
        const delay = Math.max(0, 100 - timeSinceLastWord); // Ensure 0.1s between words

        await new Promise(resolve => setTimeout(resolve, delay));
        await animateWord(contentEl, words[index], index === 0);
        
        lastWordTime = Date.now();
        ensureVisible();
        return animateAllWords(index + 1);
    };

    animateAllWords();
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
    if (t) {
        document.body.classList.add('chat-active');
        landing.style.display = 'none';
        chatInterface.style.display = 'flex';
        sendMessage(t);
    }
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

// Chat history functionality
const chatHistoryList = document.getElementById('chat-history-list');
const newChatBtn = document.querySelector('.new-chat-btn');

// Load chat history from localStorage
let chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
let currentChatId = localStorage.getItem('currentChatId');

function createNewChat() {
    const chatId = Date.now().toString();
    const newChat = {
        id: chatId,
        title: 'New Chat',
        messages: [],
        timestamp: new Date().toISOString()
    };
    
    chatHistory.unshift(newChat);
    saveChatHistory();
    currentChatId = chatId;
    localStorage.setItem('currentChatId', chatId);
    
    updateChatHistoryUI();
    clearChat();
    return chatId;
}

function updateChatTitle(chatId, firstMessage) {
    const chat = chatHistory.find(c => c.id === chatId);
    if (chat) {
        // Use first message as title, truncate if too long
        chat.title = firstMessage.length > 30 ? firstMessage.substring(0, 30) + '...' : firstMessage;
        saveChatHistory();
        updateChatHistoryUI();
    }
}

function saveChatHistory() {
    // Keep only the last 30 chats
    chatHistory = chatHistory.slice(0, 30);
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}

function updateChatHistoryUI() {
    if (!chatHistoryList) return;
    
    chatHistoryList.innerHTML = '';
    chatHistory.forEach(chat => {
        const chatEl = document.createElement('div');
        chatEl.className = `chat-item${chat.id === currentChatId ? ' active' : ''}`;
        chatEl.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 12h8m-8 4h4m-4-8h8M12 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span class="chat-title">${chat.title}</span>
            <button class="delete-chat-btn" title="Delete chat">
                <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0,0,256,256">
<g fill="#ffffff" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal"><g transform="scale(8.53333,8.53333)"><path d="M26.37,26l-8.795,-12.822l0.015,0.012l7.93,-9.19h-2.65l-6.46,7.48l-5.13,-7.48h-6.95l8.211,11.971l-0.001,-0.001l-8.66,10.03h2.65l7.182,-8.322l5.708,8.322zM10.23,6l12.34,18h-2.1l-12.35,-18z"></path></g></g>
</svg>
            </button>
        `;
        
        // Add click event for loading chat
        chatEl.addEventListener('click', (e) => {
            // Don't load chat if delete button was clicked
            if (!e.target.closest('.delete-chat-btn')) {
                loadChat(chat.id);
            }
        });
        
        // Add click event for delete button
        const deleteBtn = chatEl.querySelector('.delete-chat-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteChat(chat.id);
        });
        
        chatHistoryList.appendChild(chatEl);
    });
}

function deleteChat(chatId) {
    if (confirm('Are you sure you want to delete this chat?')) {
        chatHistory = chatHistory.filter(chat => chat.id !== chatId);
        saveChatHistory();
        
        // If we deleted the current chat, create a new one
        if (chatId === currentChatId) {
            currentChatId = null;
            clearChat();
        }
        
        updateChatHistoryUI();
    }
}

function clearAllHistory() {
    if (confirm('Are you sure you want to delete all chat history? This cannot be undone.')) {
        chatHistory = [];
        currentChatId = null;
        localStorage.removeItem('chatHistory');
        localStorage.removeItem('currentChatId');
        clearChat();
        updateChatHistoryUI();
    }
}

// Add event listener for clear all button
const clearHistoryBtn = document.querySelector('.clear-history-btn');
clearHistoryBtn?.addEventListener('click', clearAllHistory);

function loadChat(chatId) {
    const chat = chatHistory.find(c => c.id === chatId);
    if (!chat) return;
    
    currentChatId = chatId;
    localStorage.setItem('currentChatId', chatId);
    
    // Clear current chat and load messages
    chatContainer.innerHTML = '';
    chat.messages.forEach(msg => {
        if (msg.type === 'user') {
            addUserMessage(msg.text);
        } else {
            addBotMessage(msg.text);
        }
    });
    
    updateChatHistoryUI();
}

function clearChat() {
    chatContainer.innerHTML = '';
}

function saveMessage(text, type = 'user') {
    if (!currentChatId) {
        currentChatId = createNewChat();
    }
    
    const chat = chatHistory.find(c => c.id === currentChatId);
    if (chat) {
        chat.messages.push({ text, type, timestamp: new Date().toISOString() });
        
        // If this is the first message, use it as the chat title
        if (chat.messages.length === 1 && type === 'user') {
            updateChatTitle(currentChatId, text);
        }
        
        saveChatHistory();
    }
}

// Modify sendMessage to save messages to history
async function sendMessage(text) {
    if (!text || !text.trim()) return;
    
    addUserMessage(text);
    saveMessage(text, 'user');
    showTyping();
    
    try {
        const reply = await callGemini(text);
        hideTyping();
        addBotMessage(reply);
        saveMessage(reply, 'bot');
    } catch (err) {
        console.error('Message sending error:', err);
        hideTyping();
        const errorMessage = 'I apologize, but I encountered an error. Please try again in a moment.';
        addBotMessage(errorMessage);
        saveMessage(errorMessage, 'bot');
    }
}

// Add event listener for new chat button
newChatBtn?.addEventListener('click', createNewChat);

// Initialize chat history on load
updateChatHistoryUI();

// expose sendMessage for debugging
window.sendMessage = sendMessage;

