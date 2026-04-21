import Campus from "../models/campus.model.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import CafeStudent from "../models/cafeStudent.model.js";
import cloudinary from "../config/cloudinary.js";
import { formatFullName } from "../utils/formatName.js";
import {
  getStudentCampusSyncQuery,
  parseCampusId,
} from "../utils/campusId.js";
import { logInternalError, sendServerError } from "../utils/safeError.js";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LIVE_CAMPUS_WINDOW_MS = 5 * 60 * 1000;

export const createCampus = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { campusId, name, email, password, location } = req.body;
    const parsedCampusId = parseCampusId(campusId);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.toLowerCase())) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    if (parsedCampusId === null) {
      return res.status(400).json({
        message: "Campus ID is required and must be a positive whole number.",
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        message: "Password is required and must be at least 6 characters",
      });
    }

    const existingCampus = await Campus.findOne({
      createdBy: req.userId,
      name: { $regex: `^${name.trim()}$`, $options: "i" },
    });
    if (existingCampus) {
      return res.status(400).json({
        message: "A campus with this name already exists",
      });
    }

    const existingCampusId = await Campus.findOne({ campusId: parsedCampusId });
    if (existingCampusId) {
      return res.status(400).json({
        message: "This campus ID is already in use.",
      });
    }

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
      campusId: parsedCampusId,
      name: formatFullName(name.trim()),
      email,
      password: hashedPassword,
      location: location ? formatFullName(location.trim()) : "",
      createdBy: req.userId,
      logo: admin?.logo || {},
    });

    const campusData = campus.toObject();
    delete campusData.password;

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
      if (err.keyPattern?.campusId) {
        return res.status(400).json({
          message: "This campus ID is already in use.",
        });
      }
    }
    res.status(500).json({ message: "Failed to create campus" });
  }
};

export const getCampuses = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const campuses = await Campus.find({ createdBy: req.userId })
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    const campusesWithStats = await Promise.all(
      campuses.map(async (campus) => {
        const studentsCount = await CafeStudent.countDocuments(
          getStudentCampusSyncQuery(campus),
        );

        const isLive =
          Boolean(campus.isOnline) &&
          Boolean(campus.lastActiveAt) &&
          Date.now() - new Date(campus.lastActiveAt).getTime() <=
            LIVE_CAMPUS_WINDOW_MS;

        return {
          ...campus,
          name: campus.name ? formatFullName(campus.name) : "",
          location: campus.location ? formatFullName(campus.location) : "N/A",
          students: studentsCount,
          isLive,
        };
      }),
    );

    res.json({ campuses: campusesWithStats });
  } catch (err) {
    logInternalError("fetch-campuses", err);
    sendServerError(res, "We could not load campuses right now. Please try again.");
  }
};

export const updateCampus = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { campusId, name, email, password, location } = req.body;

    const campus = await Campus.findOne({
      _id: req.params.id,
      createdBy: req.userId,
    }).select("+password");

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    const previousCampusId = campus.campusId;

    if (campusId !== undefined) {
      const parsedCampusId = parseCampusId(campusId);

      if (parsedCampusId === null) {
        return res.status(400).json({
          message: "Campus ID must be a positive whole number.",
        });
      }

      const existingCampusId = await Campus.findOne({
        _id: { $ne: req.params.id },
        campusId: parsedCampusId,
      });

      if (existingCampusId) {
        return res.status(400).json({
          message: "This campus ID is already in use.",
        });
      }

      campus.campusId = parsedCampusId;
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.toLowerCase())) {
        return res.status(400).json({ message: "Invalid email format." });
      }
      campus.email = email;
    }

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

      campus.name = formatFullName(name.trim());
    }

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

    if (location !== undefined) {
      campus.location = location ? formatFullName(location.trim()) : "";
    }
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          message: "Password must be at least 6 characters",
        });
      }

      campus.password = await bcrypt.hash(
        password,
        Number(process.env.SALT_ROUNDS) || 10,
      );
    }

    await campus.save();

    if (campusId !== undefined) {
      await CafeStudent.updateMany(
        getStudentCampusSyncQuery(campus, previousCampusId),
        {
          $set: { campusId: campus.campusId },
        },
      );
    }

    const campusData = campus.toObject();
    delete campusData.password;

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
      if (err.keyPattern?.campusId) {
        return res
          .status(400)
          .json({ message: "This campus ID is already in use." });
      }
    }

    res.status(500).json({ message: "Failed to update campus" });
  }
};

export const selfUpdateCampus = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { name, email, password, currentPassword, location } = req.body;

    const campus = await Campus.findOne({
      _id: req.params.id,
      createdBy: req.userId,
    }).select("+password");

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.toLowerCase())) {
        return res.status(400).json({ message: "Invalid email format." });
      }
      campus.email = email;
    }

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

      campus.name = formatFullName(name.trim());
    }

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

    if (location !== undefined) {
      campus.location = location ? formatFullName(location.trim()) : "";
    }
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

    const campusData = campus.toObject();
    delete campusData.password;

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

    res.status(500).json({ message: "Failed to update campus" });
  }
};

