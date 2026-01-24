// AI Panel - 豆包 (Doubao) Content Script

(function () {
    'use strict';

    const AI_TYPE = 'doubao';

    // Check if extension context is still valid
    function isContextValid() {
        return chrome.runtime && chrome.runtime.id;
    }

    // Safe message sender that checks context first
    function safeSendMessage(message, callback) {
        if (!isContextValid()) {
            console.log('[AI Panel] Extension context invalidated, skipping message');
            return;
        }
        try {
            chrome.runtime.sendMessage(message, callback);
        } catch (e) {
            console.log('[AI Panel] Failed to send message:', e.message);
        }
    }

    // Notify background that content script is ready
    safeSendMessage({ type: 'CONTENT_SCRIPT_READY', aiType: AI_TYPE });

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // Handle heartbeat and ping messages
        if (message.type === 'HEARTBEAT' || message.type === 'PING') {
            sendResponse({ alive: true, aiType: AI_TYPE });
            return true;
        }

        if (message.type === 'INJECT_MESSAGE') {
            injectMessage(message.message)
                .then(() => sendResponse({ success: true }))
                .catch(err => sendResponse({ success: false, error: err.message }));
            return true;
        }

        if (message.type === 'GET_LATEST_RESPONSE') {
            const response = getLatestResponse();
            sendResponse({ content: response });
            return true;
        }

        if (message.type === 'NEW_CONVERSATION') {
            newConversation()
                .then(() => sendResponse({ success: true }))
                .catch(err => sendResponse({ success: false, error: err.message }));
            return true;
        }
    });

    // Setup response observer for cross-reference feature
    setupResponseObserver();

    async function injectMessage(text) {
        // Doubao uses textarea for input
        const inputSelectors = [
            'textarea.semi-input-textarea',      // Doubao specific
            'textarea[placeholder*="输入"]',
            'textarea[placeholder*="豆包"]',
            'textarea',
            '[contenteditable="true"]'
        ];

        let inputEl = null;
        for (const selector of inputSelectors) {
            inputEl = document.querySelector(selector);
            if (inputEl) {
                console.log('[AI Panel] Doubao found input with:', selector);
                break;
            }
        }

        if (!inputEl) {
            throw new Error('Could not find input field');
        }

        // Focus the input
        inputEl.focus();

        // Handle different input types
        if (inputEl.tagName === 'TEXTAREA') {
            inputEl.value = text;
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            inputEl.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            // Contenteditable div
            inputEl.textContent = text;
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Delay for UI to update
        await sleep(200);

        // Doubao doesn't have reliable button selectors, use Enter key instead
        console.log('[AI Panel] Doubao sending via Enter key...');
        inputEl.focus();

        // Dispatch Enter key event
        const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
        });
        inputEl.dispatchEvent(enterEvent);

        console.log('[AI Panel] Doubao Enter key dispatched');

        // Start capturing response after sending
        waitForStreamingComplete();

        return true;
    }

    function findSendButton() {
        // Doubao's send button - based on browser inspection
        const selectors = [
            'button[aria-label="发送"]',      // Doubao specific
            'button.send-btn-mNNnTf',        // Hashed class (may change)
            'button[aria-label*="发送"]',
            'button[aria-label*="Send"]',
            'button[type="submit"]',
            'button[class*="send"]'
        ];

        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el && isVisible(el)) {
                console.log('[AI Panel] Doubao found send button with:', selector);
                return el;
            }
        }

        // Fallback: find button near the input
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
            if (btn.querySelector('svg') && isVisible(btn)) {
                const rect = btn.getBoundingClientRect();
                if (rect.bottom > window.innerHeight - 200) {
                    console.log('[AI Panel] Doubao found send via fallback');
                    return btn;
                }
            }
        }

        console.log('[AI Panel] Doubao could not find send button');
        return null;
    }

    async function waitForButtonEnabled(button, maxWait = 2000) {
        const start = Date.now();
        // Wait for button to be clickable (not disabled and not aria-disabled)
        while (Date.now() - start < maxWait) {
            const isDisabled = !!button.disabled ||
                button.getAttribute('aria-disabled') === 'true' ||
                button.classList.contains('disabled') ||
                button.style.opacity === '0' ||
                button.style.pointerEvents === 'none';
            if (!isDisabled) {
                console.log('[AI Panel] Doubao button is enabled, proceeding with click');
                return;
            }
            await sleep(50);
        }
        console.log('[AI Panel] Doubao button still disabled after wait, clicking anyway');
    }

    function setupResponseObserver() {
        const observer = new MutationObserver((mutations) => {
            // Check context validity in observer callback
            if (!isContextValid()) {
                observer.disconnect();
                return;
            }
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            checkForResponse(node);
                        }
                    }
                }
            }
        });

        const startObserving = () => {
            if (!isContextValid()) return;
            const mainContent = document.querySelector('main') || document.body;
            observer.observe(mainContent, {
                childList: true,
                subtree: true
            });
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startObserving);
        } else {
            startObserving();
        }
    }

    let lastCapturedContent = '';
    let lastCapturedHash = '';
    let isCapturing = false;
    let lastCaptureTime = 0;
    const CAPTURE_COOLDOWN = 3000; // 3 seconds cooldown

    function checkForResponse(node) {
        if (isCapturing) return;

        const responseSelectors = [
            '[class*="assistant"]',
            '[class*="message"]',
            '[class*="response"]',
            '[class*="markdown"]'
        ];

        for (const selector of responseSelectors) {
            if (node.matches?.(selector) || node.querySelector?.(selector)) {
                console.log('[AI Panel] Doubao detected new response...');
                waitForStreamingComplete();
                break;
            }
        }
    }

    async function waitForStreamingComplete() {
        if (isCapturing) {
            console.log('[AI Panel] Doubao already capturing, skipping...');
            return;
        }
        isCapturing = true;

        let previousContent = '';
        let stableCount = 0;
        const maxWait = 600000;  // 10 minutes
        const checkInterval = 400;  // Check slightly faster
        const stableThreshold = 6;  // 2.4 seconds of stable content (increased for longer responses)

        const startTime = Date.now();

        try {
            while (Date.now() - startTime < maxWait) {
                if (!isContextValid()) {
                    console.log('[AI Panel] Context invalidated, stopping capture');
                    return;
                }

                await sleep(checkInterval);

                // Check if still streaming
                const isStreaming = document.querySelector('[class*="loading"]') ||
                    document.querySelector('[class*="streaming"]') ||
                    document.querySelector('[class*="typing"]') ||
                    document.querySelector('button[aria-label*="停止"]');

                const currentContent = getLatestResponse() || '';

                if (!isStreaming && currentContent === previousContent && currentContent.length > 0) {
                    stableCount++;
                    if (stableCount >= stableThreshold) {
                        const currentHash = simpleHash(currentContent);
                        const now = Date.now();

                        // Check if content is different AND cooldown has passed
                        if (currentContent !== lastCapturedContent &&
                            currentHash !== lastCapturedHash &&
                            (now - lastCaptureTime) > CAPTURE_COOLDOWN) {
                            lastCapturedContent = currentContent;
                            lastCapturedHash = currentHash;
                            lastCaptureTime = now;

                            safeSendMessage({
                                type: 'RESPONSE_CAPTURED',
                                aiType: AI_TYPE,
                                content: currentContent
                            });
                            console.log('[AI Panel] Doubao response captured, length:', currentContent.length);
                        } else if (currentHash === lastCapturedHash) {
                            console.log('[AI Panel] Doubao duplicate content prevented, hash:', currentHash);
                        }
                        return;
                    }
                } else {
                    stableCount = 0;
                }

                previousContent = currentContent;
            }
        } finally {
            isCapturing = false;
        }
    }

    function htmlToMarkdown(element) {
        if (!element) return '';
        const clone = element.cloneNode(true);

        // Remove copy buttons and other UI elements
        clone.querySelectorAll('button, .copy-btn, .sr-only').forEach(el => el.remove());

        // Process code blocks first to protect content
        clone.querySelectorAll('pre').forEach(pre => {
            const code = pre.querySelector('code');
            const langClass = code ? code.className : '';
            const langMatch = langClass.match(/language-(\w+)/) || pre.className.match(/language-(\w+)/);
            const lang = langMatch ? langMatch[1] : '';
            const content = code ? code.textContent : pre.textContent;
            pre.textContent = `\n\`\`\`${lang}\n${content}\n\`\`\`\n`;
        });

        // Inline code
        clone.querySelectorAll('code').forEach(el => {
            if (el.parentElement.tagName !== 'PRE') {
                el.textContent = `\`${el.textContent}\``;
            }
        });

        // Block elements spacing
        clone.querySelectorAll('p, div').forEach(el => {
            el.appendChild(document.createTextNode('\n\n'));
        });

        // Bold/Italic
        clone.querySelectorAll('strong, b').forEach(el => el.textContent = `**${el.textContent}**`);
        clone.querySelectorAll('em, i').forEach(el => el.textContent = `*${el.textContent}*`);

        // Lists
        clone.querySelectorAll('li').forEach(el => el.textContent = `- ${el.textContent}\n`);

        return clone.textContent.trim().replace(/\n{3,}/g, '\n\n');
    }

    function getLatestResponse() {
        // Doubao specific - only use the most specific selector
        const messageSelectors = [
            // Most specific: use flow-markdown-body with unique message container
            'div[class*="message-block-container"]:last-child div[class*="flow-markdown-body"]',
            // Fallback: any flow-markdown-body, but only the last one
            'div[class*="flow-markdown-body"]:last-of-type',
            // Emergency fallback
            '[class*="markdown-body"]:last-of-type'
        ];

        let bestContent = null;
        let maxLength = 0;

        for (const selector of messageSelectors) {
            try {
                const messages = document.querySelectorAll(selector);
                if (messages.length > 0) {
                    // Get ONLY the last message
                    const lastMessage = messages[messages.length - 1];
                    const content = htmlToMarkdown(lastMessage);

                    // Validate content quality
                    if (content.length > maxLength && content.length > 20) {
                        maxLength = content.length;
                        bestContent = content;
                        console.log('[AI Panel] Doubao found content with:', selector, 'len:', content.length);
                        // Break after first successful match to avoid duplicates
                        break;
                    }
                }
            } catch (e) {
                console.log('[AI Panel] Doubao selector failed:', selector, e.message);
            }
        }

        if (bestContent) {
            console.log('[AI Panel] Doubao final captured length:', maxLength);
            return bestContent;
        }

        console.log('[AI Panel] Doubao could not find response');
        return null;
    }

    // Simple hash function for content deduplication
    function simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(36);
    }

    // Utility functions
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function isVisible(el) {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0';
    }

    async function newConversation() {
        // Direct navigation is most reliable
        console.log('[AI Panel] Doubao: Starting new conversation via navigation');
        await sleep(100);
        window.location.href = 'https://www.doubao.com/chat/';
        return true;
    }

    console.log('[AI Panel] Doubao content script loaded');
})();
