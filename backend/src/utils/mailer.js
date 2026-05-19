import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },

  pool: true,
  maxConnections: 5,
  maxMessages: 100,

  connectionTimeout: 15000,
  socketTimeout: 15000,
});

export const sendEmail = async ({ toEmail, subject, htmlContent }) => {
  try {
    if (!toEmail) throw new Error("Recipient email is required");

    const result = await transporter.sendMail({
      from: `"GibiGebeta" <${process.env.GMAIL_USER}>`,
      to: toEmail,
      subject,
      html: htmlContent,
    });

    console.log("Email sent successfully");
    return result;
  } catch (error) {
    console.error("Gmail SMTP Error:");
    console.error("Message:", error.message);
    console.error("Code:", error.code);

    throw new Error(error.message, { cause: error });
  }
};
