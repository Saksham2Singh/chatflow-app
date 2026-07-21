const $ = (id) => document.getElementById(id);
const currentUserAvatar = $("currentUserAvatar"), currentUserName = $("currentUserName"), currentUserAbout = $("currentUserAbout");
const chatSearch = $("chatSearch"), chatList = $("chatList"), emptyState = $("emptyState");
const newChatButton = $("newChatButton"), emptyNewChatButton = $("emptyNewChatButton"), contactModal = $("contactModal");
const pickContactsButton = $("pickContactsButton"), contactNameInput = $("contactName"), contactPhoneInput = $("contactPhone");
const checkContactButton = $("checkContactButton"), contactError = $("contactError"), contactResult = $("contactResult"), logoutButton = $("logoutButton");
let conversations = [], socket = null;
if (!ChatFlow.getToken()) window.location.replace("login.html");

function formatTime(value) {
    if (!value) return "";
    const date = new Date(value), today = new Date();
    if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return date.toLocaleDateString([], { day: "2-digit", month: "short" });
}
function statusMark(message) {
    if (!message || message.senderId !== ChatFlow.getStoredJSON("chatFlowProfile", {}).id) return "";
    return message.readAt ? '<span class="message-check read">✓✓</span>' : message.deliveredAt ? '<span class="message-check">✓✓</span>' : '<span class="message-check">✓</span>';
}
function renderConversations(value = "") {
    const q = value.trim().toLowerCase();
    const visible = conversations.filter(({ contact }) => contact && [contact.fullName, contact.phone, contact.username].some(v => String(v || "").toLowerCase().includes(q)));
    chatList.innerHTML = "";
    emptyState.classList.toggle("hidden", conversations.length > 0);
    visible.forEach((conversation) => {
        const c = conversation.contact; if (!c) return;
        const item = document.createElement("button"); item.type = "button"; item.className = "chat-item";
        const avatarStyle = c.photo ? `style="background-image:url('${ChatFlow.escapeHTML(c.photo)}')"` : "";
        item.innerHTML = `<span class="contact-avatar-small" ${avatarStyle}>${c.photo ? "" : ChatFlow.getInitials(c.fullName)}</span>
          <span class="chat-item-content"><span class="chat-item-top"><strong>${ChatFlow.escapeHTML(c.fullName || c.phone)}</strong><time>${formatTime(conversation.lastMessage?.createdAt || conversation.updatedAt)}</time></span>
          <span class="chat-item-bottom"><p>${statusMark(conversation.lastMessage)} ${ChatFlow.escapeHTML(conversation.lastMessage?.text || c.about || c.phone)}</p>${conversation.unreadCount ? `<b class="unread-badge">${conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}</b>` : ""}</span></span>`;
        const pin=document.createElement("button");pin.type="button";pin.className="pin-chat-button";pin.textContent=conversation.pinnedAt?"★":"☆";pin.title=conversation.pinnedAt?"Unpin chat":"Pin chat";pin.onclick=async(e)=>{e.stopPropagation();try{await ChatFlow.api(`/conversations/${conversation.id}/pin`,{method:"PATCH",body:JSON.stringify({pinned:!conversation.pinnedAt})});loadPage(true);}catch(err){alert(err.message);}};item.appendChild(pin);item.addEventListener("click", () => { ChatFlow.saveStoredJSON("chatFlowActiveConversation", conversation); window.location.href = "chat.html"; });
        chatList.appendChild(item);
    });
    if (q && !visible.length) chatList.innerHTML = '<p class="no-search-result">No matching chats found.</p>';
}
async function loadPage(silent = false) {
    try {
        const [{ user }, data] = await Promise.all([ChatFlow.api("/users/me"), ChatFlow.api("/conversations")]);
        if (!user.profileComplete) return void window.location.replace("profile.html");
        ChatFlow.saveStoredJSON("chatFlowProfile", user);
        currentUserName.textContent = user.fullName || "Your Chats"; currentUserAbout.textContent = user.about;
        currentUserAvatar.textContent = ChatFlow.getInitials(user.fullName);
        if (user.photo) { currentUserAvatar.style.backgroundImage = `url(${user.photo})`; currentUserAvatar.textContent = ""; }
        conversations = data.conversations; renderConversations(chatSearch.value);
    } catch (error) { if (!silent) alert(error.message); if (!ChatFlow.getToken()) window.location.replace("login.html"); }
}
function connectRealtime() {
    if (typeof io !== "function" || socket) return;
    socket = io({ auth: { token: ChatFlow.getToken() } });
    socket.on("message:new", () => loadPage(true)); socket.on("messages:read", () => loadPage(true)); socket.on("presence:update", () => loadPage(true));
}
function openModal() { contactModal.classList.add("open"); contactModal.setAttribute("aria-hidden", "false"); contactNameInput.focus(); }
function closeModal() { contactModal.classList.remove("open"); contactModal.setAttribute("aria-hidden", "true"); contactError.textContent = ""; contactResult.innerHTML = ""; }
function renderFoundUsers(users, fallbackName) {
    if (!users.length) {
        const phone = ChatFlow.normalizeIndianPhone(contactPhoneInput.value.trim());
        contactResult.innerHTML = `<div class="result-card"><strong>${ChatFlow.escapeHTML(fallbackName || "Contact")}</strong><p>This contact is not registered on ChatFlow.</p><button type="button" id="inviteContactButton" class="primary-action">Invite to ChatFlow</button></div>`;
        $("inviteContactButton").onclick = async () => {
            const text = "Join me on ChatFlow. Download and create your account to start chatting.";
            if (navigator.share) { try { await navigator.share({ title: "ChatFlow Invitation", text }); return; } catch {} }
            const digits = phone.replace(/\D/g, "");
            window.open(`https://wa.me/${digits}?text=${encodeURIComponent(text)}`, "_blank");
        };
        return;
    }
    contactResult.innerHTML = users.map((user, i) => `<div class="result-card"><strong>${ChatFlow.escapeHTML(user.fullName || user.phone)}</strong><p>${ChatFlow.escapeHTML(user.username ? "@" + user.username : user.phone)}</p><button type="button" class="primary-action start-result" data-index="${i}">Start Chat</button></div>`).join("");
    contactResult.querySelectorAll(".start-result").forEach(btn => btn.addEventListener("click", async () => {
        const user = users[Number(btn.dataset.index)]; ChatFlow.setButtonLoading(btn, true, "Opening...");
        try { const { conversation } = await ChatFlow.api("/conversations/direct", { method: "POST", body: JSON.stringify({ userId: user.id }) }); ChatFlow.saveStoredJSON("chatFlowActiveConversation", conversation); window.location.href = "chat.html"; }
        catch (e) { contactError.textContent = e.message; ChatFlow.setButtonLoading(btn, false); }
    }));
}
async function findContact() {
    const name = contactNameInput.value.trim(), raw = contactPhoneInput.value.trim();
    const query = raw ? ChatFlow.normalizeIndianPhone(raw) : name;
    if (query.length < 3) return void (contactError.textContent = "Enter a name, username or mobile number.");
    contactError.textContent = ""; ChatFlow.setButtonLoading(checkContactButton, true, "Checking...");
    try { const data = await ChatFlow.api(`/users/search?q=${encodeURIComponent(query)}`); renderFoundUsers(data.users || (data.user ? [data.user] : []), name); }
    catch (e) { contactError.textContent = e.message; } finally { ChatFlow.setButtonLoading(checkContactButton, false); }
}
async function pickPhoneContacts() {
    if (!("contacts" in navigator)) return void (contactResult.innerHTML = '<div class="result-card"><p>Contact picker is supported mainly on Android. Search manually here.</p></div>');
    try { const selected = await navigator.contacts.select(["name", "tel"], { multiple: false }); if (selected[0]) { contactNameInput.value = selected[0].name?.[0] || ""; contactPhoneInput.value = (selected[0].tel?.[0] || "").replace(/\D/g, "").slice(-10); } } catch {}
}
newChatButton.addEventListener("click", openModal); emptyNewChatButton.addEventListener("click", openModal);
contactModal.querySelectorAll("[data-close-modal]").forEach(el => el.addEventListener("click", closeModal));
pickContactsButton.addEventListener("click", pickPhoneContacts); checkContactButton.addEventListener("click", findContact);
contactPhoneInput.addEventListener("input", () => contactPhoneInput.value = contactPhoneInput.value.replace(/\D/g, "").slice(0, 10));
chatSearch.addEventListener("input", () => renderConversations(chatSearch.value));
logoutButton.addEventListener("click", () => { if (confirm("Logout from ChatFlow?")) { localStorage.clear(); window.location.replace("login.html"); } });
loadPage(); connectRealtime();
