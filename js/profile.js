const profileForm = document.getElementById("profileForm");
const phoneInput = document.getElementById("phone");
const emailInput = document.getElementById("email");
const fullNameInput = document.getElementById("fullName");
const usernameInput = document.getElementById("username");
const aboutInput = document.getElementById("about");
const profilePhotoInput = document.getElementById("profilePhoto");
const photoPreview = document.getElementById("photoPreview");
const emailError = document.getElementById("emailError");
const fullNameError = document.getElementById("fullNameError");
const usernameError = document.getElementById("usernameError");
const saveButton = profileForm.querySelector('button[type="submit"]');
let profilePhotoData = "";
let usernameTimer = null;
let usernameAvailable = false;

if (!ChatFlow.getToken()) window.location.href = "login.html";

async function loadProfile() {
    try {
        const { user } = await ChatFlow.api("/users/me");
        phoneInput.value = user.phone || "";
        emailInput.value = user.email || "";
        fullNameInput.value = user.fullName || "";
        usernameInput.value = user.username || "";
        aboutInput.value = user.about || "";
        profilePhotoData = user.photo || "";
        photoPreview.textContent = ChatFlow.getInitials(user.fullName || "User");
        if (profilePhotoData) {
            photoPreview.style.backgroundImage = `url(${profilePhotoData})`;
            photoPreview.textContent = "";
        }
    } catch (error) {
        alert(error.message);
        window.location.href = "login.html";
    }
}

function validateEmail() {
    const email = emailInput.value.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        emailError.textContent = "Enter a valid email address.";
        return false;
    }
    emailError.textContent = "";
    return true;
}

function validateFullName() {
    if (fullNameInput.value.trim().length < 3) {
        fullNameError.textContent = "Full name must contain at least 3 characters.";
        return false;
    }
    fullNameError.textContent = "";
    return true;
}

function validateUsername() {
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(usernameInput.value.trim())) {
        usernameError.textContent = "Use 3-20 letters, numbers or underscores only.";
        return false;
    }
    usernameError.textContent = "";
    return true;
}

fullNameInput.addEventListener("input", () => {
    if (!profilePhotoData) photoPreview.textContent = ChatFlow.getInitials(fullNameInput.value || "User");
});

usernameInput.addEventListener("input", () => {
    usernameInput.value = usernameInput.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
    clearTimeout(usernameTimer); usernameAvailable = false;
    const value = usernameInput.value.trim();
    if (!/^[a-z0-9_]{3,20}$/.test(value)) { usernameError.textContent = "Use 3-20 letters, numbers or underscores only."; usernameError.className = "error-message"; return; }
    usernameError.textContent = "Checking availability..."; usernameError.className = "status-message";
    usernameTimer = setTimeout(async () => {
      try { const data = await ChatFlow.api(`/users/username-availability?username=${encodeURIComponent(value)}`); usernameAvailable = data.available; usernameError.textContent = data.available ? "✓ Username available" : "✕ Username already taken"; usernameError.className = data.available ? "success-message" : "error-message"; }
      catch (error) { usernameError.textContent = error.message; usernameError.className = "error-message"; }
    }, 450);
});

profilePhotoInput.addEventListener("change", function () {
    const selectedFile = profilePhotoInput.files[0];
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/") || selectedFile.size > 5 * 1024 * 1024) {
        alert("Select a JPG or PNG image smaller than 5 MB.");
        profilePhotoInput.value = "";
        return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
        profilePhotoData = String(reader.result || "");
        photoPreview.style.backgroundImage = `url(${profilePhotoData})`;
        photoPreview.textContent = "";
    });
    reader.readAsDataURL(selectedFile);
});

profileForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!validateEmail() || !validateFullName() || !validateUsername()) return;

    ChatFlow.setButtonLoading(saveButton, true, "Saving...");

    try {
        const { user } = await ChatFlow.api("/users/me", {
            method: "PUT",
            body: JSON.stringify({
                email: emailInput.value.trim(),
                fullName: fullNameInput.value.trim(),
                username: usernameInput.value.trim(),
                about: aboutInput.value.trim(),
                photo: profilePhotoData || null
            })
        });
        ChatFlow.saveStoredJSON("chatFlowProfile", user);
        window.location.href = "chats.html";
    } catch (error) {
        usernameError.textContent = error.message;
        ChatFlow.setButtonLoading(saveButton, false);
    }
});

loadProfile();
