import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { sendEmail } from "../utils/mailer.js";
import { formatFullName } from "../utils/formatName.js";
import { logInternalError, sendServerError } from "../utils/safeError.js";
import { getCookieOptions } from "../utils/sessionSecurity.js";

export const sendDeviceOtp = async (user, deviceId, deviceName) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await User.updateById(user.id, {
    deviceOtp: crypto.createHash("sha256").update(otp).digest("hex"),
    deviceOtpExpires: new Date(Date.now() + 10 * 60 * 1000),
    pendingDevice: {
      deviceId,
      deviceName: deviceName || "Unknown device",
    },
  });

  await sendEmail({
    toEmail: user.email,
    toName: formatFullName(user.name) || "Admin",
    subject: "New Admin Device Verification",
    htmlContent: `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #f9f9f9; text-align: center;">
    <h1 style="color: #1a73e8; font-size: 26px; margin-bottom: 10px;">Hello ${formatFullName(user.name) || "Admin"},</h1>
    <p style="font-size: 16px; color: #555; margin-bottom: 30px;">
      A login from a new device was detected for your admin account. Your verification code is:
    </p>
    <div style="display: inline-block; padding: 15px 25px; font-size: 24px; font-weight: bold; color: #ffffff; background: linear-gradient(135deg, #1a73e8, #4285f4); border-radius: 8px; letter-spacing: 2px; margin-bottom: 20px;">
      ${otp}
    </div>
    <p style="font-size: 14px; color: #999; margin-bottom: 30px;">
      This code will expire in 10 minutes.
    </p>
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    <p style="font-size: 12px; color: #bbb;">
      If you did not attempt this login, please secure your account immediately.
    </p>
    <p style="font-size: 12px; color: #bbb;">
      &copy; ${new Date().getFullYear()} GibiGebeta. All rights reserved.
    </p>
  </div>
  `,
  });

  return jwt.sign({ email: user.email, deviceId }, process.env.JWT_SECRET, {
    expiresIn: "10m",
  });
};

export const verifyAdminDeviceOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const token = req.cookies.deviceOtpToken;

    if (!token) {
      return res.status(400).json({
        message: "OTP session expired. Request a new one.",
      });
    }

    const { email, deviceId } = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findOne({ email, role: "admin" }, { includePassword: true });
    if (!user || !user.deviceOtp || !user.pendingDevice) {
      return res.status(400).json({
        message: "We could not verify this device. Please request a new code.",
      });
    }

    if (user.pendingDevice.deviceId !== deviceId) {
      return res.status(400).json({
        message: "We could not verify this device. Please sign in again.",
      });
    }

    if (new Date(user.deviceOtpExpires) < new Date()) {
      return res.status(400).json({
        message: "Your verification code has expired. Please request a new one.",
      });
    }

    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
    if (hashedOtp !== user.deviceOtp) {
      return res.status(400).json({
        message: "The verification code is not correct. Please try again.",
      });
    }

    await User.updateById(user.id, {
      trustedDevices: [
        ...(user.trustedDevices || []),
        {
          ...user.pendingDevice,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      ],
      deviceOtp: null,
      deviceOtpExpires: null,
      pendingDevice: null,
    });

    res.clearCookie("deviceOtpToken");
    res.json({ message: "Device verified. Please login again." });
  } catch {
    sendServerError(
      res,
      "We could not verify the device right now. Please try again.",
    );
  }
};

export const resendDeviceOtp = async (req, res) => {
  try {
    const token = req.cookies.deviceOtpToken;
    if (!token) {
      return res.status(400).json({
        message: "OTP session expired. Request a new one.",
      });
    }

    const { email, deviceId } = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findOne({ email, role: "admin" }, { includePassword: true });
    if (!user || !user.pendingDevice) {
      return res.status(400).json({
        message:
          "We could not find a pending device verification. Please sign in again.",
      });
    }

    if (user.pendingDevice.deviceId !== deviceId) {
      return res.status(400).json({
        message: "We could not verify this device. Please sign in again.",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await User.updateById(user.id, {
      deviceOtp: crypto.createHash("sha256").update(otp).digest("hex"),
      deviceOtpExpires: new Date(Date.now() + 10 * 60 * 1000),
    });

    await sendEmail({
      toEmail: user.email,
      toName: formatFullName(user.name) || "Admin",
      subject: "Resend: Admin Device OTP",
      htmlContent: `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #f9f9f9; text-align: center;">
    <h1 style="color: #1a73e8; font-size: 26px; margin-bottom: 10px;">Hello ${formatFullName(user.name) || "Admin"},</h1>
    <p style="font-size: 16px; color: #555; margin-bottom: 30px;">
      You requested to resend your device verification OTP. Use the code below to verify this device:
    </p>
    <div style="display: inline-block; padding: 15px 25px; font-size: 24px; font-weight: bold; color: #ffffff; background: linear-gradient(135deg, #1a73e8, #4285f4); border-radius: 8px; letter-spacing: 2px; margin-bottom: 20px;">
      ${otp}
    </div>
    <p style="font-size: 14px; color: #999; margin-bottom: 30px;">
      This OTP will expire in 10 minutes.
    </p>
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    <p style="font-size: 12px; color: #bbb;">
      If you did not request this OTP, please secure your account immediately.
    </p>
    <p style="font-size: 12px; color: #bbb;">
      &copy; ${new Date().getFullYear()} GibiGebeta. All rights reserved.
    </p>
  </div>
  `,
    });

    const newToken = jwt.sign({ email, deviceId }, process.env.JWT_SECRET, {
      expiresIn: "10m",
    });

    res.cookie("deviceOtpToken", newToken, getCookieOptions(10 * 60 * 1000));

    res.json({ message: "OTP resent successfully" });
  } catch (error) {
    logInternalError("resend-device-otp", error);

    if (
      error?.code === "EMAIL_NETWORK_ERROR" ||
      error?.code === "EMAIL_DELIVERY_FAILED"
    ) {
      return res.status(503).json({ message: error.message });
    }

    sendServerError(
      res,
      "We could not resend the verification code. Please try again.",
    );
  }
};
