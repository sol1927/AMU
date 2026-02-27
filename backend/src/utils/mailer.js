// utils/mailer.js
import nodemailer from "nodemailer";

export const createTransporter = () =>
  nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false, // false for port 587
    auth: {
      user: process.env.BREVO_EMAIL, // Brevo SMTP login
      pass: process.env.BREVO_SMTP_KEY, // Brevo SMTP key
    },
    tls: {
      rejectUnauthorized: false, // fixes cloud host SSL issues
    },
  });
