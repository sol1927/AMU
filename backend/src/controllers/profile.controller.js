import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("name email role logo");
    if (!user) return res.status(404).json({ message: "Account not found" });

    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load profile" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "Account not found" });

    if (name) user.name = name;
    if (email) user.email = email;

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        logo: user.logo,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Profile update failed" });
  }
};

export const updateProfilePhoto = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "No image received" });

    const streamUpload = (buffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "profile_photos",
            transformation: [{ width: 300, height: 300, crop: "fill" }],
          },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          },
        );
        streamifier.createReadStream(buffer).pipe(stream);
      });
    };

    const result = await streamUpload(req.file.buffer);

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.logo = result.secure_url;
    await user.save();

    res.json({ message: "Profile photo updated", logo: result.secure_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Photo upload failed" });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Both current and new password are required" });
    }
    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: "New password must be at least 8 characters" });
    }

    const user = await User.findById(req.userId).select("+password");
    if (!user) return res.status(404).json({ message: "Account not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Wrong current password" });

    const samePassword = await bcrypt.compare(newPassword, user.password);
    if (samePassword)
      return res.status(400).json({
        message: "New password must be different from current password",
      });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Password change failed" });
  }
};
