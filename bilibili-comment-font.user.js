// ==UserScript==
// @name         Bilibili 评论区字体大小调节
// @namespace    https://github.com/WuLinLee/bilibili-comment-font
// @version      99999.999
// @description  aaa
// @author       ai为人类服务
// @match        https://www.bilibili.com/video/*
// @match        https://www.bilibili.com/bangumi/*
// @match        https://www.bilibili.com/read/*
// @match        https://www.bilibili.com/opus/*
// @match        https://t.bilibili.com/*
// @match        https://space.bilibili.com/*
// @match        https://www.bilibili.com/list/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @license      MIT
// @downloadURL  https://raw.githubusercontent.com/WuLinLee/bilibili-comment-font/main/bilibili-comment-font.user.js
// @updateURL    https://raw.githubusercontent.com/WuLinLee/bilibili-comment-font/main/bilibili-comment-font.user.js
// ==/UserScript==

(function () {
    'use strict';

    const DEFAULT_SIZE = 14;
    const MIN_SIZE = 10;
    const MAX_SIZE = 40;
    const STEP = 1;
    const LEGACY_COMMENT_SELECTORS = [
        '.reply-content', '.root-reply-content', '.sub-reply-content',
        '.reply-item .content', '.reply-box-textarea', '.reply-box .textarea',
        'textarea.reply-textarea', '.reply-preview .content'
    ];

    let currentSize = GM_getValue('bili_comment_font_size', DEFAULT_SIZE);
    let panelEl = null;
    let pageObserver = null;
    let commentObserver = null;
    let feedObserver = null;
    let lastUrl = location.href;
    const managedRoots = new Map();
    const observedContainers = new WeakSet();

    function findCustomElements(root, tagName) {
        const found = [];
        const target = tagName.toUpperCase();
        const visited = new Set();

        function walk(node) {
            if (!node || visited.has(node)) return;
            visited.add(node);
            if (node.nodeType === 1 && node.tagName === target) found.push(node);
            const children = node.children || [];
            for (let i = 0; i < children.length; i++) walk(children[i]);
            if (node.shadowRoot) walk(node.shadowRoot);
        }

        if (root && root.nodeType === 11) {
            Array.from(root.children || []).forEach(walk);
        } else {
            walk(root);
        }
        return found;
    }

    function cssForRichText(size) {
        const line = Math.round(size * 1.6);
        return '#contents, #contents * { font-size: ' + size +
            'px !important; line-height: ' + line + 'px !important; }';
    }

    function cssForTextarea(size) {
        const line = Math.round(size * 1.6);
        return '.brt-editor, .brt-placeholder { font-size: ' + size +
            'px !important; line-height: ' + line + 'px !important; }';
    }

    function ensureStyleInShadow(shadowRoot, styleId, css) {
        if (!shadowRoot) return;
        let entry = managedRoots.get(shadowRoot);
        if (!entry || !entry.styleEl || !entry.styleEl.isConnected) {
            let styleEl = shadowRoot.querySelector('#' + styleId);
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = styleId;
                shadowRoot.appendChild(styleEl);
            }
            entry = { styleEl: styleEl };
            managedRoots.set(shadowRoot, entry);
        }
        entry.styleEl.textContent = css;
    }

    function processRichText(el) {
        if (el && el.shadowRoot) {
            ensureStyleInShadow(el.shadowRoot, 'bcfp-rich-text-style', cssForRichText(currentSize));
        }
    }

    function processRichTextarea(el) {
        if (el && el.shadowRoot) {
            ensureStyleInShadow(el.shadowRoot, 'bcfp-textarea-style', cssForTextarea(currentSize));
        }
    }

    function setupContainerObserver(container) {
        if (!container || !container.shadowRoot || observedContainers.has(container)) return;
        observedContainers.add(container);
        let timer = null;
        const observer = new MutationObserver(function (mutations) {
            if (!mutations.some(function (mutation) { return mutation.addedNodes.length > 0; })) return;
            clearTimeout(timer);
            timer = setTimeout(function () { processNestedContainer(container); }, 200);
        });
        observer.observe(container.shadowRoot, { childList: true, subtree: true });
    }

    function processNestedContainer(container) {
        if (!container || !container.shadowRoot) return;
        const root = container.shadowRoot;
        findCustomElements(root, 'bili-rich-text').forEach(processRichText);
        findCustomElements(root, 'bili-comment-rich-textarea').forEach(processRichTextarea);
        [
            'bili-comment-thread-renderer', 'bili-comment-renderer',
            'bili-comment-replies-renderer', 'bili-comment-reply-renderer'
        ].forEach(function (tag) {
            findCustomElements(root, tag).forEach(setupContainerObserver);
        });
    }

    function processCommentSection(biliComments) {
        if (!biliComments || !biliComments.shadowRoot) return;
        const root = biliComments.shadowRoot;
        findCustomElements(root, 'bili-rich-text').forEach(processRichText);
        findCustomElements(root, 'bili-comment-rich-textarea').forEach(processRichTextarea);
        [
            'bili-comment-thread-renderer', 'bili-comment-renderer',
            'bili-comment-replies-renderer', 'bili-comment-reply-renderer'
        ].forEach(function (tag) {
            findCustomElements(root, tag).forEach(setupContainerObserver);
        });
    }

    function applyLegacyFontSize(size) {
        let style = document.getElementById('bili-comment-font-legacy-style');
        if (!style) {
            style = document.createElement('style');
            style.id = 'bili-comment-font-legacy-style';
            document.head.appendChild(style);
        }
        style.textContent = LEGACY_COMMENT_SELECTORS.join(', ') + ' {' +
            'font-size: ' + size + 'px !important;' +
            'line-height: ' + Math.round(size * 1.6) + 'px !important;}' +
            '.reply-box-textarea, textarea.reply-textarea {' +
            'font-size: ' + size + 'px !important;}';
    }

    function updateAllManagedStyles(size) {
        const obsolete = [];
        managedRoots.forEach(function (entry, shadowRoot) {
            if (!shadowRoot.host || !shadowRoot.host.isConnected) {
                obsolete.push(shadowRoot);
                return;
            }
            const isTextarea = shadowRoot.host.tagName === 'BILI-COMMENT-RICH-TEXTAREA';
            if (entry.styleEl && entry.styleEl.isConnected) {
                entry.styleEl.textContent = isTextarea ? cssForTextarea(size) : cssForRichText(size);
            } else {
                obsolete.push(shadowRoot);
            }
        });
        obsolete.forEach(function (root) { managedRoots.delete(root); });
    }

    function updatePanelDisplay(size) {
        if (!panelEl) return;
        const label = panelEl.querySelector('.bcfp-label');
        const slider = panelEl.querySelector('.bcfp-slider');
        const badge = panelEl.querySelector('.bcfp-collapsed-badge');
        if (label) label.textContent = size + 'px';
        if (slider) slider.value = size;
        if (badge) badge.textContent = size;
    }

    function applyFontSize(size) {
        updateAllManagedStyles(size);
        processCommentSection(document.querySelector('bili-comments'));
        applyLegacyFontSize(size);
        updatePanelDisplay(size);
    }

    function setFontSize(size, save) {
        const next = Math.max(MIN_SIZE, Math.min(MAX_SIZE, Math.round(Number(size) || DEFAULT_SIZE)));
        if (next === currentSize) return;
        currentSize = next;
        applyFontSize(currentSize);
        if (save !== false) GM_setValue('bili_comment_font_size', currentSize);
    }

    function increaseFont() { setFontSize(currentSize + STEP); }
    function decreaseFont() { setFontSize(currentSize - STEP); }
    function resetFont() { setFontSize(DEFAULT_SIZE); }

    function expandPanel() {
        if (!panelEl) return;
        panelEl.classList.remove('bcfp-collapsed');
        panelEl.style.bottom = 'auto';
        panelEl.style.right = 'auto';
        const rect = panelEl.getBoundingClientRect();
        let left = rect.left;
        let top = rect.top;
        left = Math.max(10, Math.min(left, window.innerWidth - panelEl.offsetWidth - 10));
        top = Math.max(10, Math.min(top, window.innerHeight - panelEl.offsetHeight - 10));
        panelEl.style.left = left + 'px';
        panelEl.style.top = top + 'px';
    }

    function collapsePanel() {
        if (!panelEl) return;
        panelEl.classList.add('bcfp-collapsed');
        panelEl.style.bottom = '10px';
        panelEl.style.right = '10px';
        panelEl.style.left = 'auto';
        panelEl.style.top = 'auto';
    }

    function makeDraggable(el) {
        const toggle = el.querySelector('.bcfp-toggle-btn');
        const header = el.querySelector('.bcfp-header');
        let dragging = false;
        let moved = false;
        let startX = 0, startY = 0, startLeft = 0, startTop = 0;

        function onStart(event) {
            if (!el.classList.contains('bcfp-collapsed') &&
                (event.target.tagName === 'BUTTON' || event.target.tagName === 'INPUT')) return;
            dragging = true;
            moved = false;
            startX = event.clientX;
            startY = event.clientY;
            const rect = el.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            el.style.bottom = 'auto';
            el.style.right = 'auto';
            el.style.left = startLeft + 'px';
            el.style.top = startTop + 'px';
            el.style.transition = 'none';
            event.preventDefault();
        }

        function onMove(event) {
            if (!dragging) return;
            const dx = event.clientX - startX;
            const dy = event.clientY - startY;
            if (!moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
            moved = true;
            const maxLeft = window.innerWidth - el.offsetWidth - 10;
            const maxTop = window.innerHeight - el.offsetHeight - 10;
            el.style.left = Math.max(10, Math.min(startLeft + dx, maxLeft)) + 'px';
            el.style.top = Math.max(10, Math.min(startTop + dy, maxTop)) + 'px';
        }

        function onEnd() {
            if (!dragging) return;
            dragging = false;
            el.style.transition = '';
            if (!moved && el.classList.contains('bcfp-collapsed')) expandPanel();
        }

        toggle.addEventListener('mousedown', onStart);
        header.addEventListener('mousedown', onStart);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
    }

    function createPanel() {
        if (document.getElementById('bili-comment-font-panel')) {
            panelEl = document.getElementById('bili-comment-font-panel');
            return;
        }
        const panel = document.createElement('div');
        panel.id = 'bili-comment-font-panel';
        panel.className = 'bcfp-collapsed';
        panel.innerHTML =
            '<div class="bcfp-toggle-btn" title="评论字体调节">' +
                '<span class="bcfp-toggle-icon">🔤</span>' +
                '<span class="bcfp-collapsed-badge">' + currentSize + '</span>' +
            '</div>' +
            '<div class="bcfp-body">' +
                '<div class="bcfp-header"><span class="bcfp-title">🔤 评论字体</span>' +
                '<span class="bcfp-label">' + currentSize + 'px</span></div>' +
                '<div class="bcfp-controls">' +
                    '<button class="bcfp-btn bcfp-btn-minus" title="缩小字体">−</button>' +
                    '<input type="range" class="bcfp-slider" min="' + MIN_SIZE + '" max="' + MAX_SIZE +
                    '" value="' + currentSize + '" step="' + STEP + '" title="拖动调节字体大小">' +
                    '<button class="bcfp-btn bcfp-btn-plus" title="放大字体">+</button>' +
                '</div>' +
                '<div class="bcfp-actions"><button class="bcfp-btn-reset">↺ 默认</button>' +
                '<button class="bcfp-btn-collapse">✕ 收起</button></div>' +
            '</div>';

        panel.querySelector('.bcfp-btn-minus').addEventListener('click', decreaseFont);
        panel.querySelector('.bcfp-btn-plus').addEventListener('click', increaseFont);
        panel.querySelector('.bcfp-btn-reset').addEventListener('click', resetFont);
        panel.querySelector('.bcfp-btn-collapse').addEventListener('click', function (event) {
            event.stopPropagation();
            collapsePanel();
        });
        const slider = panel.querySelector('.bcfp-slider');
        slider.addEventListener('input', function () { setFontSize(parseInt(this.value, 10)); });
        slider.addEventListener('wheel', function (event) {
            event.preventDefault();
            setFontSize(currentSize + (event.deltaY < 0 ? STEP : -STEP));
        }, { passive: false });

        document.body.appendChild(panel);
        panelEl = panel;
        makeDraggable(panel);
    }

    function injectStyles() {
        GM_addStyle(
            '#bili-comment-font-panel{position:fixed;bottom:10px;right:10px;z-index:99999;' +
            'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;user-select:none;}' +
            '#bili-comment-font-panel.bcfp-collapsed{width:auto;background:none;border:0;padding:0;box-shadow:none;}' +
            '#bili-comment-font-panel.bcfp-collapsed .bcfp-body{display:none;}' +
            '.bcfp-toggle-btn{display:flex;align-items:center;justify-content:center;gap:2px;width:34px;height:34px;' +
            'background:rgba(255,255,255,.95);backdrop-filter:blur(10px);border:1px solid #ccc;border-radius:50%;' +
            'box-shadow:0 4px 16px rgba(0,0,0,.1);cursor:pointer;position:relative;}' +
            '.bcfp-toggle-icon{font-size:14px;color:#888;filter:grayscale(100%);}' +
            '.bcfp-collapsed-badge{position:absolute;top:-3px;right:-3px;min-width:14px;height:14px;background:#888;' +
            'color:#fff;font-size:8px;font-weight:600;line-height:14px;text-align:center;border-radius:7px;padding:0 3px;}' +
            '#bili-comment-font-panel:not(.bcfp-collapsed) .bcfp-toggle-btn{display:none;}' +
            '#bili-comment-font-panel:not(.bcfp-collapsed){box-sizing:border-box;width:166px;background:rgba(255,255,255,.96);' +
            'backdrop-filter:blur(10px);border:1px solid #ccc;border-radius:10px;padding:8px;box-shadow:0 4px 24px rgba(0,0,0,.1);}' +
            '.bcfp-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;cursor:move;}' +
            '.bcfp-title{font-size:11px;font-weight:600;color:#18191c;}.bcfp-label{font-size:10px;color:#888;' +
            'background:rgba(128,128,128,.12);padding:1px 6px;border-radius:6px;}' +
            '.bcfp-controls{display:flex;align-items:center;gap:4px;margin-bottom:8px;}' +
            '.bcfp-btn{flex-shrink:0;width:22px;height:22px;border:1px solid #ccc;border-radius:6px;' +
            'background:rgba(0,0,0,.04);color:#333;font-size:14px;font-weight:600;cursor:pointer;display:flex;' +
            'align-items:center;justify-content:center;line-height:1;}' +
            '.bcfp-slider{flex:1;min-width:0;height:4px;appearance:none;background:#e3e5e7;border-radius:2px;outline:none;cursor:pointer;}' +
            '.bcfp-slider::-webkit-slider-thumb{appearance:none;width:14px;height:14px;border-radius:50%;background:#888;border:2px solid #fff;}' +
            '.bcfp-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:#888;border:2px solid #fff;}' +
            '.bcfp-actions{display:flex;justify-content:center;gap:6px;}' +
            '.bcfp-btn-reset,.bcfp-btn-collapse{font-size:9px;padding:3px 8px;border:0;border-radius:4px;' +
            'background:rgba(0,0,0,.04);color:#888;cursor:pointer;}' +
            '.dark #bili-comment-font-panel:not(.bcfp-collapsed),[data-theme="dark"] #bili-comment-font-panel:not(.bcfp-collapsed),' +
            'html.dark #bili-comment-font-panel:not(.bcfp-collapsed){background:rgba(40,40,45,.96);border-color:#555;color:#eee;}' +
            '.dark .bcfp-title,[data-theme="dark"] .bcfp-title,html.dark .bcfp-title{color:#eee;}' +
            '.dark .bcfp-btn,[data-theme="dark"] .bcfp-btn,html.dark .bcfp-btn{background:rgba(255,255,255,.1);color:#eee;border-color:#555;}' +
            '@media(max-width:768px){#bili-comment-font-panel:not(.bcfp-collapsed){width:145px;padding:6px;}' +
            '.bcfp-btn{width:20px;height:20px;font-size:12px;}.bcfp-toggle-btn{width:30px;height:30px;}}'
        );
    }

    function setupFeedObserver(biliComments) {
        if (feedObserver) feedObserver.disconnect();
        if (!biliComments || !biliComments.shadowRoot) return;
        const feed = biliComments.shadowRoot.querySelector('#feed');
        if (!feed) return;
        feedObserver = new MutationObserver(function (mutations) {
            if (mutations.some(function (mutation) { return mutation.addedNodes.length > 0; })) {
                setTimeout(function () { processCommentSection(biliComments); }, 250);
            }
        });
        feedObserver.observe(feed, { childList: true, subtree: true });
    }

    function observeComments() {
        if (commentObserver) commentObserver.disconnect();
        commentObserver = new MutationObserver(function () {
            const comments = document.querySelector('bili-comments');
            if (!comments) return;
            processCommentSection(comments);
            setupFeedObserver(comments);
        });
        commentObserver.observe(document.body, { childList: true, subtree: true });
    }

    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', function (event) {
            const active = document.activeElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
            if (event.ctrlKey && event.altKey &&
                (event.key === '=' || event.key === '+' || event.key === 'ArrowUp')) {
                event.preventDefault();
                increaseFont();
            } else if (event.ctrlKey && event.altKey &&
                (event.key === '-' || event.key === 'ArrowDown')) {
                event.preventDefault();
                decreaseFont();
            } else if (event.ctrlKey && event.altKey && event.key === '0') {
                event.preventDefault();
                resetFont();
            }
        });
    }

    function refreshPage() {
        managedRoots.clear();
        if (feedObserver) feedObserver.disconnect();
        applyFontSize(currentSize);
        observeComments();
        const comments = document.querySelector('bili-comments');
        if (comments) {
            processCommentSection(comments);
            setupFeedObserver(comments);
        }
        if (!document.getElementById('bili-comment-font-panel')) createPanel();
    }

    function init() {
        injectStyles();
        createPanel();
        setupKeyboardShortcuts();
        observeComments();
        applyFontSize(currentSize);
        const comments = document.querySelector('bili-comments');
        if (comments) setupFeedObserver(comments);

        pageObserver = new MutationObserver(function () {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                setTimeout(refreshPage, 600);
            }
        });
        pageObserver.observe(document.body, { childList: true, subtree: true });
        console.log('[Bilibili 评论区字体调节] 已启动，当前字体: ' + currentSize +
            'px | 快捷键: Ctrl+Alt+↑/↓ 调节, Ctrl+Alt+0 恢复默认');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();