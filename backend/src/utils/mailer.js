// utils/mailer.js
import SibApiV3Sdk from "sib-api-v3-sdk";

const client = SibApiV3Sdk.ApiClient.instance;
const apiKey = client.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

export const sendEmail = async ({ toEmail, toName, subject, htmlContent }) => {
  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

  try {
    await apiInstance.sendTransacEmail({
      sender: { name: "GibiGebeta", email: process.env.BREVO_EMAIL },
      to: [{ email: toEmail, name: toName }],
      subject,
      htmlContent,
    });
    console.log(`Email sent successfully to ${toEmail}`);
  } catch (err) {
    console.error("Brevo API Error:", err);
    throw err; // throw so your requestOTP can handle it
  }
};
