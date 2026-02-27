import jwt from "jsonwebtoken";
import { passwordRegex } from "../utils/validation.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import Campus from "../models/campus.model.js";
import TempAdmin from "../models/TempAdmin.model.js";
import { sendEmail } from "../utils/mailer.js";
import { formatFullName } from "../utils/formatName.js";

const getCookieOptions = (duration = 10 * 60 * 1000) => ({
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  secure: true,
  priority: "high",
  maxAge: duration,
});

// ------------------ REQUEST OTP ------------------
export const requestOTP = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!email)
      return res
        .status(400)
        .json({ message: "Please enter your email to receive an OTP." });

    const adminExists = await User.findOne({ email });
    if (adminExists)
      return res
        .status(403)
        .json({
          message:
            "An admin with this email already exists. Please login instead.",
        });

    const userExists = await Campus.findOne({ email });
    if (userExists)
      return res
        .status(403)
        .json({
          message:
            "This email is already registered as a user. Cannot use for admin registration.",
        });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    await TempAdmin.findOneAndUpdate(
      { email },
      {
        name: formatFullName(name),
        email,
        otp: hashedOtp,
        otpExpires,
        verified: false,
      },
      { upsert: true, new: true },
    );

    // Send email via Brevo API
    const htmlContent = `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin:auto; padding:30px; border:1px solid #e0e0e0; border-radius:12px; background:#f9f9f9; text-align:center;">
        <h1 style="color:#1a73e8;">Hello ${formatFullName(name) || "Admin"},</h1>
        <p>Your OTP for admin registration is:</p>
        <div style="padding:15px 25px; font-size:24px; font-weight:bold; color:#fff; background:#1a73e8; border-radius:8px;">${otp}</div>
        <p>This OTP expires in 10 minutes.</p>
      </div>
    `;

    await sendEmail({
      toEmail: email,
      toName: formatFullName(name),
      subject: "Your OTP for Admin Registration",
      htmlContent,
    });

    const otpToken = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: "10m",
    });
    res
      .cookie("otpToken", otpToken, getCookieOptions())
      .json({ message: "OTP sent to your email. Please check your inbox." });
  } catch (err) {
    console.error("OTP Request Error:", err);
    res
      .status(500)
      .json({
        message: "Failed to send OTP. See server logs.",
        error: err.message,
      });
  }
};

// ------------------ VERIFY OTP ------------------
export const verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    const token = req.cookies.otpToken;
    if (!token)
      return res.status(400).json({ message: "OTP session expired." });

    const { email } = jwt.verify(token, process.env.JWT_SECRET);
    const tempAdmin = await TempAdmin.findOne({ email });
    if (!tempAdmin)
      return res.status(400).json({ message: "OTP request not found." });
    if (tempAdmin.verified)
      return res.status(400).json({ message: "OTP already used." });
    if (tempAdmin.otpExpires < new Date())
      return res.status(400).json({ message: "OTP expired." });

    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
    if (hashedOtp !== tempAdmin.otp)
      return res.status(400).json({ message: "Incorrect OTP." });

    tempAdmin.verified = true;
    tempAdmin.verifiedAt = new Date();
    await tempAdmin.save();

    const registerToken = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: "10m",
    });
    res
      .clearCookie("otpToken", { ...getCookieOptions(), maxAge: 0 })
      .cookie("registerToken", registerToken, getCookieOptions())
      .json({ message: "OTP verified successfully!" });
  } catch (err) {
    console.error("OTP Verification Error:", err);
    res
      .status(500)
      .json({ message: "OTP verification failed.", error: err.message });
  }
};

// ------------------ SET PASSWORD ------------------
export const setPassword = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;
    const token = req.cookies.registerToken;
    if (!token)
      return res.status(400).json({ message: "Registration session expired." });
    if (!password || !confirmPassword)
      return res
        .status(400)
        .json({ message: "Enter both password and confirm password." });
    if (password !== confirmPassword)
      return res.status(400).json({ message: "Passwords don’t match." });
    if (!passwordRegex.test(password))
      return res.status(400).json({ message: "Password invalid." });

    const { email } = jwt.verify(token, process.env.JWT_SECRET);
    const tempAdmin = await TempAdmin.findOne({ email, verified: true });
    if (!tempAdmin)
      return res.status(403).json({ message: "Verify email first." });

    const hashedPassword = await bcrypt.hash(
      password,
      Number(process.env.SALT_ROUNDS) || 10,
    );
    const admin = await User.create({
      name: formatFullName(tempAdmin.name),
      email,
      password: hashedPassword,
      role: "admin",
    });

    await tempAdmin.deleteOne();
    res.clearCookie("registerToken", { ...getCookieOptions(), maxAge: 0 });

    const { password: pwd, ...adminData } = admin._doc;
    res
      .status(201)
      .json({ message: "Account created successfully!", admin: adminData });
  } catch (err) {
    console.error("Set Password Error:", err);
    res
      .status(500)
      .json({ message: "Failed to set password.", error: err.message });
  }
};
