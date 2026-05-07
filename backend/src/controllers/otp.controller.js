import jwt from "jsonwebtoken";
import { passwordRegex } from "../utils/validation.js";
import crypto from "crypto";
import User from "../models/user.model.js";
import Campus from "../models/campus.model.js";
import TempAdmin from "../models/TempAdmin.model.js";
import { sendEmail } from "../utils/mailer.js";
import { formatFullName } from "../utils/formatName.js";
import { logInternalError } from "../utils/safeError.js";
import { getCookieOptions } from "../utils/sessionSecurity.js";

const OTP_EXPIRY_MINUTES = 10;
const OTP_COOKIE_DURATION_MS = OTP_EXPIRY_MINUTES * 60 * 1000;

export const requestOTP = async (req, res) => {
  try {
    const { name, email, defaultEmail } = req.body ?? {};
    const normalizedName = formatFullName(name);

    if (!normalizedName) {
      return res
        .status(400)
        .json({ message: "Please enter your full name to continue." });
    }

    if (!email) {
      return res
        .status(400)
        .json({ message: "Please enter your email to receive an OTP." });
    }

    const existingAdminAccount = await User.findOne({ role: "admin" });
    const existingTempAdmin = await TempAdmin.findOne({ email });
    const normalizedInitialEmail =
      process.env.INITIAL_ADMIN_EMAIL?.toLowerCase().trim();
    const storedAdminEmail = existingAdminAccount?.email?.toLowerCase().trim();
    const providedDefaultEmail = defaultEmail?.toLowerCase().trim();

    if (existingAdminAccount) {
      const isBootstrapRecord = storedAdminEmail === normalizedInitialEmail;

      if (isBootstrapRecord) {
        // Security check: Only require the default email if this is the first attempt.
        // If a TempAdmin record already exists, it means the user already passed this gate
        // and is simply requesting a resend.
        const isFirstAttempt = !existingTempAdmin;

        if (isFirstAttempt && providedDefaultEmail !== normalizedInitialEmail) {
          return res
            .status(401)
            .json({ message: "The current email is incorrect." });
        }
      } else {
        return res.status(403).json({
          message: "System initialization is already complete.",
        });
      }
    }

    const adminExists = await User.findOne({ email });
    if (
      adminExists &&
      (!existingAdminAccount || adminExists.id !== existingAdminAccount.id)
    ) {
      return res.status(403).json({
        message:
          "An admin with this email already exists. Please login instead.",
      });
    }

    const userExists = await Campus.findOne({ email });
    if (userExists) {
      return res.status(403).json({
        message:
          "This email is already registered as a user. You cannot use it for admin registration.",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + OTP_COOKIE_DURATION_MS);
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    await TempAdmin.upsertByEmail(email, {
      name: normalizedName,
      email,
      otp: hashedOtp,
      otpExpires,
      verified: false,
      verifiedAt: null,
    });

    await sendEmail({
      toEmail: email,
      toName: normalizedName,
      subject: "Your OTP for Admin Registration",
      htmlContent: `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #f9f9f9; text-align: center;">
    <h1 style="color: #1a73e8; font-size: 26px; margin-bottom: 10px;">Hello ${normalizedName || "Admin"},</h1>
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
      expiresIn: `${OTP_EXPIRY_MINUTES}m`,
    });

    return res
      .cookie("otpToken", otpToken, getCookieOptions(OTP_COOKIE_DURATION_MS))
      .json({ message: "OTP sent to your email. Please check your inbox." });
  } catch (error) {
    logInternalError("request-otp", error);

    if (
      error?.code === "EMAIL_NETWORK_ERROR" ||
      error?.code === "EMAIL_DELIVERY_FAILED"
    ) {
      return res.status(503).json({ message: error.message });
    }

    return res
      .status(500)
      .json({ message: "Something went wrong. Please try again later." });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body ?? {};
    const token = req.cookies?.otpToken;

    if (!otp) {
      return res.status(400).json({
        message: "Please enter the OTP sent to your email.",
      });
    }

    if (!token) {
      return res.status(400).json({
        message: "Your OTP session has expired. Please request a new OTP.",
      });
    }

    const { email } = jwt.verify(token, process.env.JWT_SECRET);

    const tempAdmin = await TempAdmin.findOne({ email });
    if (!tempAdmin) {
      return res.status(400).json({
        message: "We could not find your OTP request. Please try again.",
      });
    }

    if (tempAdmin.verified) {
      return res.status(400).json({
        message:
          "This OTP has already been used. Please login or request a new OTP.",
      });
    }

    if (new Date(tempAdmin.otpExpires) < new Date()) {
      return res
        .status(400)
        .json({ message: "Your OTP has expired. Please request a new one." });
    }

    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
    if (hashedOtp !== tempAdmin.otp) {
      return res.status(400).json({
        message:
          "The OTP you entered is incorrect. Please check and try again.",
      });
    }

    await TempAdmin.updateById(tempAdmin.id, {
      verified: true,
      verifiedAt: new Date(),
    });

    const registerToken = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: `${OTP_EXPIRY_MINUTES}m`,
    });

    return res
      .clearCookie("otpToken", {
        ...getCookieOptions(OTP_COOKIE_DURATION_MS),
        maxAge: 0,
      })
      .cookie(
        "registerToken",
        registerToken,
        getCookieOptions(OTP_COOKIE_DURATION_MS),
      )
      .json({ message: "OTP verified successfully!" });
  } catch (error) {
    logInternalError("verify-otp", error);
    return res
      .status(500)
      .json({ message: "Something went wrong. Please try again later." });
  }
};

export const setPassword = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body ?? {};
    const token = req.cookies?.registerToken;

    if (!token) {
      return res.status(400).json({
        message:
          "Time is up. Register again and set your password within 10 minutes.",
      });
    }

    if (!password || !confirmPassword) {
      return res
        .status(400)
        .json({ message: "Please enter both password and confirm password." });
    }

    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({ message: "Passwords don't match. Please try again." });
    }

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.",
      });
    }

    const { email } = jwt.verify(token, process.env.JWT_SECRET);

    const tempAdmin = await TempAdmin.findOne({ email });
    if (!tempAdmin || tempAdmin.verified !== true) {
      return res.status(403).json({
        message:
          "You must verify your email first. Please complete OTP verification.",
      });
    }

    const normalizedName = formatFullName(tempAdmin.name);
    if (!normalizedName) {
      await TempAdmin.deleteById(tempAdmin.id).catch(() => null);
      res.clearCookie("registerToken", {
        ...getCookieOptions(OTP_COOKIE_DURATION_MS),
        maxAge: 0,
      });
      return res.status(400).json({
        message:
          "We could not find your registration details. Please register again.",
      });
    }

    const existingAdminAccount = await User.findOne({ role: "admin" });
    const normalizedInitialEmail =
      process.env.INITIAL_ADMIN_EMAIL?.toLowerCase().trim();
    const isDefaultAdminUpdate =
      existingAdminAccount &&
      existingAdminAccount.email.toLowerCase().trim() ===
        normalizedInitialEmail;

    if (existingAdminAccount && !isDefaultAdminUpdate) {
      await TempAdmin.deleteById(tempAdmin.id).catch(() => null);
      res.clearCookie("registerToken", {
        ...getCookieOptions(OTP_COOKIE_DURATION_MS),
        maxAge: 0,
      });
      return res.status(403).json({
        message: "System initialization is already complete.",
      });
    }

    let admin;
    if (isDefaultAdminUpdate) {
      admin = await User.updateById(existingAdminAccount.id, {
        name: normalizedName,
        email,
        password,
        mustChangePassword: false,
      });
    } else {
      admin = await User.create({
        name: normalizedName,
        email,
        password,
        role: "admin",
      });
    }

    await TempAdmin.deleteById(tempAdmin.id);
    res.clearCookie("registerToken", {
      ...getCookieOptions(OTP_COOKIE_DURATION_MS),
      maxAge: 0,
    });

    return res.status(201).json({
      message:
        "Your account has been created successfully! You can now log in.",
      admin,
    });
  } catch (error) {
    logInternalError("set-password", error);

    if (
      error?.name === "TokenExpiredError" ||
      error?.name === "JsonWebTokenError"
    ) {
      return res.status(400).json({
        message:
          "Time is up. Register again and set your password within 10 minutes.",
      });
    }

    if (error?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "This account already exists. Please sign in.",
      });
    }

    return res.status(500).json({
      message:
        "We could not finish your registration. Register again and set your password within 10 minutes.",
    });
  }
};
