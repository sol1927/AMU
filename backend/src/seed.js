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

    const existingAdmin = await User.findOne({ role: "admin" });

    if (!existingAdmin) {
      await User.create({
        name: "System Admin",
        email: adminEmail,
        password: adminPassword,
        role: "admin",
        mustChangePassword: true,
      });

      console.log("Default admin created");
    } else {
      console.log("Admin already exists, skipping...");
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
