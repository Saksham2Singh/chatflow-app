const otpForm = document.getElementById("otpForm");
const otpInputs = Array.from(document.querySelectorAll(".otp-input"));
const otpError = document.getElementById("otpError");
const otpDescription = document.getElementById("otpDescription");
const resendButton = document.getElementById("resendButton");
const verifyButton = otpForm.querySelector('button[type="submit"]');
const pendingPhone = localStorage.getItem("chatFlowPendingPhone");

if (!pendingPhone) {
    window.location.href = "login.html";
}

otpDescription.textContent = `We sent a code to ${pendingPhone || "your mobile number"}.`;

const demoNote = document.querySelector(".demo-note strong");
if (demoNote) {
    demoNote.textContent = localStorage.getItem("chatFlowDemoOtp") || "123456";
}

otpInputs.forEach(function (input, index) {
    input.addEventListener("input", function () {
        input.value = input.value.replace(/\D/g, "").slice(0, 1);
        if (input.value && otpInputs[index + 1]) otpInputs[index + 1].focus();
        otpError.textContent = "";
    });

    input.addEventListener("keydown", function (event) {
        if (event.key === "Backspace" && !input.value && otpInputs[index - 1]) {
            otpInputs[index - 1].focus();
        }
    });

    input.addEventListener("paste", function (event) {
        const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (digits.length !== 6) return;
        event.preventDefault();
        digits.split("").forEach((digit, digitIndex) => {
            otpInputs[digitIndex].value = digit;
        });
        otpInputs[5].focus();
    });
});

otpForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const code = otpInputs.map((input) => input.value).join("");

    if (code.length !== 6) {
        otpError.textContent = "Please enter all 6 digits.";
        return;
    }

    ChatFlow.setButtonLoading(verifyButton, true, "Verifying...");

    try {
        const data = await ChatFlow.api("/auth/verify-otp", {
            method: "POST",
            body: JSON.stringify({ phone: pendingPhone, code })
        });

        localStorage.setItem("chatFlowToken", data.token);
        ChatFlow.saveStoredJSON("chatFlowProfile", data.user);
        localStorage.removeItem("chatFlowDemoOtp");
        window.location.href = data.user.profileComplete ? "chats.html" : "profile.html";
    } catch (error) {
        otpError.textContent = error.message;
        ChatFlow.setButtonLoading(verifyButton, false);
    }
});

resendButton.addEventListener("click", async function () {
    ChatFlow.setButtonLoading(resendButton, true, "Sending...");

    try {
        const data = await ChatFlow.api("/auth/request-otp", {
            method: "POST",
            body: JSON.stringify({ phone: pendingPhone })
        });
        if (data.demoOtp) localStorage.setItem("chatFlowDemoOtp", data.demoOtp);
        resendButton.dataset.originalText = "Resend code";
        ChatFlow.setButtonLoading(resendButton, false);
        resendButton.textContent = "Code sent again";
    } catch (error) {
        otpError.textContent = error.message;
        ChatFlow.setButtonLoading(resendButton, false);
    }
});

otpInputs[0].focus();
