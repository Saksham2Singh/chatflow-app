if (!ChatFlow.getToken()) window.location.href = "login.html";

const byId = (id) => document.getElementById(id);
const form = byId("settingsForm");

function formatDate(value) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function applyTheme(theme) {
  localStorage.setItem("chatFlowTheme", theme);
  const dark = theme === "DARK" || (theme === "SYSTEM" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark-theme", dark);
}

async function loadAll() {
  try {
    const [{ user }, data] = await Promise.all([ChatFlow.api("/users/me"), ChatFlow.api("/users/settings")]);
    byId("settingsName").textContent = user.fullName || "ChatFlow user";
    byId("settingsPhone").textContent = user.phone || "";
    byId("settingsEmail").textContent = user.email || "No email added";
    const avatar = byId("settingsAvatar");
    avatar.textContent = ChatFlow.getInitials(user.fullName || "User");
    if (user.photo) { avatar.style.backgroundImage = `url(${user.photo})`; avatar.textContent = ""; }

    Object.entries(data.settings).forEach(([key, value]) => {
      const el = byId(key);
      if (!el) return;
      if (el.type === "checkbox") el.checked = Boolean(value); else el.value = value;
    });
    applyTheme(data.settings.theme);
    byId("totalChats").textContent = data.account.totalChats;
    byId("totalMessages").textContent = data.account.totalMessages;
    byId("joinedDate").textContent = formatDate(data.account.createdAt);
    byId("lastLogin").textContent = formatDate(data.account.lastLoginAt);
    await loadBlocked();
  } catch (error) {
    alert(error.message);
    if (!ChatFlow.getToken()) window.location.href = "login.html";
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    lastSeenPrivacy: byId("lastSeenPrivacy").value,
    photoPrivacy: byId("photoPrivacy").value,
    aboutPrivacy: byId("aboutPrivacy").value,
    readReceipts: byId("readReceipts").checked,
    notifications: byId("notifications").checked,
    theme: byId("theme").value
  };
  try {
    await ChatFlow.api("/users/settings", { method: "PUT", body: JSON.stringify(payload) });
    applyTheme(payload.theme);
    byId("settingsMessage").textContent = "Settings saved successfully.";
  } catch (error) { byId("settingsMessage").textContent = error.message; }
});

byId("blockForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await ChatFlow.api("/users/blocked", { method: "POST", body: JSON.stringify({ phone: ChatFlow.normalizeIndianPhone(byId("blockPhone").value) }) });
    byId("blockPhone").value = "";
    await loadBlocked();
  } catch (error) { alert(error.message); }
});

async function loadBlocked() {
  const { users } = await ChatFlow.api("/users/blocked");
  const container = byId("blockedList");
  if (!users.length) { container.innerHTML = '<p class="muted-line">No blocked users.</p>'; return; }
  container.innerHTML = users.map((user) => `
    <div class="blocked-user-row">
      <div><strong>${ChatFlow.escapeHTML(user.fullName || user.phone)}</strong><small>${ChatFlow.escapeHTML(user.phone)}</small></div>
      <button class="secondary-action unblock-button" data-id="${user.id}" type="button">Unblock</button>
    </div>`).join("");
  container.querySelectorAll(".unblock-button").forEach((button) => button.addEventListener("click", async () => {
    await ChatFlow.api(`/users/blocked/${button.dataset.id}`, { method: "DELETE" });
    await loadBlocked();
  }));
}

byId("logoutButton").addEventListener("click", () => {
  localStorage.removeItem("chatFlowToken");
  localStorage.removeItem("chatFlowProfile");
  window.location.href = "login.html";
});

byId("deleteAccountButton").addEventListener("click", async () => {
  const confirmation = prompt('Type DELETE to permanently delete your account.');
  if (confirmation !== "DELETE") return;
  try {
    await ChatFlow.api("/users/me", { method: "DELETE" });
    localStorage.clear();
    window.location.href = "register.html";
  } catch (error) { alert(error.message); }
});

(async function checkHealth() {
  try {
    const response = await fetch("/api/health");
    if (!response.ok) throw new Error();
    byId("backendStatus").textContent = "Connected";
    byId("backendDot").classList.add("online");
  } catch { byId("backendStatus").textContent = "Offline"; }
})();

loadAll();
