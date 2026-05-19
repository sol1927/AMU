import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_KEY,
  },
});

export const sendEmail = async ({
  toEmail,
  subject,
  htmlContent,
}) => {
  try {
<<<<<<< HEAD
    const result = await transporter.sendMail({
      from: "GibiGebeta <gibigebeta@gmail.com>",
      to: toEmail,
=======
    const { data, error } = await resend.emails.send({
      from: "GibiGebeta <onboarding@resend.dev>",
      to: [toEmail],
>>>>>>> 8cdfdd1efa9f557a524d7462dce65d9ff135e5e1
      subject,
      html: htmlContent,
    });

<<<<<<< HEAD
    console.log("Email sent successfully (Brevo SMTP)");
    return result;
  } catch (error) {
    console.error("--- Brevo SMTP Error Detail ---");
    console.error("Message:", error?.message);
    console.error("Code:", error?.code);
    console.error("Error:", error);
    console.error("--------------------------------");

    const wrappedError = new Error(
      error?.message || "Failed to send email via Brevo SMTP",
    );

    wrappedError.code = "BREVO_SMTP_ERROR";

    throw wrappedError;
=======
    if (error) {
      console.error("Resend Error:", error);
      throw new Error(error.message);
    }

    console.log("Email sent successfully:", data);

    return data;
  } catch (error) {
    console.error("Email failed:", error.message);
    throw error;
>>>>>>> 8cdfdd1efa9f557a524d7462dce65d9ff135e5e1
  }
};