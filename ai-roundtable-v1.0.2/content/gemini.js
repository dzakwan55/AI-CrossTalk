// AI Panel - Gemini Content Script

(function () {
  'use strict';

  const AI_TYPE = 'gemini';

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
    // Gemini uses a rich text editor (contenteditable or textarea)
    const inputSelectors = [
      '.ql-editor',
      'div[contenteditable="true"]',
      'rich-textarea textarea',
      'textarea[aria-label*="prompt"]',
      'textarea[placeholder*="Enter"]',
      '.input-area textarea',
      'textarea'
    ];

    let inputEl = null;
    for (const selector of inputSelectors) {
      inputEl = document.querySelector(selector);
      if (inputEl && isVisible(inputEl)) break;
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
      // Contenteditable div (Quill editor or similar)
      inputEl.innerHTML = `<p>${escapeHtml(text)}</p>`;
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Small delay to let the UI process
    await sleep(150);

    // Find and click the send button
    const sendButton = findSendButton();
    if (!sendButton) {
      throw new Error('Could not find send button');
    }

    // Wait for button to be enabled
    await waitForButtonEnabled(sendButton);

    sendButton.click();

    // Start capturing response after sending
    console.log('[AI Panel] Gemini message sent, starting response capture...');
    waitForStreamingComplete();

    return true;
  }

  function findSendButton() {
    // Gemini's send button
    const selectors = [
      'button[aria-label*="Send"]',
      'button[aria-label*="submit"]',
      'button.send-button',
      'button[data-test-id="send-button"]',
      '.input-area button',
      'button mat-icon[data-mat-icon-name="send"]'
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && isVisible(el)) {
        return el.closest('button') || el;
      }
    }

    // Fallback: find button with send-related icon or near input
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      // Check for send icon or arrow
      if (btn.querySelector('mat-icon, svg') && isVisible(btn)) {
        const text = btn.textContent.toLowerCase();
        const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
        if (text.includes('send') || ariaLabel.includes('send') ||
          text.includes('submit') || ariaLabel.includes('submit')) {
          return btn;
        }
      }
    }

    // Last resort: find button at bottom of page
    for (const btn of buttons) {
      const rect = btn.getBoundingClientRect();
      if (rect.bottom > window.innerHeight - 150 && isVisible(btn)) {
        if (btn.querySelector('svg, mat-icon')) {
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
        console.log('[AI Panel] Gemini button is enabled, proceeding with click');
        return;
      }
      await sleep(50);
    }
    console.log('[AI Panel] Gemini button still disabled after wait, clicking anyway');
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
      const mainContent = document.querySelector('main, .conversation-container') || document.body;
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
  let isCapturing = false;  // Prevent multiple captures
  let captureStartTime = 0;

  function checkForResponse(node) {
    // Skip if already capturing
    if (isCapturing) return;

    // Check if this node or its children contain a model response
    const isResponse = node.matches?.('.model-response-text, message-content') ||
      node.querySelector?.('.model-response-text, message-content') ||
      node.classList?.contains('model-response-text');

    if (isResponse) {
      console.log('[AI Panel] Gemini detected new response, waiting for completion...');
      waitForStreamingComplete();
    }
  }

  async function waitForStreamingComplete() {
    // Prevent multiple simultaneous captures
    if (isCapturing) {
      // Check if stuck for more than 5 minutes, reset if so
      if (Date.now() - captureStartTime > 300000) {
        console.log('[AI Panel] Gemini capture stuck, resetting isCapturing flag');
        isCapturing = false;
      } else {
        console.log('[AI Panel] Gemini already capturing, skipping...');
        return;
      }
    }
    isCapturing = true;
    captureStartTime = Date.now();

    let previousContent = '';
    let stableCount = 0;
    const maxWait = 600000;  // 10 minutes - AI responses can be very long
    const checkInterval = 500;
    const stableThreshold = 4;  // 2 seconds of stable content

    const startTime = Date.now();

    try {
      while (Date.now() - startTime < maxWait) {
        if (!isContextValid()) {
          console.log('[AI Panel] Context invalidated, stopping capture');
          return;
        }

        await sleep(checkInterval);

        const currentContent = getLatestResponse() || '';

        if (currentContent === previousContent && currentContent.length > 0) {
          stableCount++;
          if (stableCount >= stableThreshold) {
            if (currentContent !== lastCapturedContent) {
              lastCapturedContent = currentContent;
              safeSendMessage({
                type: 'RESPONSE_CAPTURED',
                aiType: AI_TYPE,
                content: currentContent
              });
              console.log('[AI Panel] Gemini response captured, length:', currentContent.length);
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
    // Gemini uses .model-response-text for AI responses
    const messages = document.querySelectorAll('.model-response-text');

    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const html = lastMessage.innerHTML.trim();
      console.log('[AI Panel] Gemini response found, length:', html.length);
      return htmlToMarkdown(html);
    }

    // Fallback to message-content
    const fallback = document.querySelectorAll('message-content');
    if (fallback.length > 0) {
      const lastMessage = fallback[fallback.length - 1];
      const html = lastMessage.innerHTML.trim();
      console.log('[AI Panel] Gemini response (fallback), length:', html.length);
      return htmlToMarkdown(html);
    }

    console.log('[AI Panel] Gemini: no response found');
    return null;
  }

  // Utility functions
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function htmlToMarkdown(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;

    function processNode(node, context = { listDepth: 0, orderedIndex: 0 }) {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
      }

      const tag = node.tagName.toLowerCase();

      switch (tag) {
        case 'h1':
          return `# ${getTextContent(node)}\n\n`;
        case 'h2':
          return `## ${getTextContent(node)}\n\n`;
        case 'h3':
          return `### ${getTextContent(node)}\n\n`;
        case 'h4':
          return `#### ${getTextContent(node)}\n\n`;
        case 'h5':
          return `##### ${getTextContent(node)}\n\n`;
        case 'h6':
          return `###### ${getTextContent(node)}\n\n`;
        case 'strong':
        case 'b':
          return `**${processChildren(node, context)}**`;
        case 'em':
        case 'i':
          return `*${processChildren(node, context)}*`;
        case 'code':
          if (node.parentElement?.tagName.toLowerCase() !== 'pre') {
            return `\`${node.textContent}\``;
          }
          return node.textContent;
        case 'pre': {
          const codeEl = node.querySelector('code');
          const codeText = codeEl ? codeEl.textContent : node.textContent;
          let lang = '';
          const langClass = (codeEl?.className || node.className || '').match(/language-(\w+)/);
          if (langClass) lang = langClass[1];
          return `\n\`\`\`${lang}\n${codeText.trim()}\n\`\`\`\n\n`;
        }
        case 'p':
          return `${processChildren(node, context)}\n\n`;
        case 'br':
          return '\n';
        case 'hr':
          return '---\n\n';
        case 'ul': {
          const items = Array.from(node.children)
            .filter(c => c.tagName.toLowerCase() === 'li')
            .map(li => processListItem(li, false, 0, context.listDepth))
            .join('');
          return items + '\n';
        }
        case 'ol': {
          const items = Array.from(node.children)
            .filter(c => c.tagName.toLowerCase() === 'li')
            .map((li, idx) => processListItem(li, true, idx + 1, context.listDepth))
            .join('');
          return items + '\n';
        }
        case 'li':
          return processChildren(node, context);
        case 'a': {
          const href = node.getAttribute('href') || '';
          return `[${processChildren(node, context)}](${href})`;
        }
        case 'blockquote': {
          const content = processChildren(node, context).trim().split('\n').map(line => `> ${line}`).join('\n');
          return `${content}\n\n`;
        }
        case 'table':
          return processTable(node) + '\n';
        case 'thead':
        case 'tbody':
        case 'tfoot':
        case 'tr':
        case 'th':
        case 'td':
          return processChildren(node, context);
        default:
          return processChildren(node, context);
      }
    }

    function processChildren(node, context) {
      return Array.from(node.childNodes).map(child => processNode(child, context)).join('');
    }

    function getTextContent(node) {
      return processChildren(node, { listDepth: 0, orderedIndex: 0 }).trim();
    }

    function processListItem(li, isOrdered, index, depth) {
      const indent = '  '.repeat(depth);
      const prefix = isOrdered ? `${index}. ` : '- ';

      let content = '';
      let hasNestedList = false;

      for (const child of li.childNodes) {
        const tag = child.tagName?.toLowerCase();
        if (tag === 'ul' || tag === 'ol') {
          hasNestedList = true;
          const nestedItems = Array.from(child.children)
            .filter(c => c.tagName.toLowerCase() === 'li')
            .map((nestedLi, idx) => processListItem(nestedLi, tag === 'ol', idx + 1, depth + 1))
            .join('');
          content += '\n' + nestedItems;
        } else if (child.nodeType === Node.TEXT_NODE) {
          content += child.textContent;
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          content += processNode(child, { listDepth: depth, orderedIndex: 0 });
        }
      }

      content = content.trim().replace(/\n\n+/g, '\n');

      if (hasNestedList) {
        const lines = content.split('\n');
        const firstLine = lines[0];
        const rest = lines.slice(1).join('\n');
        return `${indent}${prefix}${firstLine}\n${rest}`;
      }

      return `${indent}${prefix}${content}\n`;
    }

    function processTable(table) {
      const rows = table.querySelectorAll('tr');
      if (rows.length === 0) return '';

      let result = '';
      let isFirstRow = true;

      for (const row of rows) {
        const cells = row.querySelectorAll('th, td');
        const cellContents = Array.from(cells).map(cell =>
          processChildren(cell, { listDepth: 0, orderedIndex: 0 }).trim().replace(/\|/g, '\\|').replace(/\n/g, ' ')
        );

        result += '| ' + cellContents.join(' | ') + ' |\n';

        if (isFirstRow) {
          result += '| ' + cellContents.map(() => '---').join(' | ') + ' |\n';
          isFirstRow = false;
        }
      }

      return result;
    }

    let markdown = '';
    Array.from(temp.childNodes).forEach(node => {
      markdown += processNode(node, { listDepth: 0, orderedIndex: 0 });
    });

    markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();

    return markdown;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0';
  }

  async function newConversation() {
    // Direct navigation is most reliable
    console.log('[AI Panel] Gemini: Starting new conversation via navigation');
    await sleep(100);
    window.location.href = 'https://gemini.google.com/app';
    return true;
  }

  console.log('[AI Panel] Gemini content script loaded');
})();
