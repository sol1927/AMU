import jwt from "jsonwebtoken";
import { passwordRegex } from "../utils/validation.js";
import crypto from "crypto";
import User from "../models/user.model.js";
import Campus from "../models/campus.model.js";
import TempAdmin from "../models/TempAdmin.model.js";
import { sendEmail } from "../utils/mailer.js";
import bcrypt from "bcryptjs";
import { formatFullName } from "../utils/formatName.js";
import { logInternalError } from "../utils/safeError.js";

const getCookieOptions = (duration = 10 * 60 * 1000) => ({
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  secure: process.env.NODE_ENV === "production",
  priority: "high",
  maxAge: duration,
});

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

    const userExists = await Campus.findOne({ email });
    if (userExists)
      return res.status(403).json({
        message:
          "This email is already registered as a user. You cannot use it for admin registration.",
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

    await sendEmail({
      toEmail: email,
      toName: formatFullName(name) || "Admin",
      subject: "Your OTP for Admin Registration",
      htmlContent: `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #f9f9f9; text-align: center;">
    
    <a href="https://gibigebeta.vercel.app/" target="_blank" style="text-decoration: none;">
      <img 
        src="https://res.cloudinary.com/dgujf1ixo/image/upload/v1773724590/logo_svdji9.png" 
        alt="GibiGebeta" 
        style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; margin-bottom: 20px;"
      />
    </a>
    
    <h1 style="color: #1a73e8; font-size: 26px; margin-bottom: 10px;">Hello ${formatFullName(name) || "Admin"},</h1>
    
    <p style="font-size: 16px; color: #555; margin-bottom: 30px;">
      Your One-Time Password (OTP) for admin registration is:
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

    const otpToken = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: "10m",
    });

    res
      .cookie("otpToken", otpToken, getCookieOptions())
      .json({ message: "OTP sent to your email. Please check your inbox." });
  } catch (error) {
    logInternalError("request-otp", error);
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
      .clearCookie("otpToken", { ...getCookieOptions(), maxAge: 0 })
      .cookie("registerToken", registerToken, getCookieOptions())
      .json({ message: "OTP verified successfully!" });
  } catch {
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
      name: formatFullName(tempAdmin.name),
      email,
      password: hashedPassword,
      role: "admin",
    });

    await tempAdmin.deleteOne();
    res.clearCookie("registerToken", { ...getCookieOptions(), maxAge: 0 });

    const { password: pwd, ...adminData } = admin._doc;
    res.status(201).json({
      message:
        "Your account has been created successfully! You can now log in.",
      admin: adminData,
    });
  } catch {
    res
      .status(500)
      .json({ message: "Something went wrong. Please try again later." });
  }
};
