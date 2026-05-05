import User from "../models/user.model.js";
import Campus from "../models/campus.model.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import TempEmailChange from "../models/TempEmailChange.model.js";
import { sendEmail } from "../utils/mailer.js";
import { formatFullName } from "../utils/formatName.js";
import { logInternalError, sendServerError } from "../utils/safeError.js";
import { formatMinutes, getCookieOptions } from "../utils/sessionSecurity.js";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGO_DATA_URL_LENGTH = 250000;
const ALLOWED_LOGO_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
]);

export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "Account not found" });

    res.json({ user });
  } catch {
    res.status(500).json({ message: "Failed to load profile" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "Account not found" });

    const updatedUser = await User.updateById(req.userId, {
      name: name ? formatFullName(name.trim()) : user.name,
    });

    res.json({
      message: "Profile updated successfully",
      user: {
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        logo: updatedUser.logo,
      },
    });
  } catch {
    res.status(400).json({ message: "Profile update failed" });
  }
};

export const updateProfilePhoto = async (req, res) => {
  try {
    const { photoUrl } = req.body;

    if (!photoUrl || typeof photoUrl !== "string") {
      return res.status(400).json({ message: "Photo URL is required" });
    }

    const normalizedPhotoUrl = photoUrl.trim();
    const dataUrlMatch = normalizedPhotoUrl.match(/^data:([^;]+);base64,/i);

    if (!dataUrlMatch) {
      return res.status(400).json({
        message: "Please choose a supported image file.",
      });
    }

    const mimeType = dataUrlMatch[1].toLowerCase();
    if (!ALLOWED_LOGO_MIME_TYPES.has(mimeType)) {
      return res.status(400).json({
        message: "Only JPG, JPEG, PNG, and WEBP images are supported.",
      });
    }

    if (normalizedPhotoUrl.length > MAX_LOGO_DATA_URL_LENGTH) {
      return res.status(400).json({
        message: "The selected image is too large. Please choose a smaller one.",
      });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const logo = {
      url: normalizedPhotoUrl,
    };

    const updatedUser = await User.updateById(req.userId, { logo });

    res.json({
      message: "Profile photo updated",
      photoUrl: logo.url,
      user: updatedUser,
    });
  } catch {
    res.status(500).json({ message: "Photo upload failed" });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Both current and new password are required" });
    }

    const rules = [
      { test: (pw) => pw.length >= 8, message: "At least 8 characters" },
      { test: (pw) => /[A-Z]/.test(pw), message: "One uppercase letter (A-Z)" },
      { test: (pw) => /[a-z]/.test(pw), message: "One lowercase letter (a-z)" },
      { test: (pw) => /\d/.test(pw), message: "One number (0-9)" },
      {
        test: (pw) => /[@$!%*?&]/.test(pw),
        message: "One special character (@$!%*?&)",
      },
    ];

    const failedRules = rules.filter((rule) => !rule.test(newPassword));
    if (failedRules.length > 0) {
      return res.status(400).json({
        message: `New password must include: ${failedRules
          .map((rule) => rule.message)
          .join(", ")}`,
      });
    }

    const user = await User.findById(req.userId, { includePassword: true });
    if (!user) return res.status(404).json({ message: "Account not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Wrong current password" });
    }

    const sameAsCurrent = await bcrypt.compare(newPassword, user.password);
    if (sameAsCurrent) {
      return res.status(400).json({
        message: "New password cannot be the same as current password",
      });
    }

    await User.updateById(req.userId, { password: newPassword });
    res.json({ message: "Password changed successfully" });
  } catch {
    res.status(500).json({ message: "Password change failed" });
  }
};

export const verifyAdminPassword = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.trim() === "") {
      return res.status(400).json({ message: "Password is required" });
    }

    const admin = await User.findById(req.userId, { includePassword: true });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const now = Date.now();

    if (admin.lockUntil && admin.lockUntil > now) {
      const remaining = admin.lockUntil - now;
      return res.status(429).json({
        message: `Too many attempts. Try again after ${formatMinutes(remaining)}.`,
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      const loginAttempts = Number(admin.loginAttempts || 0) + 1;
      const lockUntil = loginAttempts >= MAX_ATTEMPTS ? now + WINDOW_MS : null;

      await User.updateById(req.userId, {
        loginAttempts,
        lockUntil,
      });

      const attemptsLeft = Math.max(0, MAX_ATTEMPTS - loginAttempts);
      return res.status(401).json({
        message:
          attemptsLeft > 0
            ? `Wrong password. ${attemptsLeft} attempt(s) left.`
            : `Too many attempts. Try again after ${formatMinutes(WINDOW_MS)}.`,
      });
    }

    await User.updateById(req.userId, { loginAttempts: 0, lockUntil: null });
    return res.status(200).json({ message: "Password correct" });
  } catch {
    return sendServerError(
      res,
      "We could not verify the password right now. Please try again.",
    );
  }
};

