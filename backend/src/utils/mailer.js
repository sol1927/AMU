import nodemailer from "nodemailer";

export const sendEmail = async ({ toEmail, subject, htmlContent }) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"GibiGebeta" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject,
    html: htmlContent,
  };

  try {
    return await transporter.sendMail(mailOptions);
  } catch {
    throw new Error("Email delivery failed");
  }
};
