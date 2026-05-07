import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

let connection;

export const connectDB = async () => {
  try {
    const tempConnection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    await tempConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``,
    );

    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    await tempConnection.end();

    console.log("Database connected");
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

export const getDB = () => {
  if (!connection) {
    throw new Error("Database not connected. Call connectDB first.");
  }
  return connection;
};
