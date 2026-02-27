import crypto from "crypto";
import User from "../models/user.model.js";
import { sendEmail } from "../utils/mailer.js";
import bcrypt from "bcryptjs";
import { formatFullName } from "../utils/formatName.js";

export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    const MIN_RESPONSE_TIME = 2000;
    const start = Date.now();

    const user = await User.findOne({ email });

    if (user) {
      const resetToken = crypto.randomBytes(20).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      user.resetToken = hashedToken;
      user.resetTokenExpires = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${email}`;

      await sendEmail({
        toEmail: email,
        toName: formatFullName(user.name) || "User",
        subject: "Password Reset",
        htmlContent: `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #f9f9f9; text-align: center;">
    
    <a href="https://yourwebsite.com" target="_blank" style="text-decoration: none;">
      <img 
        src="https://res.cloudinary.com/dgujf1ixo/image/upload/v1772027632/logo_m6xobp.jpg" 
        alt="GibiGebeta Logo" 
        style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; margin-bottom: 20px;"
      />
    </a>
    
    <h1 style="color: #1a73e8; font-size: 26px; margin-bottom: 10px;">Hello there,</h1>
    
    <p style="font-size: 16px; color: #555; margin-bottom: 30px;">
      You requested a password reset. Click the button below to set a new password:
    </p>
    
    <a href="${resetLink}" 
       style="display: inline-block; padding: 15px 25px; font-size: 16px; font-weight: bold; background: linear-gradient(135deg, #1a73e8, #4285f4); color: white; text-decoration: none; border-radius: 8px; margin-bottom: 20px;">
       Reset Password
    </a>
    
    <p style="margin-top: 20px; font-size: 14px; color: #999;">
      This link will expire in 10 minutes. If you did not request this, please ignore this email.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #bbb;">
      &copy; ${new Date().getFullYear()} GibiGebeta. All rights reserved.
    </p>
  </div>
  `,
      });
    }

    const elapsed = Date.now() - start;
    const wait = Math.max(MIN_RESPONSE_TIME - elapsed, 0);
    setTimeout(() => {
      res.json({ message: "If the email exists, a reset link has been sent" });
    }, wait);
  } catch {
    res
      .status(500)
      .json({ message: "Something went wrong. Please try again later." });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      email,
      resetToken: hashedToken,
      resetTokenExpires: { $gt: new Date() },
    }).select("+password");

    if (!user) {
      return res
        .status(400)
        .json({ message: "Link expired. Check your latest email." });
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

    const isSame = user.password
      ? await bcrypt.compare(newPassword, user.password)
      : false;

    if (isSame) {
      return res.status(400).json({
        message: "New password cannot be the same as the old password",
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    user.resetToken = undefined;
    user.resetTokenExpires = undefined;

    await user.save();

    res.json({ message: "Password has been reset successfully" });
  } catch {
    res
      .status(500)
      .json({ message: "Something went wrong. Please try again later." });
  }
};
