(function (global, factory) {
  typeof exports === "object" && typeof module !== "undefined"
    ? factory(exports)
    : typeof define === "function" && define.amd
    ? define(["exports"], factory)
    : ((global =
        typeof globalThis !== "undefined" ? globalThis : global || self),
      factory((global.MyChat = {})));
})(this, function (exports) {
  "use strict";

  let isBotActive = true;
  let ws = null;

  function createChatWidget(config) {
    if (document.getElementById("chat-toggle-btn")) {
      console.log("Widget đã tồn tại, không tạo lại.");
      return;
    }

    const styles = `
      :root { 
        --theme-color: ${config.themeColor || "#0abfbc"}; 
        --user-message-bg: ${config.themeColorUser || "#F1F0F0"};
        --text-color: ${config.textColor || "#ffffff"};
        --admin-bg: #ff9800;
        --admin-text: #ffffff;
      }
      body { font-family: Arial, sans-serif; }
      #chat-toggle-btn { position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px; border: none; border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.3); cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 9999; opacity: 0; visibility: hidden; transition: opacity 0.5s; padding: 0; margin: 0; background-color: var(--theme-color); user-select: none; }
      #chat-toggle-btn::after { content: ""; position: absolute; bottom: 2px; right: 5px; width: 12px; height: 12px; min-width: 12px; min-height: 12px; border-radius: 50%; background-color: #37b361; border: 1px solid #fff; }
      img#chat-toggle-image { width: 40px; height: 100%; border-radius: 50%; object-fit: contain; }
      #chat-messages-container { position: fixed; bottom: 90px; right: 47px; width: 350px; height: 520px; background: rgba(255,255,255,0.8); border: 1px solid #ccc; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: none; flex-direction: column; overflow: hidden; z-index: 9998; }
      #chat-header { background: var(--theme-color); color: var(--text-color); padding: 10px; font-weight: bold; font-size: 18px; display: flex; justify-content: space-between; align-items: center; }
      .avatar_chat { display: flex; align-items: center; -webkit-user-select: none; -ms-user-select: none; pointer-events: none; user-select: none; }
      #chat-header img.avatar { width: 40px; height: 40px; border-radius: 50%; margin-right: 10px; user-select: none; }
      #chat-messages { flex: 1; padding: 10px; overflow-y: auto; background: white; display: flex; flex-direction: column; position: relative; scrollbar-width: thin; scrollbar-color: #92929e transparent; }
      #chat-messages::-webkit-scrollbar { width: 6px; }
      #chat-messages::-webkit-scrollbar-track { background: transparent; }
      #chat-messages::-webkit-scrollbar-thumb { background-color: #92929e; border-radius: 6px; transition: background-color 0.2s linear, width 0.2s ease-in-out; }
      #chat-messages:hover::-webkit-scrollbar-thumb { background-color: #999; width: 11px; }
      .message-container { width: 100%; display: flex; flex-direction: column; align-items: center; margin: 5px 0; }
      .message-bubble { padding: 12px; border-radius: 15px; max-width: 61%; font-size: 14px; white-space: pre-wrap; }
      .bot-message div { line-height: 1.5; color: var(--text-color); }
      .user-message { align-self: flex-end; text-align: right; background-color: var(--user-message-bg); color: #000000; }
      .bot-message { align-self: flex-start; text-align: left; background-color: var(--theme-color); color: var(--text-color); }
      .admin-message { align-self: flex-start; text-align: left; background-color: var(--admin-bg); color: var(--admin-text); }
      #chat-input { display: flex; border-top: 1px solid #ddd; padding: 10px; background: white; }
      #chat-input input { flex: 1; border: 1px solid transparent; padding: 8px; font-size: 14px; border-radius: 6px; transition: all 0.3s ease}
      #chat-input input:focus { outline: none; border: 1px solid var(--theme-color); box-shadow: 0 0 4px rgba(0,176,255,0.3); }
      #chat-input button { background-color: transparent; border: none; padding: 0 15px; margin-left: 5px; cursor: pointer; }
      #chat-input button svg { width: 20px; height: 20px; fill: var(--theme-color); }
      .close-btn{ background: none; border: none; font-size: 18px; color: var(--text-color); cursor: pointer; margin-left: 10px; }
      .chat-greeting { display: none; position: fixed; bottom: 93px; right: 55px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 14px 18px; max-width: 320px; font-family: sans-serif; z-index: 1000; font-size: 14px; line-height: 1.5 }
      .chat-greeting::after { content: ""; position: absolute; bottom: 0px; right: 0px; transform: rotate(90deg); width: 20px; height: 20px; background-color: white; z-index: 999; }
      .chat-greeting-line { margin-bottom: 10px; font-size: 14px; font-weight: 600; }
      .chat-greeting-link { color: var(--theme-color) !important; }
      .timestamp { font-size: 10px; color: gray; margin-bottom: 4px; opacity: 0; text-align: center; width: 100%; transition: opacity 0.3s ease; }
      .message-container:hover .timestamp { opacity: 1; }
      .scroll_btn { display: none; position: absolute; bottom: 85px; right: 50%; transform: translateX(50%); border: 2px solid var(--theme-color); background-color: white; border-radius: 50%; width: 30px; height: 30px; z-index: 10; cursor: pointer; }
      .bot-message-wrapper { display: flex; align-items: flex-start; gap: 6px; }
      .bot_chat_box-message-avatar { width: 30px; height: 30px; border-radius: 50% !important; flex-shrink: 0; border: 2px solid var(--theme-color) !important; background: var(--theme-color); }
      .typing-indicator { display: flex; gap: 4px; align-items: center; margin: 5px 0; padding: 10px 14px; background-color: var(--theme-color); border-radius: 15px; max-width: 50px; }
      .typing-indicator span { display: inline-block; width: 6px; height: 6px; background-color: var(--text-color); border-radius: 50%; animation: typing 1s infinite ease-in-out; }
      .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
      .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
      @keyframes typing { 0%, 80%, 100% { transform: scale(0.8); opacity: 0.3; } 40% { transform: scale(1); opacity: 1; } }
      #chat-menu { display: none; position: absolute; top: 50px; right: 10px; background: white; border-radius: 8px; box-shadow: 0 0 8px rgba(0,0,0,0.2); z-index: 9999; padding: 10px; width: 200px; }
      #chat-menu button { display: block; width: 100%; border: none; background: none; padding: 10px; text-align: left; cursor: pointer; border-radius: 8px; color: var(--text-color); }
      #chat-menu button:hover { background: #f0f0f0; border-radius: 8px; }
      @media (max-width:767px) {
        #chat-messages-container { width: 100% !important; height: 100% !important; bottom: 0 !important; right: 0 !important; left: 0 !important; border-radius: 0 !important; box-shadow: none !important; z-index: 9999; }        
      }
    .rating-stars {
    display: flex;
    justify-content: center;
    margin-top: 8px;
    gap: 8px;
  }
  .rating-stars .star {
    font-size: 24px;
    color: #ccc;
    transition: transform 0.2s ease, color 0.3s;
  }
  .rating-stars .star:hover,
  .rating-stars .star:hover ~ .star {
    color: #ffc107;
    cursor: pointer;
    transform: scale(1.2);
  }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    const chatContainer = document.createElement("div");
    chatContainer.innerHTML = `
      <button id="chat-toggle-btn"><img id="chat-toggle-image" src="${
        config.imgChat ||
        "https://img.icons8.com/ios-filled/50/ffffff/speech-bubble.png"
      }" alt="Nút Chat" /></button>
      <div id="chat-greeting-box" class="chat-greeting">
        <div class="chat-greeting-line">${
          config.welcomeMessage ||
          "Xin chào! Tôi là trợ lý AI. Tôi có thể giúp gì cho bạn?"
        }</div>
        ${
          config.linkContact
            ? `<div class="chat-greeting-line2">Không ai trả lời vui lòng để lại tin nhắn tại: <a href="${config.linkContact}" target="_blank" class="chat-greeting-link">Liên hệ</a></div>`
            : ""
        }
      </div>
      <div id="chat-messages-container">
        <div id="chat-header">
          <div class="avatar_chat">
            ${
              config.avatar
                ? `<img src="${config.avatar}" alt="Hình đại diện" class="avatar" id="chat-avatar" />`
                : '<img src="https://img.icons8.com/ios-filled/50/ffffff/artificial-intelligence.png" alt="Hình đại diện" class="avatar" id="chat-avatar" />'
            }
            <span id="chat-title">${config.title || "Trợ lý AI"}</span>
          </div>
          <div class="wrapper-btn">            
            <button id="chat-close-btn" class="close-btn">✕</button>           
          </div>
        </div>
        <div id="chat-messages"></div>
        <div style="padding: 5px; font-size: 12px; background: white; color: rgb(79 79 79); display: flex; justify-content: center;">
          <img src="https://vaway.vn/uploads/logo-vaway.svg" alt="vaway" style="height: 12px; margin-right: 4px" />
          <span>Tạo bởi <a href="https://vaway.vn" target="_blank">vaway.vn</a></span>
        </div>
        <div id="chat-input">
          <input type="text" id="chat-text-messages" placeholder="Nhập tin nhắn..." onkeydown="if (event.keyCode === 13) MyChat.sendMessageFromMessages()">
          <button onclick="MyChat.sendMessageFromMessages()">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
          </button>
        </div>
        <button id="scroll-bottom-btn" class="scroll_btn">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 16l-4-4h8l-4 4zm0 2l4-4H8l4 4z"/></svg>
        </button>
      </div>
    `;
    document.body.appendChild(chatContainer);

    let userIsAtBottom = true;
    const chatToggleBtn = document.getElementById("chat-toggle-btn");
    const chatToggleImage = document.getElementById("chat-toggle-image");
    chatToggleImage.src =
      config.imgChat ||
      "https://img.icons8.com/ios-filled/50/ffffff/speech-bubble.png";
    const chatGreetingBox = document.getElementById("chat-greeting-box");
    const chatMessagesContainer = document.getElementById(
      "chat-messages-container"
    );
    const chatTextMessages = document.getElementById("chat-text-messages");
    const chatAvatar = document.getElementById("chat-avatar");
    const chatTitle = document.getElementById("chat-title");
    const contactLinkElement = document.querySelector(".chat-greeting-link");
    const scrollBtn = document.getElementById("scroll-bottom-btn");
    const chatMessages = document.getElementById("chat-messages");

    function isNearBottom() {
      const threshold = 50;
      return (
        chatMessages.scrollHeight -
          (chatMessages.scrollTop + chatMessages.clientHeight) <=
        threshold
      );
    }

    function appendAndMaybeScroll(node) {
      const atBottom = isNearBottom();
      chatMessages.appendChild(node);
      if (atBottom) {
        requestAnimationFrame(() => {
          chatMessages.scrollTop = chatMessages.scrollHeight;
        });
      }
    }

    chatAvatar.src =
      (config.avatar?.startsWith("/")
        ? `${config.serverUrl}${config.avatar}`
        : config.avatar) ||
      "https://img.icons8.com/ios-filled/50/ffffff/artificial-intelligence.png";

    if (contactLinkElement) contactLinkElement.href = config.linkContact || "";

    let isMoreMode = false;
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;

    chatMessagesContainer.style.cursor = "move";

    chatMessagesContainer.onmousedown = (e) => {
      isDragging = true;
      const rect = chatMessagesContainer.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
    };

    document.onmouseup = () => (isDragging = false);

    document.onmousemove = (e) => {
      if (isDragging) {
        let newLeft = e.clientX - offsetX;
        let newTop = e.clientY - offsetY;
        const rect = chatMessagesContainer.getBoundingClientRect();
        const maxLeft = window.innerWidth - rect.width;
        const maxTop = window.innerHeight - rect.height;
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));
        chatMessagesContainer.style.position = "fixed";
        chatMessagesContainer.style.left = newLeft + "px";
        chatMessagesContainer.style.top = newTop + "px";
        chatMessagesContainer.style.right = "auto";
        chatMessagesContainer.style.bottom = "auto";
        localStorage.setItem(
          "chat_custom_position",
          JSON.stringify({ left: newLeft, top: newTop })
        );
      }
    };

    async function logVisitStats() {
      const domain =
        window.location.hostname + window.location.pathname.replace(/\/$/, "");
      try {
        await fetch(`${config.serverUrl}/log-visit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: getSessionId(),
            domain: domain,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            config_id: config.id_config,
          }),
        });
      } catch (err) {
        console.error("❌ Không thể ghi thống kê truy cập:", err);
      }
    }

    function scrollToBottom() {
      chatMessages.scrollTo({
        top: chatMessages.scrollHeight,
        behavior: "smooth",
      });
    }

    function generateMessageId() {
      return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    function isChatReady() {
      let chatSessionId = localStorage.getItem("chat_session_id");
      if (
        !chatSessionId ||
        typeof chatSessionId !== "string" ||
        chatSessionId.length < 5
      ) {
        chatSessionId = Math.random().toString(36).substring(2);
        localStorage.setItem("chat_session_id", chatSessionId);
      }
      let hasVisited = localStorage.getItem("hasVisited");
      if (!hasVisited) {
        localStorage.setItem("hasVisited", "true");
      }
      return true;
    }

    function getSessionId() {
      let chatSessionId = localStorage.getItem("chat_session_id");
      if (
        !chatSessionId ||
        typeof chatSessionId !== "string" ||
        chatSessionId.length < 5
      ) {
        chatSessionId = Math.random().toString(36).substring(2);
        localStorage.setItem("chat_session_id", chatSessionId);
      }
      return chatSessionId;
    }

    async function loadChatHistory() {
      try {
        const response = await fetch(
          `${
            config.serverUrl || ""
          }/get-history?userId=${getSessionId()}&domain=${encodeURIComponent(
            window.location.hostname +
              window.location.pathname.replace(/\/$/, "")
          )}`,
          { credentials: "omit" }
        );
        if (!response.ok) {
          throw new Error(`Lỗi HTTP: ${response.status}`);
        }
        const data = await response.json();
        chatMessages.innerHTML = "";
        if (!data.success || !data.messages || data.messages.length === 0) {
          showDefaultBotGreeting();
        } else {
          data.messages.forEach((item) =>
            addMessage(item.message, item.sender, item.timestamp, item.id)
          );
        }
        requestAnimationFrame(() => {
          chatMessages.scrollTop = chatMessages.scrollHeight;
        });
      } catch (err) {
        console.error("Lỗi khi tải lịch sử chat:", err);
        chatMessages.innerHTML = "";
        showDefaultBotGreeting();
      }
    }

    function connectWebSocket() {
      if (
        ws &&
        (ws.readyState === WebSocket.OPEN ||
          ws.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }
      const domain = encodeURIComponent(
        window.location.hostname + window.location.pathname.replace(/\/$/, "")
      );
      const protocol = config.serverUrl.startsWith("https") ? "wss" : "ws";
      const wsUrl = `${protocol}://${
        new URL(config.serverUrl).host
      }?userId=${getSessionId()}&domain=${domain}`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("✅ WebSocket kết nối thành công");
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "newMessage") {
          const isAtBottom = isNearBottom();
          addMessage(
            data.message.message,
            data.message.sender,
            data.message.timestamp,
            data.message.id
          );
          if (isAtBottom) {
            requestAnimationFrame(() => {
              chatMessages.scrollTop = chatMessages.scrollHeight;
            });
          }
        } else if (data.type === "botStatus") {
          isBotActive = data.isBotActive;
          console.log("Trạng thái bot cập nhật:", isBotActive);
          if (!isBotActive) {
            chatTitle.textContent = "Admin";
            chatMessagesContainer.style.backgroundColor = "#fff5e6";
            chatAvatar.style.display = "none"; // Ẩn avatar khi admin join
          } else {
            chatTitle.textContent = config.title || "Trợ lý AI";
            chatMessagesContainer.style.backgroundColor =
              "rgba(255,255,255,0.8)";
            chatAvatar.style.display = "block"; // Hiện avatar khi bot hoạt động
          }
        } else if (data.type === "history") {
          chatMessages.innerHTML = "";
          data.messages.forEach((msg) =>
            addMessage(msg.message, msg.sender, msg.timestamp, msg.id)
          );
          requestAnimationFrame(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
          });
        }
      };

      ws.onclose = () => {
        console.log("❌ WebSocket ngắt kết nối, thử kết nối lại sau 1 giây...");
        setTimeout(connectWebSocket, 1000); // Giảm thời gian retry xuống 1 giây
      };

      ws.onerror = (error) => {
        console.error("❌ Lỗi WebSocket:", error);
      };
    }

    window.MyChat = window.MyChat || {};
    window.MyChat.sendMessageFromMessages = async function () {
      const text = chatTextMessages.value.trim();
      if (!text) return;
      const messageId = generateMessageId();
      addMessage(text, "user", new Date().toISOString(), messageId);
      chatTextMessages.value = "";
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "userMessage", message: text }));
      }
      if (!isBotActive) {
        saveHistory("user", text, messageId);
        return;
      }
      try {
        const response = await fetch(config.webhookUrl || "", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            timestamp: Date.now(),
            origin: window.location.origin,
            userAgent: navigator.userAgent,
            sessionId: getSessionId(),
            domain: window.location.hostname,
          }),
          credentials: "omit",
        });
        if (!response.ok) {
          throw new Error(`Lỗi HTTP: ${response.status}`);
        }
        const data = await response.json();
        if (data && data.response) {
          showTypingIndicator();
          const botMessageId = generateMessageId();
          setTimeout(() => {
            removeTypingIndicator();
            addMessage(data.response, "bot", null, botMessageId);
            saveHistory("bot", data.response, botMessageId);
          }, 2000);
          saveHistory("user", text, messageId);
        } else {
          const errorMessageId = generateMessageId();
          addMessage(
            "Xin lỗi, tôi chưa nhận được phản hồi.",
            "bot",
            null,
            errorMessageId
          );
        }
      } catch (err) {
        console.error("Lỗi khi gửi tin nhắn:", err);
        const errorMessageId = generateMessageId();
        addMessage(
          "Lỗi gửi tin nhắn. Vui lòng thử lại.",
          "bot",
          null,
          errorMessageId
        );
      }
    };

    function showTypingIndicator() {
      if (!isBotActive) return;
      const indicator = document.createElement("div");
      indicator.className = "bot-message-wrapper";
      indicator.id = "typing-indicator";
      const avatar = document.createElement("img");
      avatar.className = "bot_chat_box-message-avatar";
      const rawAvatar =
        (window.MyChatConfig && window.MyChatConfig.avatar) || config.avatar;
      avatar.src =
        (rawAvatar?.startsWith("/")
          ? `${config.serverUrl}${rawAvatar}`
          : rawAvatar) ||
        "https://img.icons8.com/ios-filled/50/ffffff/artificial-intelligence.png";

      indicator.appendChild(avatar);
      const bubble = document.createElement("div");
      bubble.className = "typing-indicator";
      bubble.innerHTML = "<span></span><span></span><span></span>";
      indicator.appendChild(bubble);
      appendAndMaybeScroll(indicator);
      requestAnimationFrame(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      });
    }

    function removeTypingIndicator() {
      const indicator = document.getElementById("typing-indicator");
      if (indicator) indicator.remove();
    }

    function addMessage(text, sender, timestamp = null, messageId) {
      const messageContainer = document.createElement("div");
      messageContainer.className = "message-container";
      messageContainer.setAttribute("data-id", messageId);

      const time = document.createElement("div");
      const timeValue = timestamp ? new Date(timestamp) : new Date();
      time.className = "timestamp";
      time.innerText = timeValue.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      messageContainer.appendChild(time);

      const msgBubble = document.createElement("div");
      msgBubble.classList.add("message-bubble");

      if (sender === "user") {
        msgBubble.classList.add("user-message");
      } else if (sender === "bot") {
        msgBubble.classList.add("bot-message");
      } else if (sender === "admin") {
        msgBubble.classList.add("admin-message");
      }

      const content = document.createElement("div");
      content.innerHTML = text.replace(/\n/g, "<br>");
      msgBubble.appendChild(content);
      messageContainer.appendChild(msgBubble);

      const isAtBottom = isNearBottom();
      appendAndMaybeScroll(messageContainer);

      if (isAtBottom) {
        requestAnimationFrame(() => {
          chatMessages.scrollTop = chatMessages.scrollHeight;
        });
      }
    }

    async function saveHistory(sender, message, messageId) {
      try {
        const response = await fetch(`${config.serverUrl || ""}/save-history`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: getSessionId(),
            sender: sender,
            message: message,
            timestamp: new Date().toISOString(),
            id: messageId,
            domain:
              window.location.hostname +
              window.location.pathname.replace(/\/$/, ""),
            config_id: config.id_config,
          }),
          credentials: "omit",
        });
        if (!response.ok) {
          throw new Error(`Lỗi HTTP: ${response.status}`);
        }
      } catch (err) {
        console.error("Lỗi khi lưu lịch sử:", err);
      }
    }

    function fadeIn(element) {
      element.style.display = "flex";
      setTimeout(() => {
        element.style.opacity = "1";
        element.style.visibility = "visible";
        requestAnimationFrame(() => {
          chatMessages.scrollTop = chatMessages.scrollHeight;
        });
      }, 10);
    }

    function fadeOut(element) {
      element.style.opacity = "0";
      element.style.visibility = "hidden";
      setTimeout(() => {
        element.style.display = "none";
      }, 300);
    }

    window.showRatingRequest = function () {
      const box = document.getElementById("chat-greeting-box");
      box.innerHTML = `
    <div class="chat-greeting-line">Bạn đánh giá trải nghiệm với trợ lý AI thế nào?</div>
    <div class="rating-stars">
      ${[1, 2, 3, 4, 5]
        .map(
          (n) =>
            `<span class="star" onclick="window.submitRating(${n})">★</span>`
        )
        .join("")}
    </div>`;
      box.style.display = "block";
    };

    // 3. Hàm gửi đánh giá tới API – cũng GLOBAL
    window.submitRating = async function (rating) {
      const userId = localStorage.getItem("chat_session_id");
      const domain =
        window.location.hostname + window.location.pathname.replace(/\/$/, "");
      const config_id = window.MyChatConfig?.id_config || "";
      const timestamp = new Date().toISOString();

      try {
        const res = await fetch(
          `${window.MyChatConfig?.serverUrl}/save-rating`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId,
              domain,
              config_id,
              rating,
              timestamp,
            }),
          }
        );
        const data = await res.json();

        const box = document.getElementById("chat-greeting-box");
        if (data.success) {
          box.innerHTML =
            "<div class='chat-greeting-line'>Cảm ơn bạn đã đánh giá! ❤️</div>";
          setTimeout(() => {
            box.style.display = "none";
          }, 3000);
          localStorage.setItem("hasRated", "true");
        } else {
          box.innerHTML =
            "<div class='chat-greeting-line'>Không gửi được đánh giá. Thử lại sau!</div>";
        }
      } catch (err) {
        console.error("❌ Lỗi khi gửi đánh giá:", err);
      }
    };

    function setupToggleLogic() {
      setTimeout(() => {
        chatToggleBtn.style.opacity = "1";
        chatToggleBtn.style.visibility = "visible";
      }, 2500);

      let hasInteracted = false;
      const greetingTimeout = setTimeout(() => {
        if (!hasInteracted && chatMessagesContainer.style.display !== "flex") {
          chatGreetingBox.style.display = "block";
        }
      }, 10000);

      chatToggleBtn.addEventListener("click", () => {
        hasInteracted = true;
        chatGreetingBox.style.display = "none";
        clearTimeout(greetingTimeout);
        if (chatMessagesContainer.style.display === "flex") {
          fadeOut(chatMessagesContainer);
          localStorage.setItem("chat_popup_open", "false");
          if (ws) ws.close();
        } else {
          fadeIn(chatMessagesContainer);
          localStorage.setItem("chat_popup_open", "true");
          setTimeout(() => {
            chatTextMessages.focus();
            scrollToBottom();
          }, 100);
          connectWebSocket();
        }
      });

      document.addEventListener("click", (e) => {
        if (
          !chatGreetingBox.contains(e.target) &&
          !chatToggleBtn.contains(e.target)
        ) {
          chatGreetingBox.style.display = "none";
        }
      });
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", setupToggleLogic);
    } else {
      setupToggleLogic();
    }

    chatMessages.addEventListener("scroll", () => {
      const nearBottom =
        chatMessages.scrollTop + chatMessages.clientHeight >=
        chatMessages.scrollHeight - 50;

      userIsAtBottom = nearBottom;

      if (!nearBottom) {
        scrollBtn.style.display = "block";
      } else {
        scrollBtn.style.display = "none";
      }
    });

    scrollBtn.onclick = () => {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    document.getElementById("chat-close-btn").onclick = () => {
      // Ẩn popup như cũ
      fadeOut(chatMessagesContainer);
      localStorage.setItem("chat_popup_open", "false");
      if (ws) ws.close();

      // >>> Thêm logic hiển thị đánh giá sau 3 giây, chỉ 1 lần / user
      const hasRated = localStorage.getItem("hasRated");
      if (!hasRated) {
        setTimeout(() => {
          showRatingRequest(); // hàm khai báo ở bước 2
        }, 3000);
      }
    };

    document
      .querySelectorAll("#chat-menu button")
      .forEach((btn) =>
        btn.addEventListener(
          "click",
          () => (document.getElementById("chat-menu").style.display = "none")
        )
      );

    document.addEventListener("click", (e) => {
      const menu = document.getElementById("chat-menu");
      const toggleBtn = document.getElementById("chat-menu-btn");

      if (!menu) return;

      if (
        !menu.contains(e.target) &&
        (!toggleBtn || !toggleBtn.contains(e.target))
      ) {
        menu.style.display = "none";
      }
    });

    function restoreChatPosition() {
      const position = config.position || "bottom-right";
      const isTop = position.includes("top");
      const isLeft = position.includes("left");

      chatMessagesContainer.style.top = isTop ? "90px" : "auto";
      chatMessagesContainer.style.bottom = isTop ? "auto" : "90px";
      chatToggleBtn.style.top = isTop ? "20px" : "auto";
      chatToggleBtn.style.bottom = isTop ? "auto" : "20px";
      chatGreetingBox.style.top = isTop ? "93px" : "auto";
      chatGreetingBox.style.bottom = isTop ? "auto" : "93px";

      chatMessagesContainer.style.left = isLeft ? "47px" : "auto";
      chatMessagesContainer.style.right = isLeft ? "auto" : "47px";
      chatToggleBtn.style.left = isLeft ? "20px" : "auto";
      chatToggleBtn.style.right = isLeft ? "auto" : "20px";
      chatGreetingBox.style.left = isLeft ? "55px" : "auto";
      chatGreetingBox.style.right = isLeft ? "auto" : "55px";
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", restoreChatPosition);
    } else {
      restoreChatPosition();
    }

    function showDefaultBotGreeting() {
      const existingGreeting = document.querySelector(
        '.message-container[data-id*="msg_"] .bot-message'
      );
      if (existingGreeting) {
        console.log("Lời chào mặc định đã tồn tại, không hiển thị lại.");
        return;
      }

      showTypingIndicator();
      const greeting =
        config.welcomeMessage ||
        "CHÀO! Tôi là một trợ lý AI. Làm thế nào tôi có thể hỗ trợ bạn?";
      const messageId = generateMessageId();
      setTimeout(() => {
        removeTypingIndicator();
        addMessage(greeting, "bot", null, messageId);
        saveHistory("bot", greeting, messageId);
      }, 1500);
    }

    if (localStorage.getItem("chat_popup_open") === "true") {
      fadeIn(chatMessagesContainer);
      restoreChatPosition();
      setTimeout(() => scrollToBottom(), 100);
      connectWebSocket();
    }

    if (isChatReady()) {
      if (config.historyEnabled) {
        loadChatHistory();
      } else {
        showDefaultBotGreeting();
      }
    }
    logVisitStats();
  }

  async function initChat(config) {
    const defaultConfig = {
      webhookUrl: config.webhookUrl || "",
      serverUrl: config.serverUrl || "",
      historyEnabled: config.historyEnabled !== "false",
      themeColor: config.themeColor || "#0abfbc",
      themeColorUser: config.themeColorUser || "#F1F0F0",
      textColor: config.textColor || "#ffffff",
      title: config.title || "Trợ lý AI",
      avatar: config.avatar || "",
      imgChat: config.imgChat || "",
      welcomeMessage: config.welcomeMessage || "",
      linkContact: config.linkContact || "",
      position: config.position || "bottom-right",
      id_config: config.id_config || "",
    };

    let finalConfig = defaultConfig;

    if (defaultConfig.serverUrl && defaultConfig.id_config) {
      try {
        const res = await fetch(
          `${defaultConfig.serverUrl}/get-config-id?id_config=${defaultConfig.id_config}`,
          { credentials: "omit" }
        );
        if (!res.ok) {
          throw new Error(`Lỗi HTTP khi lấy config: ${res.status}`);
        }
        const serverConfig = await res.json();
        finalConfig = { ...defaultConfig, ...serverConfig };
      } catch (err) {
        console.error("Lỗi khi lấy config từ server:", err.message);
      }
    } else {
      console.warn(
        "Thiếu serverUrl hoặc id_config, sử dụng cấu hình mặc định."
      );
    }

    window.MyChatConfig = finalConfig;
    createChatWidget(finalConfig);
  }

  if (document.currentScript instanceof HTMLScriptElement) {
    const script = document.currentScript;
    const idConfig = script.dataset.idConfig;
    if (!idConfig || typeof idConfig !== "string" || idConfig.length < 5) {
      // Fallback: tìm config_id theo domain
      const domain =
        window.location.hostname + window.location.pathname.replace(/\/$/, "");
      fetch(
        `${script.dataset.serverUrl}/get-config-id-by-domain?domain=${domain}`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.config_id) {
            initChat({
              ...extractDataset(script),
              id_config: data.config_id,
            });
          } else {
            console.error("Không tìm thấy config_id theo domain:", domain);
          }
        })
        .catch((err) => {
          console.error("Lỗi khi tra cứu config_id theo domain:", err);
        });
      return;
    }

    function extractDataset(script) {
      return {
        webhookUrl: script.dataset.webhookUrl || "",
        serverUrl: script.dataset.serverUrl || "",
        historyEnabled: script.dataset.historyEnabled,
        themeColor: script.dataset.themeColor,
        themeColorUser: script.dataset.themeColorUser,
        textColor: script.dataset.textColor,
        title: script.dataset.title,
        avatar: script.dataset.avatar,
        imgChat: script.dataset.imgChat,
        welcomeMessage: script.dataset.welcomeMessage,
        linkContact: script.dataset.linkContact,
        position: script.dataset.position,
      };
    }

    initChat({
      webhookUrl: script.dataset.webhookUrl || "",
      serverUrl: script.dataset.serverUrl || "",
      historyEnabled: script.dataset.historyEnabled,
      themeColor: script.dataset.themeColor,
      themeColorUser: script.dataset.themeColorUser,
      textColor: script.dataset.textColor,
      title: script.dataset.title,
      avatar: script.dataset.avatar,
      imgChat: script.dataset.imgChat,
      welcomeMessage: script.dataset.welcomeMessage,
      linkContact: script.dataset.linkContact,
      position: script.dataset.position,
      id_config: idConfig,
    });
  }

  exports.initChat = initChat;
  exports.sendMessageFromMessages = window.MyChat
    ? window.MyChat.sendMessageFromMessages
    : () => {};
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
});
