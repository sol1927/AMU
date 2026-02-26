import nodemailer from "nodemailer";

export const createTransporter = () =>
  nodemailer.createTransport({
    // Fixed: changed createTransporter to createTransport
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // Must be false for 587
    requireTLS: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Adding this specific block helps Render talk to Gmail
    tls: {
      rejectUnauthorized: false, // Prevents certificate handshake timeouts
      minVersion: "TLSv1.2",
    },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 5000,
    logger: true, // Useful for seeing the SMTP conversation in Render logs
    debug: true,
  });
