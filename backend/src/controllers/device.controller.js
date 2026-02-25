import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { createTransporter } from "../utils/mailer.js";

export const sendDeviceOtp = async (user, deviceId, deviceName) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  user.deviceOtp = crypto.createHash("sha256").update(otp).digest("hex");
  user.deviceOtpExpires = new Date(Date.now() + 10 * 60 * 1000);

  user.pendingDevice = {
    deviceId,
    deviceName: deviceName || "Unknown device",
  };

  await user.save();

  await createTransporter().sendMail({
    to: user.email,
    subject: "New Admin Device Verification",
    html: `
      <div style="text-align:center">
        <h2>New Admin Login Detected</h2>
        <h1>${otp}</h1>
        <p>Expires in 10 minutes</p>
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

    if (!token)
      return res.status(400).json({
        message: "OTP session expired. Request a new one.",
      });

    const { email, deviceId } = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findOne({ email, role: "admin" });
    if (!user || !user.deviceOtp || !user.pendingDevice)
      return res.status(400).json({ message: "Invalid request" });

    if (user.pendingDevice.deviceId !== deviceId)
      return res.status(400).json({ message: "Device mismatch" });

    if (user.deviceOtpExpires < new Date())
      return res.status(400).json({ message: "OTP expired" });

    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
    if (hashedOtp !== user.deviceOtp)
      return res.status(400).json({ message: "Invalid OTP" });

    user.trustedDevices.push({
      ...user.pendingDevice,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    user.deviceOtp = undefined;
    user.deviceOtpExpires = undefined;
    user.pendingDevice = undefined;

    await user.save();

    res.clearCookie("deviceOtpToken");

    res.json({ message: "Device verified. Please login again." });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const resendDeviceOtp = async (req, res) => {
  try {
    const token = req.cookies.deviceOtpToken;
    if (!token)
      return res.status(400).json({
        message: "OTP session expired. Request a new one.",
      });

    const { email, deviceId } = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findOne({ email, role: "admin" });
    if (!user || !user.pendingDevice)
      return res.status(400).json({ message: "No pending device found" });

    if (user.pendingDevice.deviceId !== deviceId)
      return res.status(400).json({ message: "Device mismatch" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.deviceOtp = crypto.createHash("sha256").update(otp).digest("hex");
    user.deviceOtpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await user.save();

    await createTransporter().sendMail({
      to: user.email,
      subject: "Resend: Admin Device OTP",
      html: `
        <div style="text-align:center">
          <h2>Device Verification</h2>
          <h1>${otp}</h1>
          <p>Expires in 10 minutes</p>
        </div>
      `,
    });

    const newToken = jwt.sign({ email, deviceId }, process.env.JWT_SECRET, {
      expiresIn: "10m",
    });

    res.cookie("deviceOtpToken", newToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 10 * 60 * 1000,
    });

    res.json({ message: "OTP resent successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to resend OTP" });
  }
};
