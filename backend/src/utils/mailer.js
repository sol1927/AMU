import nodemailer from "nodemailer";

export const sendEmail = async ({ toEmail, toName, subject, htmlContent }) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 10000,
    });

    await transporter.sendMail({
      from: `"GibiGebeta" <${process.env.EMAIL_USER}>`,
      to: `${toName} <${toEmail}>`,
      subject,
      html: htmlContent,
    });

    console.log("✅ Email sent successfully");
  } catch (error) {
    console.error("❌ Email error:", error);
    throw error;
  }
};
