import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendDeviceOtp } from "../controllers/device.controller.js";
import Campus from "../models/campus.model.js";

const getCookieOptions = (duration = 24 * 60 * 60 * 1000) => ({
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: duration,
  priority: "high",
});

export const login = async (req, res) => {
  try {
    const { email, password, deviceId, deviceName } = req.body;

    if (!email || !password)
      return res.status(400).json({
        message: "Please enter both your email and password.",
      });

    let user = await User.findOne({ email }).select("+password");
    let role = "admin";

    if (!user) {
      user = await Campus.findOne({ email }).select("+password");
      role = "campus";
    }

    if (!user)
      return res.status(401).json({ message: "Invalid email or password." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid email or password." });

    if (role === "admin") {
      user.trustedDevices = user.trustedDevices || [];
      if (user.trustedDevices.length) {
        user.trustedDevices = user.trustedDevices.filter(
          (d) => d.expiresAt && d.expiresAt > new Date(),
        );
        await user.save();
      }

      if (!deviceId)
        return res.status(400).json({
          message: "Device information missing. Please refresh and try again.",
        });

      const isTrusted = user.trustedDevices.some(
        (d) => d.deviceId === deviceId,
      );
      if (!isTrusted) {
        const deviceOtpToken = await sendDeviceOtp(user, deviceId, deviceName);
        res.cookie(
          "deviceOtpToken",
          deviceOtpToken,
          getCookieOptions(10 * 60 * 1000),
        );
        return res.status(202).json({
          message: "New device detected. OTP sent to your email.",
          requireDeviceOtp: true,
        });
      }
    }

    const token = jwt.sign({ id: user._id, role }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    const cookieName = role === "admin" ? "accessToken" : "campusToken";
    res.cookie(cookieName, token, getCookieOptions());

    if (role === "campus") {
      user.isOnline = true;
      user.lastActiveAt = new Date();
      await user.save();
    }

    const userData = user._doc || user.toObject();
    delete userData.password;

    res.json({
      message: `Successfully logged in as ${role}`,
      user: userData,
      role,
    });
  } catch {
    res
      .status(500)
      .json({ message: "Something went wrong. Please try again." });
  }
};

export const logout = (req, res) => {
  const options = { ...getCookieOptions(), maxAge: 0 };
  res
    .clearCookie("accessToken", options)
    .clearCookie("campusToken", options)
    .json({ message: "Logged out" });
};
