const nodemailer = require('nodemailer');

const host = process.env.MAIL_HOST;
const port = process.env.MAIL_PORT ? parseInt(process.env.MAIL_PORT, 10) : undefined;
const user = process.env.MAIL_USER;
const pass = process.env.MAIL_PASS;
const from = process.env.MAIL_FROM;

if (!host || !port || !user || !pass || !from) {
  console.warn('Mail configuration incomplete. Please set MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS and MAIL_FROM.');
}

const transporter = nodemailer.createTransport({
  host,
  port,
  auth: { user, pass },
  secure: port === 465,
});

async function sendEmail({ to, subject, html }) {
  const mailOptions = {
    from,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (err) {
    console.error('Error sending email:', err);
    throw err;
  }
}

module.exports = { sendEmail };
