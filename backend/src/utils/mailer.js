import nodemailer from "nodemailer";
export const createTransporter = () =>
  nodemailer.createTransport({
    service: "gmail", // Let Nodemailer handle the host/port logic
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Increased timeouts for slow cloud networks
    connectionTimeout: 30000, // 30 seconds
    greetingTimeout: 30000,
    socketTimeout: 30000,
    dnsTimeout: 30000,
    debug: true,
    logger: true,
  });
