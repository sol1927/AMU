import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async ({
  toEmail,
  subject,
  htmlContent,
}) => {
  try {
    const { data, error } = await resend.emails.send({
      from: "GibiGebeta <onboarding@resend.dev>",
      to: [toEmail],
      subject,
      html: htmlContent,
    });

    if (error) {
      console.error("Resend Error:", error);
      throw new Error(error.message);
    }

    console.log("Email sent successfully:", data);

    return data;
  } catch (error) {
    console.error("Email failed:", error.message);
    throw error;
  }
};