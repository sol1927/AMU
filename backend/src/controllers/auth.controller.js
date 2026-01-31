import User from "../models/user.model.js";
import TempAdmin from "../models/TempAdmin.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import crypto from "crypto";

/* =========================
   UTILS
========================= */
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const createTransporter = () =>
  nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

/* =========================
   STEP 1: REQUEST OTP
========================= */
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

    // Generate OTP
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
      <a href="http://your-website.com/login" 
         style="display: inline-block; padding: 10px 20px; margin-top: 20px; background-color: #1a73e8; color: white; text-decoration: none; border-radius: 5px;">
         Go to Login
      </a>
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

/* =========================
   STEP 2: VERIFY OTP
========================= */
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

/* =========================
   STEP 3: SET PASSWORD
========================= */
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

/* =========================
   LOGIN (COOKIE)
========================= */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({
        message: "Please enter both your email and password to log in.",
      });

    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(400)
        .json({ message: "The email or password you entered is incorrect." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res
        .status(400)
        .json({ message: "The email or password you entered is incorrect." });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.cookie("accessToken", token, {
      httpOnly: true,
      sameSite: "lax", // ✅ same in login and logout
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    });

    const { password: pwd, ...userData } = user._doc;
    res.json({ message: "You’ve successfully logged in.", user: userData });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Something went wrong. Please try again later." });
  }
};

/* =========================
   CURRENT USER
========================= */
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user)
      return res.status(404).json({
        message: "We couldn’t find your account. Please log in again.",
      });

    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message:
        "Something went wrong while loading your profile. Please try again later.",
    });
  }
};

/* =========================
   PASSWORD RESET REQUEST
========================= */
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    const MIN_RESPONSE_TIME = 1500; // 2 seconds
    const start = Date.now();

    // Find the user (do NOT reveal if email exists)
    const user = await User.findOne({ email });

    if (user) {
      // Generate a reset token
      const resetToken = crypto.randomBytes(20).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      // Save hashed token and expiry in user
      user.resetToken = hashedToken;
      user.resetTokenExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await user.save();

      // Build reset link
      const resetLink = `http://localhost:3000/reset-password?token=${resetToken}&email=${email}`;

      // Send HTML email
      await createTransporter().sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Password Reset",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; text-align: center;">
            <img src="https://example.com/logo.png" alt="Logo" style="width: 120px; margin-bottom: 20px;" />
            <h2 style="color: #333;">Hello there,</h2>
            <p style="font-size: 16px; color: #555;">
              You requested a password reset. Click the button below to set a new password:
            </p>
            <a href="${resetLink}" 
               style="display: inline-block; padding: 10px 20px; margin-top: 20px; background-color: #1abc9c; color: white; text-decoration: none; border-radius: 5px;">
               Reset Password
            </a>
            <p style="margin-top: 20px; font-size: 12px; color: #999;">
              This link will expire in 10 minutes. If you did not request this, please ignore this email.
            </p>
          </div>
        `,
      });
    }

    // Delay response to prevent timing attacks
    const elapsed = Date.now() - start;
    const wait = Math.max(MIN_RESPONSE_TIME - elapsed, 0);
    setTimeout(() => {
      res.json({ message: "If the email exists, a reset link has been sent" });
    }, wait);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Something went wrong. Please try again later." });
  }
};

/* =========================
   RESET PASSWORD
========================= */
export const resetPassword = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword)
      return res.status(400).json({ message: "All fields are required" });

    // Hash the token from query to match database
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find user with valid token
    const user = await User.findOne({
      email,
      resetToken: hashedToken,
      resetTokenExpires: { $gt: new Date() },
    });

    if (!user)
      return res
        .status(400)
        .json({ message: "Link expired. Check your latest email." });

    // Check if new password is same as old
    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame)
      return res.status(400).json({
        message: "New password cannot be the same as the old password",
      });

    // Hash new password and save
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // Clear reset token and expiry
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;

    await user.save();

    res.json({ message: "Password has been reset successfully" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Something went wrong. Please try again later." });
  }
};

/* =========================
    LOGOUT
========================= */

export const logout = (req, res) => {
  res
    .clearCookie("accessToken", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    })
    .json({ message: "Logged out" });
};
