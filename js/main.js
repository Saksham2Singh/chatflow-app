const API_BASE_URL = "/api";

function getStoredJSON(key, fallbackValue) {
    try {
        const storedValue = localStorage.getItem(key);
        return storedValue ? JSON.parse(storedValue) : fallbackValue;
    } catch (error) {
        console.error(`Unable to read ${key}:`, error);
        return fallbackValue;
    }
}

function saveStoredJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function getInitials(name) {
    return String(name || "User")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("") || "U";
}

function normalizeIndianPhone(phoneNumber) {
    const digits = String(phoneNumber || "").replace(/\D/g, "");

    if (digits.length === 10) {
        return `+91${digits}`;
    }

    if (digits.length === 12 && digits.startsWith("91")) {
        return `+${digits}`;
    }

    return String(phoneNumber || "").trim();
}

function escapeHTML(value) {
    const element = document.createElement("div");
    element.textContent = String(value ?? "");
    return element.innerHTML;
}

function getToken() {
    return localStorage.getItem("chatFlowToken") || "";
}

async function api(path, options = {}) {
    const headers = new Headers(options.headers || {});
    const token = getToken();

    if (!(options.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }

    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        if (response.status === 401) {
            localStorage.removeItem("chatFlowToken");
        }

        throw new Error(data.message || "Something went wrong.");
    }

    return data;
}

function setButtonLoading(button, isLoading, loadingText = "Please wait...") {
    if (!button) return;

    if (isLoading) {
        button.dataset.originalText = button.textContent;
        button.textContent = loadingText;
        button.disabled = true;
        return;
    }

    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
}

window.ChatFlow = {
    api,
    escapeHTML,
    getInitials,
    getStoredJSON,
    getToken,
    normalizeIndianPhone,
    saveStoredJSON,
    setButtonLoading
};

(function applyStoredChatFlowTheme(){
  const theme=localStorage.getItem("chatFlowTheme")||"LIGHT";
  const dark=theme==="DARK"||(theme==="SYSTEM"&&window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark-theme",dark);
})();
