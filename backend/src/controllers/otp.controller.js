import jwt from "jsonwebtoken";
import { passwordRegex } from "../utils/validation.js";
import crypto from "crypto";
import User from "../models/user.model.js";
import TempAdmin from "../models/TempAdmin.model.js";
import { createTransporter } from "../utils/mailer.js";
import bcrypt from "bcryptjs";

export const requestOTP = async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!email)
      return res
        .status(400)
        .json({ message: "Please enter your email to receive an OTP." });

    const adminExists = await User.findOne({ email });
    if (adminExists)
      return res.status(403).json({
        message:
          "An admin with this email already exists. Please login instead.",
      });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    await TempAdmin.findOneAndUpdate(
      { email },
      { name, email, otp: hashedOtp, otpExpires, verified: false },
      { upsert: true, new: true },
    );

    await createTransporter().sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP for Admin Registration",
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; text-align: center;">
      <img src="https://example.com/logo.png" alt="Your Company Logo" style="width: 120px; margin-bottom: 20px;" />
      <h2 style="color: #333;">Hello ${name || "Admin"},</h2>
      <p style="font-size: 16px; color: #555;">
        Your One-Time Password (OTP) for admin registration is:
      </p>
      <p style="font-size: 24px; font-weight: bold; color: #1a73e8;">${otp}</p>
      <p style="font-size: 14px; color: #999;">
        This OTP will expire in 10 minutes.
      </p>
      <p style="margin-top: 30px; font-size: 12px; color: #bbb;">
        If you did not request this, please ignore this email.
      </p>
    </div>
  `,
    });

    const otpToken = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: "10m",
    });

    res
      .cookie("otpToken", otpToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 10 * 60 * 1000,
      })
      .json({
        message: "OTP sent to your email. Please check your inbox.",
      });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Something went wrong. Please try again later." });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    const token = req.cookies.otpToken;

    if (!token)
      return res.status(400).json({
        message: "Your OTP session has expired. Please request a new OTP.",
      });

    const { email } = jwt.verify(token, process.env.JWT_SECRET);

    const tempAdmin = await TempAdmin.findOne({ email });
    if (!tempAdmin)
      return res.status(400).json({
        message: "We could not find your OTP request. Please try again.",
      });

    if (tempAdmin.verified)
      return res.status(400).json({
        message:
          "This OTP has already been used. Please login or request a new OTP.",
      });

    if (tempAdmin.otpExpires < new Date())
      return res
        .status(400)
        .json({ message: "Your OTP has expired. Please request a new one." });

    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    if (hashedOtp !== tempAdmin.otp)
      return res.status(400).json({
        message:
          "The OTP you entered is incorrect. Please check and try again.",
      });

    tempAdmin.verified = true;
    tempAdmin.verifiedAt = new Date();
    await tempAdmin.save();

    const registerToken = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: "10m",
    });

    res
      .clearCookie("otpToken")
      .cookie("registerToken", registerToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 10 * 60 * 1000,
      })
      .json({ message: "OTP verified successfully!" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Something went wrong. Please try again later." });
  }
};

export const setPassword = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;
    const token = req.cookies.registerToken;

    if (!token)
      return res.status(400).json({
        message:
          "Your registration session has expired. Please verify your email again to continue.",
      });

    if (!password || !confirmPassword)
      return res
        .status(400)
        .json({ message: "Please enter both password and confirm password." });

    if (password !== confirmPassword)
      return res
        .status(400)
        .json({ message: "Passwords don’t match. Please try again." });

    if (!passwordRegex.test(password))
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.",
      });

    const { email } = jwt.verify(token, process.env.JWT_SECRET);

    const tempAdmin = await TempAdmin.findOne({ email, verified: true });
    if (!tempAdmin)
      return res.status(403).json({
        message:
          "You must verify your email first. Please complete OTP verification.",
      });

    const hashedPassword = await bcrypt.hash(
      password,
      Number(process.env.SALT_ROUNDS) || 10,
    );

    const admin = await User.create({
      name: tempAdmin.name,
      email,
      password: hashedPassword,
      role: "admin",
    });

    await tempAdmin.deleteOne();
    res.clearCookie("registerToken");

    const { password: pwd, ...adminData } = admin._doc;
    res.status(201).json({
      message:
        "Your account has been created successfully! You can now log in.",
      admin: adminData,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Something went wrong. Please try again later." });
  }
};
