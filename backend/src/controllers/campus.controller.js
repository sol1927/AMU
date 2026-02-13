import Campus from "../models/campus.model.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";

export const createCampus = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { name, email, password, location } = req.body;

    // ✅ Check valid email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.toLowerCase())) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        message: "Password is required and must be at least 6 characters",
      });
    }

    // Check if a campus with the same name already exists (case-insensitive)
    const existingCampus = await Campus.findOne({
      createdBy: req.userId,
      name: { $regex: `^${name.trim()}$`, $options: "i" },
    });
    if (existingCampus) {
      return res.status(400).json({
        message: "A campus with this name already exists",
      });
    }

    // Check if name/email conflicts with admin
    const adminWithEmailOrName = await User.findOne({
      $or: [{ email }, { name }],
    });
    if (adminWithEmailOrName) {
      return res.status(400).json({
        message: "Campus email or name cannot be the same as an admin",
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      Number(process.env.SALT_ROUNDS) || 10,
    );

    const admin = await User.findById(req.userId).select("logo");

    const campus = await Campus.create({
      name,
      email,
      password: hashedPassword,
      location: location || "",
      createdBy: req.userId,
      logo: admin?.logo || {},
    });

    const { password: _password, ...campusData } = campus.toObject();

    res.status(201).json({
      message: "Campus created successfully",
      campus: campusData,
    });
  } catch (err) {
    if (err.code === 11000) {
      if (err.keyPattern?.email) {
        return res.status(400).json({
          message: "This campus email is already in use.",
        });
      }
      if (err.keyPattern?.name) {
        return res.status(400).json({
          message: "You already have a campus with this name.",
        });
      }
    }
    res.status(500).json({ message: "Failed to create campus" });
  }
};

export const getCampuses = async (req, res) => {
  if (req.userRole !== "admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  const campuses = await Campus.find({ createdBy: req.userId })
    .select("-password")
    .sort({ createdAt: -1 });

  res.json({ campuses });
};

// export const getCampus = async (req, res) => {
//   if (req.userRole !== "admin") {
//     return res.status(403).json({ message: "Access denied" });
//   }

//   const campus = await Campus.findOne({
//     _id: req.params.id,
//     createdBy: req.userId,
//   }).select("-password");

//   if (!campus) {
//     return res.status(404).json({ message: "Campus not found" });
//   }

//   res.json({ campus });
// };

export const updateCampus = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { name, email, password, currentPassword, location } = req.body;

    // Fetch campus including password
    const campus = await Campus.findOne({
      _id: req.params.id,
      createdBy: req.userId,
    }).select("+password");

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    // ✅ Validate email format if updating
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.toLowerCase())) {
        return res.status(400).json({ message: "Invalid email format." });
      }
      campus.email = email;
    }

    // Case-insensitive check for name
    if (name) {
      const existingCampus = await Campus.findOne({
        _id: { $ne: req.params.id },
        createdBy: req.userId,
        name: { $regex: `^${name.trim()}$`, $options: "i" },
      });

      if (existingCampus) {
        return res.status(400).json({
          message: "A campus with this name already exists",
        });
      }

      campus.name = name;
    }

    // Check conflict with admin
    if (email || name) {
      const adminConflict = await User.findOne({
        $or: [{ email }, { name }],
      });
      if (adminConflict) {
        return res.status(400).json({
          message: "Campus email or name cannot be the same as an admin",
        });
      }
    }

    // Update location if provided
    if (location !== undefined) campus.location = location;

    // Password update
    if (password) {
      if (!currentPassword) {
        return res.status(400).json({
          message: "Current password is required to set a new password",
        });
      }

      const match = await bcrypt.compare(currentPassword, campus.password);
      if (!match) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }

      const sameAsCurrent = await bcrypt.compare(password, campus.password);
      if (sameAsCurrent) {
        return res.status(400).json({
          message: "New password cannot be the same as current password",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          message: "New password must be at least 6 characters",
        });
      }

      campus.password = await bcrypt.hash(
        password,
        Number(process.env.SALT_ROUNDS) || 10,
      );
    }

    await campus.save();

    const { password: _password, ...campusData } = campus.toObject();

    res.json({
      message: "Campus updated successfully",
      campus: campusData,
    });
  } catch (err) {
    if (err.code === 11000) {
      if (err.keyPattern?.email) {
        return res
          .status(400)
          .json({ message: "This campus email is already in use." });
      }
      if (err.keyPattern?.name) {
        return res
          .status(400)
          .json({ message: "You already have a campus with this name." });
      }
    }

    console.error(err);
    res.status(500).json({ message: "Failed to update campus" });
  }
};

export const deleteCampus = async (req, res) => {
  if (req.userRole !== "admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  const campus = await Campus.findOneAndDelete({
    _id: req.params.id,
    createdBy: req.userId,
  });

  if (!campus) {
    return res.status(404).json({ message: "Campus not found" });
  }

  res.json({ message: "Campus deleted successfully" });
};
