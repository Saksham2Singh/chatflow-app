async function redirectExistingSession() {
    if (!ChatFlow.getToken()) return;

    try {
        const { user } = await ChatFlow.api("/users/me");
        window.location.replace(user.profileComplete ? "chats.html" : "profile.html");
    } catch {
        localStorage.removeItem("chatFlowToken");
    }
}

redirectExistingSession();

const loginForm = document.getElementById("loginForm");
const countryCodeInput = document.getElementById("countryCode");
const phoneNumberInput = document.getElementById("phoneNumber");
const phoneError = document.getElementById("phoneError");
const submitButton = loginForm.querySelector('button[type="submit"]');

function validatePhoneNumber() {
    const phoneNumber = phoneNumberInput.value.replace(/\D/g, "");

    if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
        phoneError.textContent = "Enter a valid 10-digit Indian mobile number.";
        return false;
    }

    phoneError.textContent = "";
    return true;
}

phoneNumberInput.addEventListener("input", function () {
    phoneNumberInput.value = phoneNumberInput.value.replace(/\D/g, "").slice(0, 10);
});

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!validatePhoneNumber()) return;

    const pendingPhone = `${countryCodeInput.value}${phoneNumberInput.value}`;
    ChatFlow.setButtonLoading(submitButton, true, "Sending OTP...");

    try {
        const data = await ChatFlow.api("/auth/request-otp", {
            method: "POST",
            body: JSON.stringify({ phone: pendingPhone })
        });

        localStorage.setItem("chatFlowPendingPhone", pendingPhone);

        if (data.demoOtp) {
            localStorage.setItem("chatFlowDemoOtp", data.demoOtp);
        }

        window.location.href = "otp.html";
    } catch (error) {
        phoneError.textContent = error.message;
        ChatFlow.setButtonLoading(submitButton, false);
    }
});
