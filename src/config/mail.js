const nodemailer = require("nodemailer");

const hasSmtpConfig = Boolean(process.env.SMTP_HOST);

const transporter = hasSmtpConfig
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        : undefined
    })
  : nodemailer.createTransport({ jsonTransport: true });

module.exports = {
  transporter,
  mailFrom: process.env.MAIL_FROM || "Portigo <no-reply@portigo.local>"
};
