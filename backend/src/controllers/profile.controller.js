import User from "../models/user.model.js";
import Campus from "../models/campus.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../config/cloudinary.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import TempEmailChange from "../models/TempEmailChange.model.js";
import { createTransporter } from "../utils/mailer.js";

const adminAttempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

const formatMinutes = (ms) => {
  const minutes = Math.ceil(ms / (60 * 1000));
  return `${minutes} minute${minutes > 1 ? "s" : ""}`;
};

export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("name email role logo");
    if (!user) return res.status(404).json({ message: "Account not found" });

    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: "Failed to load profile" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "Account not found" });

    if (name) user.name = name;

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        logo: user.logo,
      },
    });
  } catch (err) {
    res.status(400).json({ message: "Profile update failed" });
  }
};

export const updateProfilePhoto = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "No image received" });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.logo?.public_id) {
      await cloudinary.uploader.destroy(user.logo.public_id);
    }

    user.logo = {
      url: req.file.path,
      public_id: req.file.filename,
    };
    await user.save();

    await Campus.updateMany(
      { createdBy: req.userId },
      { $set: { logo: user.logo } },
    );

    res.json({ message: "Profile photo updated", photoUrl: user.logo.url });
  } catch (err) {
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
          .map((r) => r.message)
          .join(", ")}`,
      });
    }

    const user = await User.findById(req.userId).select("+password");
    if (!user) return res.status(404).json({ message: "Account not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Wrong current password" });

    const sameAsCurrent = await bcrypt.compare(newPassword, user.password);
    if (sameAsCurrent)
      return res.status(400).json({
        message: "New password cannot be the same as current password",
      });

    user.password = await bcrypt.hash(
      newPassword,
      Number(process.env.SALT_ROUNDS) || 10,
    );
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Password change failed" });
  }
};

export const verifyAdminPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const ip = req.ip;

    if (!password || password.trim() === "") {
      return res.status(400).json({ message: "Password is required" });
    }

    const record = adminAttempts.get(ip);
    const now = Date.now();

    if (record && record.count >= MAX_ATTEMPTS) {
      if (record.resetTime > now) {
        const remaining = record.resetTime - now;
        return res.status(429).json({
          message: `Too many attempts. Try again after ${formatMinutes(
            remaining,
          )}.`,
        });
      } else {
        adminAttempts.delete(ip);
      }
    }

    const admin = await User.findById(req.userId).select("+password");
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      if (!record) {
        adminAttempts.set(ip, {
          count: 1,
          resetTime: now + WINDOW_MS,
        });
      } else {
        record.count += 1;
        if (record.count >= MAX_ATTEMPTS) {
          record.resetTime = now + WINDOW_MS;
        }
        adminAttempts.set(ip, record);
      }

      const attemptsLeft = MAX_ATTEMPTS - (record?.count || 1);
      return res.status(401).json({
        message:
          attemptsLeft > 0
            ? `Wrong password. ${attemptsLeft} attempt(s) left.`
            : `Too many attempts. Try again after ${formatMinutes(
                (record?.resetTime || now + WINDOW_MS) - now,
              )}.`,
      });
    }

    if (record) adminAttempts.delete(ip);

    return res.status(200).json({ message: "Password correct" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const requestEmailChangeOTP = async (req, res) => {
  try {
    const { newEmail } = req.body;

    if (!newEmail)
      return res.status(400).json({ message: "New email is required." });

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
      _id: { $ne: user._id },
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

    await TempEmailChange.findOneAndUpdate(
      { userId: user._id },
      {
        userId: user._id,
        newEmail: newEmail.toLowerCase(),
        otp: hashedOtp,
        otpExpires: new Date(Date.now() + 10 * 60 * 1000),
        verified: false,
      },
      { upsert: true, new: true },
    );

    await createTransporter().sendMail({
      to: newEmail,
      subject: "Confirm your new email",
      html: `<h2>Your OTP is: ${otp}</h2><p>Expires in 10 minutes</p>`,
    });

    const otpToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "10m",
    });

    res.cookie("emailOtpToken", otpToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 10 * 60 * 1000,
    });

    res.json({ message: "OTP sent to new email address." });
  } catch (err) {
    res.status(500).json({ message: "Failed to send OTP." });
  }
};

export const verifyEmailChangeOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    const token = req.cookies.emailOtpToken;

    if (!token)
      return res.status(400).json({ message: "OTP session expired." });

    const { userId } = jwt.verify(token, process.env.JWT_SECRET);

    const record = await TempEmailChange.findOne({ userId });
    if (!record)
      return res.status(400).json({ message: "OTP request not found." });

    if (record.otpExpires < new Date())
      return res.status(400).json({ message: "OTP expired." });

    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    if (hashedOtp !== record.otp)
      return res.status(400).json({ message: "Invalid OTP." });

    await User.findByIdAndUpdate(userId, { email: record.newEmail });

    await record.deleteOne();
    res.clearCookie("emailOtpToken");

    res.json({ message: "Email updated successfully." });
  } catch (err) {
    res.status(500).json({ message: "Email verification failed." });
  }
};
