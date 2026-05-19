import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 465,
  secure: true, // FIX: more stable on Render/cloud servers
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_KEY,
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 15000,
});

export const sendEmail = async ({ toEmail, subject, htmlContent }) => {
  try {
    if (!toEmail) throw new Error("Recipient email is required");

    const result = await transporter.sendMail({
      from: "GibiGebeta <gibigebeta@gmail.com>", // OK for now (your verified sender)
      to: toEmail,
      subject,
      html: htmlContent,
    });

    console.log("Email sent successfully (Brevo SMTP)");
    return result;
  } catch (error) {
    console.error("--- Brevo SMTP Error Detail ---");
    console.error("Message:", error?.message);
    console.error("Code:", error?.code);

    const wrappedError = new Error(
      error?.message || "Failed to send email via Brevo SMTP",
    );

    wrappedError.code = "BREVO_SMTP_ERROR";

    throw wrappedError;
  }
};
