import nodemailer from "nodemailer";

export const createTransporter = () =>
  nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465, // Try 465 one last time with secure: true
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // This is the secret sauce for cloud timeouts:
    connectionTimeout: 20000, // 20 seconds
    greetingTimeout: 20000,
    socketTimeout: 20000,
  });
