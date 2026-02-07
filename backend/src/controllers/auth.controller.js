import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendDeviceOtp } from "../controllers/device.controller.js";

export const login = async (req, res) => {
  try {
    const { email, password, deviceId, deviceName } = req.body;

    if (!email || !password)
      return res.status(400).json({
        message: "Please enter both your email and password to log in.",
      });

    const user = await User.findOne({ email }).select("+password");
    if (!user)
      return res
        .status(400)
        .json({ message: "The email or password you entered is incorrect." });

    user.trustedDevices = user.trustedDevices || [];

    if (user.role === "admin" && user.trustedDevices.length) {
      user.trustedDevices = user.trustedDevices.filter(
        (d) => d.expiresAt && d.expiresAt > new Date(),
      );
      await user.save();
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res
        .status(400)
        .json({ message: "The email or password you entered is incorrect." });

    if (user.role === "admin") {
      if (!deviceId)
        return res.status(400).json({
          message: "Device information missing. Please refresh and try again.",
        });

      const isTrusted = user.trustedDevices.some(
        (d) => d.deviceId === deviceId,
      );

      if (!isTrusted) {
        const deviceOtpToken = await sendDeviceOtp(user, deviceId, deviceName);

        res.cookie("deviceOtpToken", deviceOtpToken, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: 10 * 60 * 1000,
        });

        return res.status(202).json({
          message: "New device detected. OTP sent to your email.",
          requireDeviceOtp: true,
        });
      }
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.cookie("accessToken", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    });

    const { password: pwd, ...userData } = user._doc;
    res.json({
      message: "You’ve successfully logged in.",
      user: userData,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Something went wrong. Please try again later." });
  }
};

export const logout = (req, res) => {
  res
    .clearCookie("accessToken", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    })
    .json({ message: "Logged out" });
};
