import nodemailer from 'nodemailer';

export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
}

const host = process.env.MAIL_HOST;
const port = process.env.MAIL_PORT ? parseInt(process.env.MAIL_PORT, 10) : undefined;
const user = process.env.MAIL_USER;
const pass = process.env.MAIL_PASS;
const from = process.env.MAIL_FROM;

if (!host || !port || !user || !pass || !from) {
  throw new Error('Mail configuration incomplete. Please set MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS and MAIL_FROM.');
}

const transporter = nodemailer.createTransport({
  host,
  port,
  auth: { user, pass },
  secure: port === 465,
});

export async function sendEmail({ to, subject, html }: SendEmailPayload) {
  const mailOptions = {
    from,
    to,
    subject,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
}
