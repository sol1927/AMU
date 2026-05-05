import nodemailer from "nodemailer";

const EMAIL_NETWORK_ERROR_CODES = new Set([
  "EAI_AGAIN",
  "ECONNECTION",
  "ECONNREFUSED",
  "ECONNRESET",
  "ENETUNREACH",
  "ENOTFOUND",
  "ESOCKET",
  "ETIMEDOUT",
]);

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
  } catch (error) {
    const details = `${error?.message || ""} ${error?.response || ""} ${error?.syscall || ""} ${error?.command || ""}`.trim();
    const isTransportFailureWithoutSmtpResponse =
      !error?.responseCode && error?.code !== "EAUTH";
    const isNetworkIssue =
      isTransportFailureWithoutSmtpResponse ||
      EMAIL_NETWORK_ERROR_CODES.has(error?.code) ||
      /resolve ipv4|resolve|network|connection|timeout|dns|getaddrinfo|lookup|socket|connect|greeting/i.test(
        details,
      );

    const wrappedError = new Error(
      isNetworkIssue
        ? "No internet connection. Please check your network and try again."
        : "We could not send the email right now. Please try again in a moment.",
    );

    wrappedError.name = "EmailDeliveryError";
    wrappedError.code = isNetworkIssue
      ? "EMAIL_NETWORK_ERROR"
      : "EMAIL_DELIVERY_FAILED";
    wrappedError.logMessage = isNetworkIssue
      ? "Email delivery failed: network unavailable"
      : "Email delivery failed";

    throw wrappedError;
  }
};
