import crypto from "crypto";
import User from "../models/user.model.js";
import { createTransporter } from "../utils/mailer.js";
import bcrypt from "bcryptjs";

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

      const resetLink = `http://localhost:3000/reset-password?token=${resetToken}&email=${email}`;

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

export const resetPassword = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword)
      return res.status(400).json({ message: "All fields are required" });

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      email,
      resetToken: hashedToken,
      resetTokenExpires: { $gt: new Date() },
    });

    if (!user)
      return res
        .status(400)
        .json({ message: "Link expired. Check your latest email." });

    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame)
      return res.status(400).json({
        message: "New password cannot be the same as the old password",
      });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

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