export const requestEmailChangeOTP = async (req, res) => {
  try {
    const { newEmail } = req.body;

    if (!newEmail) {
      return res.status(400).json({ message: "New email is required." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.toLowerCase())) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    if (newEmail.toLowerCase() === user.email.toLowerCase()) {
      return res.status(400).json({
        message: "New email cannot be the same as your current email.",
      });
    }

    const emailUsedByAdmin = await User.findOne({
      email: newEmail.toLowerCase(),
      excludeId: user.id,
      role: "admin",
    });
    if (emailUsedByAdmin) {
      return res
        .status(409)
        .json({ message: "Email already in use by another admin." });
    }

    const emailUsedByCampus = await Campus.findOne({
      email: newEmail.toLowerCase(),
    });
    if (emailUsedByCampus) {
      return res
        .status(409)
        .json({ message: "Email already in use by a campus." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    await TempEmailChange.upsertByUserId(user.id, {
      userId: user.id,
      newEmail: newEmail.toLowerCase(),
      otp: hashedOtp,
      otpExpires: new Date(Date.now() + 10 * 60 * 1000),
      verified: false,
    });

    await sendEmail({
      toEmail: newEmail,
      toName: formatFullName(user.name) || "User",
      subject: "Confirm Your New Email",
      htmlContent: `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #f9f9f9; text-align: center;">
    <h1 style="color: #1a73e8; font-size: 26px; margin-bottom: 10px;">Hello,</h1>
    <p style="font-size: 16px; color: #555; margin-bottom: 30px;">
      Please confirm your new email by entering the OTP below:
    </p>
    <div style="display: inline-block; padding: 15px 25px; font-size: 24px; font-weight: bold; color: #ffffff; background: linear-gradient(135deg, #1a73e8, #4285f4); border-radius: 8px; letter-spacing: 2px; margin-bottom: 20px;">
      ${otp}
    </div>
    <p style="font-size: 14px; color: #999; margin-bottom: 30px;">
      This OTP will expire in 10 minutes.
    </p>
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    <p style="font-size: 12px; color: #bbb;">
      If you did not request this, please ignore this email.
    </p>
    <p style="font-size: 12px; color: #bbb;">
      &copy; ${new Date().getFullYear()} GibiGebeta. All rights reserved.
    </p>
  </div>
  `,
    });

    const otpToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "10m",
    });

    res.cookie("emailOtpToken", otpToken, getCookieOptions(10 * 60 * 1000));

    res.json({ message: "OTP sent to new email address." });
  } catch (error) {
    logInternalError("request-email-change-otp", error);

    if (
      error?.code === "EMAIL_NETWORK_ERROR" ||
      error?.code === "EMAIL_DELIVERY_FAILED"
    ) {
      return res.status(503).json({ message: error.message });
    }

    res.status(500).json({ message: "Failed to send OTP." });
  }
};

export const verifyEmailChangeOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    const token = req.cookies.emailOtpToken;

    if (!token) {
      return res.status(400).json({ message: "OTP session expired." });
    }

    const { userId } = jwt.verify(token, process.env.JWT_SECRET);

    const record = await TempEmailChange.findOne({ userId });
    if (!record) {
      return res.status(400).json({ message: "OTP request not found." });
    }

    if (new Date(record.otpExpires) < new Date()) {
      return res.status(400).json({ message: "OTP expired." });
    }

    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
    if (hashedOtp !== record.otp) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    await User.updateById(userId, { email: record.newEmail });
    await TempEmailChange.deleteById(record.id);

    res.clearCookie("emailOtpToken");
    res.json({ message: "Email updated successfully." });
  } catch {
    res.status(500).json({ message: "Email verification failed." });
  }
};
