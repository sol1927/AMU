import nodemailer from "nodemailer";

export const sendEmail = async ({ toEmail, toName, subject, htmlContent }) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"GibiGebeta" <${process.env.EMAIL_USER}>`,
      to: `${toName} <${toEmail}>`, // ✅ FIXED
      subject,
      html: htmlContent, // ✅ FIXED
    });

    console.log("Email sent successfully");
  } catch (error) {
    console.error("Email error:", error);
    throw error;
  }
};
