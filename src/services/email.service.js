const { mailFrom, transporter } = require("../config/mail");

const appName = "Portigo";
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

// Sends a normalized email message through the configured Nodemailer transport.
const sendEmail = async ({ to, subject, html, text }) => {
  if (!to) {
    return null;
  }

  return transporter.sendMail({
    from: mailFrom,
    to,
    subject,
    text,
    html
  });
};

const sendRegistrationEmail = async (user) =>
  sendEmail({
    to: user.email,
    subject: `Welcome to ${appName}`,
    text: `Welcome to ${appName}, ${user.name}. Your account is ready.`,
    html: `<p>Welcome to <strong>${appName}</strong>, ${user.name}.</p><p>Your account is ready.</p>`
  });

const sendPasswordResetEmail = async (user, resetUrl) =>
  sendEmail({
    to: user.email,
    subject: `${appName} password reset`,
    text: `Reset your password using this link: ${resetUrl}`,
    html: `<p>Use the link below to reset your password.</p><p><a href="${resetUrl}">Reset password</a></p><p>This link expires soon.</p>`
  });

const sendBookingConfirmationEmail = async ({ customer, creatorProfile, service, booking }) =>
  sendEmail({
    to: customer.email,
    subject: `${appName} booking confirmed`,
    text: `Your ${service.title} booking with ${creatorProfile.displayName} is confirmed.`,
    html: `<p>Your <strong>${service.title}</strong> booking with <strong>${creatorProfile.displayName}</strong> is confirmed.</p><p>Booking status: ${booking.status}</p>`
  });

const sendOrderConfirmationEmail = async ({ customer, order, service }) =>
  sendEmail({
    to: customer.email,
    subject: `${appName} order created`,
    text: `Your order ${order.orderNumber} for ${service.title} has been created.`,
    html: `<p>Your order <strong>${order.orderNumber}</strong> for <strong>${service.title}</strong> has been created.</p>`
  });

const sendPaymentSuccessEmail = async ({ customer, order, service }) =>
  sendEmail({
    to: customer.email,
    subject: `${appName} payment successful`,
    text: `Payment successful for order ${order.orderNumber}. Receipt: ${order.receiptUrl || frontendUrl}`,
    html: `<p>Payment successful for order <strong>${order.orderNumber}</strong>.</p><p>Service: ${service.title}</p><p>Amount: ${order.currency} ${order.amount}</p>`
  });

module.exports = {
  sendEmail,
  sendRegistrationEmail,
  sendPasswordResetEmail,
  sendBookingConfirmationEmail,
  sendOrderConfirmationEmail,
  sendPaymentSuccessEmail
};
