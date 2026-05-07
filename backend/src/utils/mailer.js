import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async ({ toEmail, subject, htmlContent }) => {
  try {
    const result = await resend.emails.send({
      from: "GibiGebeta <onboarding@resend.dev>",
      to: [toEmail],
      subject,
      html: htmlContent,
    });

    console.log("Email sent successfully");
    return result;
  } catch (error) {
    console.error("--- Resend API Error Detail ---");
    console.error("Message:", error?.message);
    console.error("Name:", error?.name);
    console.error("Error:", error);
    console.error("--------------------------------");

    const wrappedError = new Error(
      error?.message || "Failed to send email via Resend",
    );

    wrappedError.code = "RESEND_ERROR";

    throw wrappedError;
  }
};