export const deleteCampus = async (req, res) => {
  try {
    const { id } = req.params;

    const campus = await Campus.findById(id);
    if (!campus) return res.status(404).json({ message: "Campus not found" });

    const students = await CafeStudent.find(getStudentCampusSyncQuery(campus));

    for (const student of students) {
      if (student.profilePublicId) {
        await cloudinary.uploader.destroy(student.profilePublicId);
      }
    }

    await CafeStudent.deleteMany(getStudentCampusSyncQuery(campus));

    if (campus.logoPublicId) {
      await cloudinary.uploader.destroy(campus.logoPublicId);
    }

    await Campus.findByIdAndDelete(id);

    res.json({ message: "Campus and its students deleted successfully" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

export const getCampusDashboard = async (req, res) => {
  try {
    const campus = req.campus;

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    res.json({
      campus: {
        campusId: campus.campusId,
        name: campus.name,
        email: campus.email,
        location: campus.location,
        logo: campus.logo,
      },
    });
  } catch {
    res.status(500).json({ message: "Failed to fetch campus info" });
  }
};

export const verifyCampusPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const campusId = req.campus._id;

    if (!password || password.trim() === "") {
      return res.status(400).json({ message: "Password is required" });
    }

    const campus = await Campus.findById(campusId).select(
      "+password loginAttempts lockUntil",
    );
    if (!campus) return res.status(404).json({ message: "Campus not found" });

    const now = Date.now();

    if (campus.lockUntil && campus.lockUntil > now) {
      const remaining = campus.lockUntil - now;
      const minutesLeft = Math.ceil(remaining / 60000);
      return res.status(429).json({
        message: `Too many attempts. Try again in ${minutesLeft} minute(s).`,
      });
    }

    const isMatch = await bcrypt.compare(password, campus.password);

    if (!isMatch) {
      campus.loginAttempts += 1;

      if (campus.loginAttempts >= MAX_ATTEMPTS) {
        campus.lockUntil = now + WINDOW_MS;
      }

      await campus.save();

      const attemptsLeft = Math.max(0, MAX_ATTEMPTS - campus.loginAttempts);

      return res.status(401).json({
        message:
          attemptsLeft > 0
            ? `Wrong password. ${attemptsLeft} attempt(s) left.`
            : `Too many attempts. Try again in ${Math.ceil(WINDOW_MS / 60000)} minute(s).`,
      });
    }

    campus.loginAttempts = 0;
    campus.lockUntil = undefined;
    await campus.save();

    return res.status(200).json({ message: "Password correct" });
  } catch (err) {
    logInternalError("verify-campus-password", err);
    return sendServerError(
      res,
      "We could not verify the password right now. Please try again.",
    );
  }
};

export const updateCampusProfile = async (req, res) => {
  try {
    const { name, email, password, currentPassword, location } = req.body;

    const campus = await Campus.findById(req.campus._id).select("+password");

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({ message: "Invalid email format." });
      }

      const existingCampus = await Campus.findOne({
        _id: { $ne: campus._id },
        email: normalizedEmail,
      });
      if (existingCampus) {
        return res.status(400).json({
          message: "This campus email is already in use.",
        });
      }

      const adminConflict = await User.findOne({ email: normalizedEmail });
      if (adminConflict) {
        return res.status(400).json({
          message: "This email is already being used by an admin.",
        });
      }

      campus.email = normalizedEmail;
    }

    if (name) {
      const normalizedName = formatFullName(name.trim());

      const existingCampusName = await Campus.findOne({
        _id: { $ne: campus._id },
        name: { $regex: `^${normalizedName}$`, $options: "i" },
      });

      if (existingCampusName) {
        return res.status(400).json({
          message: "A campus with this name already exists.",
        });
      }

      const adminConflict = await User.findOne({ name: normalizedName });
      if (adminConflict) {
        return res.status(400).json({
          message: "This name is already being used by an admin.",
        });
      }

      campus.name = normalizedName;
    }

    if (location !== undefined) {
      campus.location = location ? formatFullName(location.trim()) : "";
    }

    if (password) {
      if (!currentPassword) {
        return res.status(400).json({
          message: "Current password is required to set a new password.",
        });
      }

      const match = await bcrypt.compare(currentPassword, campus.password);
      if (!match) {
        return res.status(400).json({
          message: "Current password is incorrect.",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          message: "New password must be at least 6 characters.",
        });
      }

      const sameAsCurrent = await bcrypt.compare(password, campus.password);
      if (sameAsCurrent) {
        return res.status(400).json({
          message: "New password cannot be the same as your current password.",
        });
      }

      campus.password = await bcrypt.hash(
        password,
        Number(process.env.SALT_ROUNDS) || 10,
      );
    }

    await campus.save();

    const campusData = campus.toObject();
    delete campusData.password;

    res.json({
      message: "Campus profile updated successfully.",
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
          message: "A campus with this name already exists.",
        });
      }
      if (err.keyPattern?.campusId) {
        return res.status(400).json({
          message: "This campus ID is already in use.",
        });
      }
    }

    logInternalError("update-campus-profile", err);
    sendServerError(
      res,
      "We could not save your campus changes right now. Please try again.",
    );
  }
};

export const logoutCampus = (req, res) => {
  Campus.findByIdAndUpdate(req.campus?._id, {
    $set: { isOnline: false, lastActiveAt: null },
  })
    .catch(() => null)
    .finally(() => {
      const isProduction = process.env.NODE_ENV === "production";
      res
        .cookie("campusToken", "", {
          httpOnly: true,
          sameSite: isProduction ? "none" : "lax",
          secure: isProduction,
          expires: new Date(0),
        })
        .json({ message: "Logged out" });
    });
};
