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

    // CSS tối giản chỉ cho nút toggle và khung popup
    const styles = `
      :root { 
        --theme-color: ${config.themeColor || "#0abfbc"}; 
      }
      #chat-toggle-btn { 
        position: fixed; 
        bottom: 20px; 
        right: 20px; 
        width: 60px; 
        height: 60px; 
        border: none; 
        border-radius: 50%; 
        box-shadow: 0 4px 12px rgba(0,0,0,0.3); 
        cursor: pointer; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        z-index: 9999; 
        opacity: 0; 
        visibility: hidden; 
        transition: opacity 0.5s; 
        background-color: var(--theme-color); 
      }
      img#chat-toggle-image { 
        width: 40px; 
        height: 100%; 
        border-radius: 50%; 
        object-fit: contain; 
      }
      #chat-messages-container { 
        position: fixed; 
        bottom: 90px; 
        right: 47px; 
        width: 350px; 
        height: 520px; 
        background: rgba(255,255,255,0.8); 
        border: 1px solid #ccc; 
        border-radius: 12px; 
        box-shadow: 0 4px 12px rgba(0,0,0,0.15); 
        display: none; 
        z-index: 9998; 
      }
      @media (max-width:767px) {
        #chat-messages-container { 
          width: 100% !important; 
          height: 100% !important; 
          bottom: 0 !important; 
          right: 0 !important; 
          left: 0 !important; 
          border-radius: 0 !important; 
          box-shadow: none !important; 
          z-index: 9999; 
        }        
      }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    // HTML chỉ giữ nút toggle và khung popup
    const chatContainer = document.createElement("div");
    chatContainer.innerHTML = `
      <button id="chat-toggle-btn">
        <img id="chat-toggle-image" src="${
          config.imgChat ||
          "https://img.icons8.com/ios-filled/50/ffffff/speech-bubble.png"
        }" alt="Nút Chat" />
      </button>
      <div id="chat-messages-container"></div>
    `;
    document.body.appendChild(chatContainer);

    const chatToggleBtn = document.getElementById("chat-toggle-btn");
    const chatMessagesContainer = document.getElementById("chat-messages-container");

    // Logic hiển thị/ẩn popup
    function fadeIn(element) {
      element.style.display = "block";
      setTimeout(() => {
        element.style.opacity = "1";
        element.style.visibility = "visible";
      }, 10);
    }

    function fadeOut(element) {
      element.style.opacity = "0";
      element.style.visibility = "hidden";
      setTimeout(() => {
        element.style.display = "none";
      }, 300);
    }

    // Thiết lập logic cho nút toggle
    function setupToggleLogic() {
      setTimeout(() => {
        chatToggleBtn.style.opacity = "1";
        chatToggleBtn.style.visibility = "visible";
      }, 2500);

      chatToggleBtn.addEventListener("click", () => {
        if (chatMessagesContainer.style.display === "block") {
          fadeOut(chatMessagesContainer);
          localStorage.setItem("chat_popup_open", "false");
        } else {
          fadeIn(chatMessagesContainer);
          localStorage.setItem("chat_popup_open", "true");
        }
      });
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", setupToggleLogic);
    } else {
      setupToggleLogic();
    }

    // Khôi phục vị trí chat
    function restoreChatPosition() {
      const position = config.position || "bottom-right";
      const isTop = position.includes("top");
      const isLeft = position.includes("left");

      chatMessagesContainer.style.top = isTop ? "90px" : "auto";
      chatMessagesContainer.style.bottom = isTop ? "auto" : "90px";
      chatToggleBtn.style.top = isTop ? "20px" : "auto";
      chatToggleBtn.style.bottom = isTop ? "auto" : "20px";
      chatMessagesContainer.style.left = isLeft ? "47px" : "auto";
      chatMessagesContainer.style.right = isLeft ? "auto" : "47px";
      chatToggleBtn.style.left = isLeft ? "20px" : "auto";
      chatToggleBtn.style.right = isLeft ? "auto" : "20px";
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", restoreChatPosition);
    } else {
      restoreChatPosition();
    }

    // Kiểm tra trạng thái mở popup
    if (localStorage.getItem("chat_popup_open") === "true") {
      fadeIn(chatMessagesContainer);
      restoreChatPosition();
    }
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