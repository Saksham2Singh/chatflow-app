import { Router } from "express";
import { createToken } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";

const router = Router();
const indianPhonePattern = /^\+91[6-9]\d{9}$/;

router.post("/request-otp", async (request, response, next) => {
  try {
    const phone = String(request.body.phone || "").trim();

    if (!indianPhonePattern.test(phone)) {
      response.status(400).json({ message: "Enter a valid Indian mobile number." });
      return;
    }

    const code = process.env.DEMO_OTP || "123456";

    await prisma.otpCode.create({
      data: {
        phone,
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      }
    });

    response.json({
      message: "OTP generated successfully.",
      ...(process.env.NODE_ENV !== "production" ? { demoOtp: code } : {})
    });
  } catch (error) {
    next(error);
  }
});

router.post("/verify-otp", async (request, response, next) => {
  try {
    const phone = String(request.body.phone || "").trim();
    const code = String(request.body.code || "").trim();

    const otp = await prisma.otpCode.findFirst({
      where: {
        phone,
        code,
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!otp) {
      response.status(400).json({ message: "OTP is incorrect or expired." });
      return;
    }

    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { usedAt: new Date() }
    });

    const user = await prisma.user.upsert({
      where: { phone },
      update: {},
      create: { phone }
    });

    await prisma.loginEvent.create({
      data: {
        userId: user.id,
        ipAddress: request.ip || null,
        userAgent: request.get("user-agent") || null
      }
    });

    const token = createToken({ userId: user.id, phone: user.phone, role: "user" });

    response.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        fullName: user.fullName,
        username: user.username,
        about: user.about,
        photo: user.photo,
        profileComplete: user.profileComplete
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
