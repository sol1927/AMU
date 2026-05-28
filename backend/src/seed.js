import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import User from "./models/user.model.js";

dotenv.config();

export const seedDatabase = async () => {
  try {
    console.log("Seeding database...");

    const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.log("Missing admin credentials in .env");
      return;
    }

    // Seed admin
    const existingAdmin = await User.findOne({ role: "admin" });
    let adminUser = existingAdmin;
    if (!existingAdmin) {
      adminUser = await User.create({
        name: "System Admin",
        email: adminEmail,
        password: adminPassword,
        role: "admin",
        mustChangePassword: true,
      });
      console.log("Default admin created");
    } else {
      await User.updateById(existingAdmin.id, { mustChangePassword: true });
      adminUser = await User.findById(existingAdmin.id);
      console.log("Admin already exists, reset mustChangePassword to true");
    }

    // Seed campus profile if env values provided
    const campusEmail = process.env.INITIAL_CAMPUS_EMAIL;
    const campusPassword = process.env.INITIAL_CAMPUS_PASSWORD;
    const campusId = process.env.INITIAL_CAMPUS_ID || 1;
    let campusName = process.env.INITIAL_CAMPUS_NAME || "System Campus";
    const campusLocation = process.env.INITIAL_CAMPUS_LOCATION || "";
    const cafeCount = process.env.INITIAL_CAMPUS_CAFE_COUNT || 1;
    let campusUser = null;

    if (campusEmail && campusPassword) {
      const existingCampus = await User.findOne({
        email: campusEmail,
        role: "campus",
      });
      campusUser = existingCampus;
      if (!existingCampus) {
        campusUser = await User.create({
          name: campusName,
          email: campusEmail,
          password: campusPassword,
          campusId: Number(campusId),
          location: campusLocation,
          cafeCount: Number(cafeCount),
          role: "campus",
          mustChangePassword: true,
          createdBy: adminUser?.id || adminUser?._id,
        });
        console.log("Default campus profile created");
      } else {
        await User.updateById(existingCampus.id, { mustChangePassword: true });
        campusUser = await User.findById(existingCampus.id);
        console.log(
          "Campus profile already exists, reset mustChangePassword to true",
        );
      }
    } else {
      console.log(
        "Campus profile env values missing or incomplete, skipping campus seed...",
      );
    }

    // Seed cafe (username only, not email)
    const cafeUsername = process.env.INITIAL_CAFE_USERNAME;
    const cafePassword = process.env.INITIAL_CAFE_PASSWORD;
    let cafeUser = null;

    if (cafeUsername && cafePassword && campusUser) {
      const existingCafe = await User.findOne({
        name: cafeUsername,
        role: "cafe",
      });
      cafeUser = existingCafe;
      if (!existingCafe) {
        cafeUser = await User.create({
          name: cafeUsername,
          email: null, // ensure email is null, not undefined
          password: cafePassword,
          role: "cafe",
          mustChangePassword: true,
          campusId: campusUser.campusId || campusUser.id,
          createdBy: campusUser.id,
        });
        console.log("Default cafe created");
      } else {
        await User.updateById(existingCafe.id, { mustChangePassword: true });
        cafeUser = await User.findById(existingCafe.id);
        console.log("Cafe already exists, reset mustChangePassword to true");
      }
    } else {
      console.log(
        "Cafe env values missing or campus missing, skipping cafe seed...",
      );
    }

    // Seed cafe manager (must have email)
    const cafeManagerEmail = process.env.INITIAL_CAFE_MANAGER_EMAIL;
    const cafeManagerPassword = process.env.INITIAL_CAFE_MANAGER_PASSWORD;
    let cafeManagerUser = null;

    if (cafeManagerEmail && cafeManagerPassword && campusUser) {
      const existingCafeManager = await User.findOne({
        email: cafeManagerEmail,
        role: "cafe manager",
      });
      cafeManagerUser = existingCafeManager;
      if (!existingCafeManager) {
        cafeManagerUser = await User.create({
          name: "Default Cafe Manager",
          email: cafeManagerEmail,
          password: cafeManagerPassword,
          role: "cafe manager",
          mustChangePassword: true,
          campusId: campusUser.campusId || campusUser.id,
          createdBy: campusUser.id,
        });
        console.log("Default cafe manager created");
      } else {
        await User.updateById(existingCafeManager.id, {
          mustChangePassword: true,
        });
        cafeManagerUser = await User.findById(existingCafeManager.id);
        console.log(
          "Cafe manager already exists, reset mustChangePassword to true",
        );
      }
    } else {
      console.log(
        "Cafe manager env values missing or campus missing, skipping cafe manager seed...",
      );
    }

    console.log("Seeding completed");
  } catch (error) {
    if (error.code === "ER_NO_SUCH_TABLE") {
      console.error("Tables not found.");
      console.error("Run: npm run dev first");
    } else if (error.code === "ER_BAD_DB_ERROR") {
      console.error("Database not found.");
      console.error("Check your DB_NAME or run the server first.");
    } else {
      console.error("Seeding failed:", error.message);
    }
  }
};

await connectDB();
await seedDatabase();
process.exit(0);
