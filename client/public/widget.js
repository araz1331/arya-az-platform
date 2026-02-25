(function() {
  "use strict";

  var script = document.currentScript;
  if (!script) return;

  var slug = script.getAttribute("data-slug");
  if (!slug) {
    console.error("[Arya Widget] Missing data-slug attribute");
    return;
  }

  var color = script.getAttribute("data-color") || "#2563EB";
  var position = script.getAttribute("data-position") || "right";
  var lang = script.getAttribute("data-lang") || "az";
  var greeting = script.getAttribute("data-greeting") || "";
  var baseUrl = script.src.replace(/\/widget\.js.*$/, "");

  var isOpen = false;
  var container, bubble, iframe, closeBtn, greetingEl;

  function createStyles() {
    var style = document.createElement("style");
    style.textContent = [
      ".arya-widget-container { position: fixed; bottom: 20px; z-index: 2147483647; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }",
      ".arya-widget-container.arya-right { right: 20px; }",
      ".arya-widget-container.arya-left { left: 20px; }",
      ".arya-widget-bubble { width: 60px; height: 60px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(0,0,0,0.25); transition: transform 0.2s ease, box-shadow 0.2s ease; border: none; outline: none; }",
      ".arya-widget-bubble:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(0,0,0,0.3); }",
      ".arya-widget-bubble svg { width: 28px; height: 28px; color: #fff; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }",
      ".arya-widget-iframe-wrap { display: none; position: absolute; bottom: 72px; width: 380px; height: 560px; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,0.2); background: #fff; }",
      ".arya-widget-container.arya-right .arya-widget-iframe-wrap { right: 0; }",
      ".arya-widget-container.arya-left .arya-widget-iframe-wrap { left: 0; }",
      ".arya-widget-iframe-wrap.arya-open { display: block; animation: arya-slide-up 0.25s ease-out; }",
      ".arya-widget-iframe-wrap iframe { width: 100%; height: 100%; border: none; }",
      ".arya-widget-close { position: absolute; top: 8px; right: 8px; width: 28px; height: 28px; border-radius: 50%; background: rgba(0,0,0,0.3); color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; line-height: 1; z-index: 10; transition: background 0.15s; }",
      ".arya-widget-close:hover { background: rgba(0,0,0,0.5); }",
      ".arya-widget-greeting { position: absolute; bottom: 72px; padding: 10px 16px; border-radius: 12px; background: #fff; color: #1e293b; font-size: 14px; line-height: 1.4; box-shadow: 0 4px 16px rgba(0,0,0,0.15); max-width: 260px; word-break: break-word; animation: arya-fade-in 0.3s ease-out; cursor: pointer; }",
      ".arya-widget-container.arya-right .arya-widget-greeting { right: 0; }",
      ".arya-widget-container.arya-left .arya-widget-greeting { left: 0; }",
      ".arya-widget-greeting-close { position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; border-radius: 50%; background: #e2e8f0; color: #64748b; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 12px; line-height: 1; }",
      "@keyframes arya-slide-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }",
      "@keyframes arya-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }",
      "@media (max-width: 480px) { .arya-widget-iframe-wrap { position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100vw !important; height: 100vh !important; border-radius: 0 !important; z-index: 2147483647 !important; } .arya-widget-container { bottom: 12px; } .arya-widget-container.arya-right { right: 12px; } .arya-widget-container.arya-left { left: 12px; } }",
    ].join("\n");
    document.head.appendChild(style);
  }

  function createWidget() {
    container = document.createElement("div");
    container.className = "arya-widget-container arya-" + position;

    var iframeWrap = document.createElement("div");
    iframeWrap.className = "arya-widget-iframe-wrap";

    iframe = document.createElement("iframe");
    iframe.setAttribute("title", "Arya AI Chat");
    iframe.setAttribute("allow", "microphone");
    iframeWrap.appendChild(iframe);

    closeBtn = document.createElement("button");
    closeBtn.className = "arya-widget-close";
    closeBtn.innerHTML = "&#x2715;";
    closeBtn.setAttribute("aria-label", "Close chat");
    closeBtn.onclick = function() { toggleWidget(); };
    iframeWrap.appendChild(closeBtn);

    bubble = document.createElement("button");
    bubble.className = "arya-widget-bubble";
    bubble.style.backgroundColor = color;
    bubble.innerHTML = '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
    bubble.setAttribute("aria-label", "Open chat");
    bubble.onclick = function() { toggleWidget(); };

    container.appendChild(iframeWrap);
    container.appendChild(bubble);
    document.body.appendChild(container);

    if (greeting && !isOpen) {
      setTimeout(function() {
        if (!isOpen) showGreeting();
      }, 3000);
    }
  }

  function showGreeting() {
    if (greetingEl || isOpen) return;
    greetingEl = document.createElement("div");
    greetingEl.className = "arya-widget-greeting";
    greetingEl.textContent = greeting;

    var greetClose = document.createElement("button");
    greetClose.className = "arya-widget-greeting-close";
    greetClose.innerHTML = "&#x2715;";
    greetClose.onclick = function(e) {
      e.stopPropagation();
      hideGreeting();
    };
    greetingEl.appendChild(greetClose);
    greetingEl.onclick = function() {
      hideGreeting();
      toggleWidget();
    };
    container.appendChild(greetingEl);
  }

  function hideGreeting() {
    if (greetingEl) {
      greetingEl.remove();
      greetingEl = null;
    }
  }

  function toggleWidget() {
    isOpen = !isOpen;
    var wrap = container.querySelector(".arya-widget-iframe-wrap");
    if (isOpen) {
      hideGreeting();
      if (!iframe.src) {
        iframe.src = baseUrl + "/embed/" + slug + "?lang=" + lang;
      }
      wrap.classList.add("arya-open");
      bubble.innerHTML = '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    } else {
      wrap.classList.remove("arya-open");
      bubble.innerHTML = '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
    }
  }

  function init() {
    createStyles();
    if (!greeting) {
      fetch(baseUrl + "/api/smart-profile/by-slug/" + slug)
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(data) {
          if (data && data.greeting) greeting = data.greeting;
          createWidget();
        })
        .catch(function() { createWidget(); });
    } else {
      createWidget();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
