// AI Panel - ChatGLM (智谱清言) Content Script

(function () {
    'use strict';

    const AI_TYPE = 'chatglm';

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
        // ChatGLM uses textarea or contenteditable for input
        const inputSelectors = [
            'textarea[placeholder*="输入"]',
            'textarea[placeholder*="智谱"]',
            'textarea[placeholder*="问"]',
            'textarea',
            '[contenteditable="true"]'
        ];

        let inputEl = null;
        for (const selector of inputSelectors) {
            inputEl = document.querySelector(selector);
            if (inputEl) {
                console.log('[AI Panel] ChatGLM found input with:', selector);
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

        // Longer delay for ChatGLM
        await sleep(300);

        // Find and click the send button
        const sendButton = findSendButton();
        if (!sendButton) {
            throw new Error('Could not find send button');
        }

        // Try comprehensive event sequence (ChatGLM needs pointer events)
        console.log('[AI Panel] ChatGLM triggering send button...');

        // Pointer events (primary)
        sendButton.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
        await sleep(50);
        sendButton.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));

        // Mouse events (backup)
        sendButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        await sleep(50);
        sendButton.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));

        // Click event
        sendButton.click();

        console.log('[AI Panel] ChatGLM send events dispatched');

        // Start capturing response after sending
        waitForStreamingComplete();

        return true;
    }

    function findSendButton() {
        // ChatGLM's send button is in a div with class 'enter-icon-container' or 'enter'
        const selectors = [
            '.enter-icon-container',              // ChatGLM specific send button container
            'div.enter',                          // Parent container
            'div.enter img.enter_icon',           // The actual icon
            'button[aria-label*="发送"]',
            'button[aria-label*="Send"]',
            'button[type="submit"]',
            'button[class*="send"]'
        ];

        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el && isVisible(el)) {
                console.log('[AI Panel] ChatGLM found send button with selector:', selector);
                // If it's an img, get its parent container that is clickable
                if (el.tagName === 'IMG') {
                    return el.closest('.enter-icon-container') || el.closest('.enter') || el.parentElement;
                }
                return el;
            }
        }

        // Fallback: find any div with 'enter' in class near the bottom
        const enterDivs = document.querySelectorAll('div[class*="enter"]');
        for (const div of enterDivs) {
            if (div.querySelector('img') && isVisible(div)) {
                const rect = div.getBoundingClientRect();
                if (rect.bottom > window.innerHeight - 200) {
                    console.log('[AI Panel] ChatGLM found send button via fallback');
                    return div;
                }
            }
        }

        // Last fallback: any button with svg at the bottom
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
            if (btn.querySelector('svg') && isVisible(btn)) {
                const rect = btn.getBoundingClientRect();
                if (rect.bottom > window.innerHeight - 200) {
                    return btn;
                }
            }
        }

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
                console.log('[AI Panel] ChatGLM button is enabled, proceeding with click');
                return;
            }
            await sleep(50);
        }
        console.log('[AI Panel] ChatGLM button still disabled after wait, clicking anyway');
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
                console.log('[AI Panel] ChatGLM detected new response...');
                waitForStreamingComplete();
                break;
            }
        }
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

    function htmlToMarkdown(element) {
        if (!element) return '';
        const clone = element.cloneNode(true);

        clone.querySelectorAll('button, .copy-btn, .sr-only').forEach(el => el.remove());

        clone.querySelectorAll('pre').forEach(pre => {
            const code = pre.querySelector('code');
            const langClass = code ? code.className : '';
            const langMatch = langClass.match(/language-(\w+)/) || pre.className.match(/language-(\w+)/);
            const lang = langMatch ? langMatch[1] : '';
            const content = code ? code.textContent : pre.textContent;
            pre.textContent = `\n\`\`\`${lang}\n${content}\n\`\`\`\n`;
        });

        clone.querySelectorAll('code').forEach(el => {
            if (el.parentElement.tagName !== 'PRE') {
                el.textContent = `\`${el.textContent}\``;
            }
        });

        clone.querySelectorAll('p, div').forEach(el => {
            el.appendChild(document.createTextNode('\n\n'));
        });

        clone.querySelectorAll('strong, b').forEach(el => el.textContent = `**${el.textContent}**`);
        clone.querySelectorAll('em, i').forEach(el => el.textContent = `*${el.textContent}*`);
        clone.querySelectorAll('li').forEach(el => el.textContent = `- ${el.textContent}\n`);

        return clone.textContent.trim().replace(/\n{3,}/g, '\n\n');
    }

    async function waitForStreamingComplete() {
        if (isCapturing) {
            console.log('[AI Panel] ChatGLM already capturing, skipping...');
            return;
        }
        isCapturing = true;

        let previousContent = '';
        let stableCount = 0;
        const maxWait = 600000;  // 10 minutes
        const checkInterval = 600;  // Slower check
        const stableThreshold = 5;  // 3 seconds of stable content (increased for safety)

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
                            console.log('[AI Panel] ChatGLM response captured, length:', currentContent.length);
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
        const messageSelectors = [
            '[class*="assistant"] [class*="markdown"]',
            '[class*="bot-message"]',
            '[class*="message-content"]',
            '[class*="glm-response"]',
            '.markdown-body'
        ];

        let messages = [];
        for (const selector of messageSelectors) {
            messages = document.querySelectorAll(selector);
            if (messages.length > 0) break;
        }

        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            // Use htmlToMarkdown
            return htmlToMarkdown(lastMessage);
        }

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
        console.log('[AI Panel] ChatGLM: Starting new conversation via navigation');
        await sleep(100);
        window.location.href = 'https://chatglm.cn/main/alltoolsdetail';
        return true;
    }

    console.log('[AI Panel] ChatGLM content script loaded');
})();
