import User from "../models/user.model.js";
import { logInternalError, sendServerError } from "../utils/safeError.js";

// List all tickers created by the current cafe user
export const listTickers = async (req, res) => {
  try {
    if (req.userRole !== "cafe") {
      return res.status(403).json({ message: "Access denied" });
    }
    const tickers = await User.findAll({
      role: "ticker",
      createdBy: req.userId,
    });
    res.json({ tickers });
  } catch (err) {
    logInternalError("list-tickers", err);
    sendServerError(res, "Could not fetch tickers");
  }
};

// Create a new ticker user under this cafe user's campus
export const createTicker = async (req, res) => {
  try {
    if (req.userRole !== "cafe") {
      return res.status(403).json({ message: "Access denied" });
    }
    const { name, email, username, password } = req.body;
    const tickerUsername = username || email;

    if (!name || !tickerUsername || !password) {
      return res
        .status(400)
        .json({ message: "Name, username, and password are required." });
    }
    const normalizedUsername = tickerUsername.toLowerCase().trim();
    if (/\s/.test(normalizedUsername)) {
      return res.status(400).json({ message: "Username cannot contain spaces." });
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(normalizedUsername)) {
      return res.status(400).json({ message: "Username can only contain letters, numbers, dots, hyphens, and underscores." });
    }

    // Load the cafe user to get their campusId
    const cafeUser = await User.findById(req.userId);
    if (!cafeUser) {
      return res.status(404).json({ message: "Cafe user not found." });
    }

    const existingUser = await User.findOne({
      email: normalizedUsername,
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "A user with this username already exists." });
    }

    const ticker = await User.create({
      name: name.trim(),
      email: normalizedUsername,
      password,
      role: "ticker",
      campusId: cafeUser.campusId,
      createdBy: req.userId,
    });

    res.status(201).json({ ticker });
  } catch (err) {
    logInternalError("create-ticker", err);
    sendServerError(res, "Could not create ticker");
  }
};

// Update ticker credentials
export const updateTicker = async (req, res) => {
  try {
    if (req.userRole !== "cafe") {
      return res.status(403).json({ message: "Access denied" });
    }
    const { id } = req.params;
    const ticker = await User.findById(id);
    if (
      !ticker ||
      ticker.role !== "ticker" ||
      Number(ticker.createdBy) !== Number(req.userId)
    ) {
      return res.status(404).json({ message: "Ticker not found" });
    }

    const { name, email, username, password } = req.body;
    const tickerUsername = username || email;
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (tickerUsername) {
      const normalizedUsername = tickerUsername.toLowerCase().trim();
      if (/\s/.test(normalizedUsername)) {
        return res.status(400).json({ message: "Username cannot contain spaces." });
      }
      if (!/^[a-zA-Z0-9_.-]+$/.test(normalizedUsername)) {
        return res.status(400).json({ message: "Username can only contain letters, numbers, dots, hyphens, and underscores." });
      }

      const existingUser = await User.findOne({
        email: normalizedUsername,
        excludeId: id,
      });
      if (existingUser) {
        return res.status(400).json({ message: "Username already in use." });
      }
      updateData.email = normalizedUsername;
    }
    if (password) {
      if (password.length < 6) {
        return res
          .status(400)
          .json({ message: "Password must be at least 6 characters" });
      }
      updateData.password = password;
    }

    const updated = await User.updateById(id, updateData);
    res.json({ ticker: updated });
  } catch (err) {
    logInternalError("update-ticker", err);
    sendServerError(res, "Could not update ticker");
  }
};

// Delete a ticker user
export const deleteTicker = async (req, res) => {
  try {
    if (req.userRole !== "cafe") {
      return res.status(403).json({ message: "Access denied" });
    }
    const { id } = req.params;
    const ticker = await User.findById(id);
    if (
      !ticker ||
      ticker.role !== "ticker" ||
      Number(ticker.createdBy) !== Number(req.userId)
    ) {
      return res.status(404).json({ message: "Ticker not found" });
    }

    await User.deleteById(id);
    res.json({ success: true });
  } catch (err) {
    logInternalError("delete-ticker", err);
    sendServerError(res, "Could not delete ticker");
  }
};

// Select active cafe station number
export const selectCafeNumber = async (req, res) => {
  try {
    const { cafeNumber } = req.body;
    const normalizedCafeNumber = Number(cafeNumber);
    await User.updateById(req.userId, {
      activeCafeNumber: normalizedCafeNumber,
    });
    res.json({ success: true, selectedCafeNumber: normalizedCafeNumber });
  } catch (err) {
    logInternalError("select-cafe-number", err);
    sendServerError(res, "Could not select cafe number");
  }
};
