// AI Panel - Kimi (Moonshot AI) Content Script

(function () {
    'use strict';

    const AI_TYPE = 'kimi';

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
        // Kimi uses a contenteditable div, NOT textarea
        const inputSelectors = [
            'div.chat-input-editor',         // Kimi specific
            '[contenteditable="true"]',
            'div[class*="editor"]',
            'textarea'                       // Fallback
        ];

        let inputEl = null;
        for (const selector of inputSelectors) {
            inputEl = document.querySelector(selector);
            if (inputEl) {
                console.log('[AI Panel] Kimi found input with:', selector);
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
        } else {
            // Contenteditable div - use execCommand for better compatibility
            inputEl.innerText = ''; // Clear first
            document.execCommand('insertText', false, text);
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Longer delay for Kimi
        await sleep(300);

        // Find and click the send button
        const sendButton = findSendButton();
        if (!sendButton) {
            throw new Error('Could not find send button');
        }

        // Wait for button to be enabled
        await waitForButtonEnabled(sendButton);

        sendButton.click();

        // Start capturing response after sending
        console.log('[AI Panel] Kimi message sent, starting response capture...');
        waitForStreamingComplete();

        return true;
    }

    function findSendButton() {
        // Kimi's send button container - based on actual DOM inspection
        const selectors = [
            'div.send-button-container',         // Kimi specific
            'div[class*="send-button"]',
            'button[aria-label*="发送"]',
            'button[aria-label*="Send"]',
            'button[type="submit"]',
            'button[class*="send"]',
            '.send-btn',
            '[data-testid="send-button"]'
        ];

        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el && isVisible(el)) {
                console.log('[AI Panel] Kimi found send button with:', selector);
                return el;
            }
        }

        // Fallback: find div or button with SVG in bottom-right corner
        const elements = Array.from(document.querySelectorAll('div, button'));
        for (const elem of elements) {
            const svg = elem.querySelector('svg');
            if (svg && isVisible(elem)) {
                const rect = elem.getBoundingClientRect();
                // Bottom right corner (typical send button location)
                if (rect.right > window.innerWidth - 250 && rect.bottom > window.innerHeight - 250) {
                    console.log('[AI Panel] Kimi found send via fallback');
                    return elem;
                }
            }
        }

        console.log('[AI Panel] Kimi could not find send button');
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
                console.log('[AI Panel] Kimi button is enabled, proceeding with click');
                return;
            }
            await sleep(50);
        }
        console.log('[AI Panel] Kimi button still disabled after wait, clicking anyway');
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
    let isCapturing = false;

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
                console.log('[AI Panel] Kimi detected new response...');
                waitForStreamingComplete();
                break;
            }
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

    async function waitForStreamingComplete() {
        if (isCapturing) {
            console.log('[AI Panel] Kimi already capturing, skipping...');
            return;
        }
        isCapturing = true;

        let previousContent = '';
        let stableCount = 0;
        const maxWait = 600000;  // 10 minutes
        const checkInterval = 500;  // Faster check for Kimi (reduced from 800)
        const stableThreshold = 10;  // More stable checks required (increased from 6)

        const startTime = Date.now();

        try {
            while (Date.now() - startTime < maxWait) {
                if (!isContextValid()) {
                    console.log('[AI Panel] Context invalidated, stopping capture');
                    return;
                }

                await sleep(checkInterval);

                // Check if still streaming - more comprehensive selectors
                const isStreaming = document.querySelector('[class*="loading"]') ||
                    document.querySelector('[class*="streaming"]') ||
                    document.querySelector('[class*="typing"]') ||
                    document.querySelector('[class*="thinking"]') ||
                    document.querySelector('[class*="generating"]') ||
                    document.querySelector('button[aria-label*="停止"]') ||
                    document.querySelector('button[aria-label*="Stop"]') ||
                    document.querySelector('.stop-btn') ||
                    document.querySelector('[class*="cursor"]'); // Cursor indicator

                const currentContent = getLatestResponse() || '';

                // Only consider stable if not streaming AND content hasn't changed
                if (!isStreaming && currentContent === previousContent && currentContent.length > 0) {
                    stableCount++;
                    if (stableCount >= stableThreshold) {
                        if (currentContent !== lastCapturedContent) {
                            lastCapturedContent = currentContent;
                            safeSendMessage({
                                type: 'RESPONSE_CAPTURED',
                                aiType: AI_TYPE,
                                content: currentContent
                            });
                            console.log('[AI Panel] Kimi response captured, length:', currentContent.length);
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

    function getLatestResponse() {
        // Find the latest assistant message - more robust selectors
        const messageSelectors = [
            // Kimi specific - try multiple patterns
            '.message-list .message.ai .message-content',
            '[class*="bot-message"] .message-content',
            '[class*="assistant"] [class*="markdown"]',
            '[class*="message-content"]',
            '[class*="kimi-response"]',
            '.markdown-body',
            // Generic fallbacks
            'main article:last-child',
            'main div[class*="message"]:last-child'
        ];

        let bestContent = null;
        let maxLength = 0;

        for (const selector of messageSelectors) {
            const messages = document.querySelectorAll(selector);
            if (messages.length > 0) {
                const lastMessage = messages[messages.length - 1];

                // Use htmlToMarkdown instead of innerText
                const content = htmlToMarkdown(lastMessage);

                // Keep the longest valid content
                if (content.length > maxLength && content.length > 20) {
                    maxLength = content.length;
                    bestContent = content;
                }
            }
        }

        if (bestContent) {
            return bestContent;
        }

        console.log('[AI Panel] Kimi could not find response');
        return null;
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
        console.log('[AI Panel] Kimi: Starting new conversation via navigation');
        await sleep(100);
        window.location.href = 'https://kimi.moonshot.cn/';
        return true;
    }

    console.log('[AI Panel] Kimi content script loaded');
})();
