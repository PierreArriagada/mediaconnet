const nodemailer = require('nodemailer');

/**
 * Configuración del transporter de nodemailer para Mailtrap
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    secure: false, // Mailtrap usa STARTTLS, no SSL
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });
};

/**
 * Envía un correo electrónico
 * @param {Object} options - Opciones del correo
 * @param {string} options.to - Destinatario
 * @param {string} options.subject - Asunto
 * @param {string} options.html - Contenido HTML
 * @param {string} [options.from] - Remitente (opcional, usa MAIL_FROM por defecto)
 * @returns {Promise<Object>} Información del envío
 */
const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();

    // Verificar conexión antes de enviar
    await transporter.verify();

    const mailOptions = {
      from: options.from || process.env.MAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Correo enviado:', info.messageId);

    return info;
  } catch (error) {
    console.error('Error enviando correo:', error);
    throw error;
  }
};

/**
 * Envía correo de recuperación de contraseña
 * @param {string} email - Correo del usuario
 * @param {string} resetToken - Token de recuperación
 * @returns {Promise<Object>} Información del envío
 */
const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:8100'}/auth/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Recupera tu contraseña - MediaConnect</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Recupera tu contraseña</h1>
        </div>
        <div class="content">
          <p>Hola,</p>
          <p>Has solicitado restablecer tu contraseña en MediaConnect. Haz clic en el botón de abajo para crear una nueva contraseña:</p>

          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
          </div>

          <p><strong>Este enlace expirará en 1 hora.</strong></p>

          <p>Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña permanecerá sin cambios.</p>

          <p>Si el botón no funciona, copia y pega esta URL en tu navegador:</p>
          <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">${resetUrl}</p>
        </div>
        <div class="footer">
          <p>MediaConnect - Tu salud, nuestra prioridad</p>
          <p>Si tienes problemas, contacta a soporte@mediaconnect.cl</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Recupera tu contraseña - MediaConnect',
    html: html,
  });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
};