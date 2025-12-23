
// chat.ts: Логика чата
import { gameState } from './state';
import { emitChatMessage } from './network';

export let isChatOpen = false;

export function setChatOpen(val: boolean) { isChatOpen = val; }

export function addChatMessage(nickname: string, text: string, color: string = 'white', isSystem: boolean = false) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    const div = document.createElement('div');
    div.className = `chat-message ${isSystem ? 'system' : ''}`;
    if (isSystem) div.innerHTML = `<span>${text}</span>`;
    else {
        const safeNick = nickname.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const safeText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        div.innerHTML = `<span style="color: ${color}; font-weight: bold;">${safeNick}:</span> <span style="color: #e2e8f0;">${safeText}</span>`;
    }
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    setTimeout(() => { if (div.parentNode) { div.style.opacity = '0'; setTimeout(() => div.remove(), 1000); } }, 15000);
}

export function handleChatSend(text: string) {
    if (text.startsWith('/seed')) {
        addChatMessage("SYSTEM", `Current Seed: ${gameState.worldSeed}`, "#facc15", true);
    } else if (text.startsWith('/debug')) {
        const panel = document.getElementById('debug-panel');
        if (panel) panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
    } else {
        if (gameState.isOffline) {
            addChatMessage("YOU", text, "#fff");
            addChatMessage("SYSTEM", "Chat is disabled in offline mode.", "#ef4444", true);
        } else emitChatMessage(text);
    }
}

export function toggleChat(forceState?: boolean) {
    const chatInputWrapper = document.getElementById('chat-input-wrapper');
    const chatInput = document.getElementById('chat-input') as HTMLInputElement;
    const canvas = document.getElementById('game-canvas');
    
    if (typeof forceState !== 'undefined') isChatOpen = forceState;
    else isChatOpen = !isChatOpen;

    if (chatInputWrapper && chatInput) {
        if (isChatOpen) {
            chatInputWrapper.style.display = 'block';
            chatInput.focus();
        } else {
            chatInputWrapper.style.display = 'none';
            chatInput.blur();
            if (canvas) canvas.focus();
        }
    }
}
