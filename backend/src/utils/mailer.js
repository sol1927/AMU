import nodemailer from "nodemailer";

export const sendEmail = async ({ toEmail, toName, subject, htmlContent }) => {
  // 1. Create the transporter using your Gmail credentials
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // 2. Define the email options
  const mailOptions = {
    from: `"GibiGebeta" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: subject,
    html: htmlContent,
  };

  try {
    // 3. Send the mail
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${toEmail}: ${info.messageId}`);
    return info;
  } catch (error) {
    // This will now catch "Missing credentials" or "Invalid Login"
    console.error("❌ SMTP Error:", error.message);
    throw error;
  }
};
