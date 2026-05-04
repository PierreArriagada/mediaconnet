console.log('ARCHIVO TEST-MAIL EJECUTADO');

require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('HOST:', process.env.MAIL_HOST);
console.log('PORT:', process.env.MAIL_PORT);
console.log('USER:', process.env.MAIL_USER ? 'OK' : 'NO CARGADO');
console.log('PASS:', process.env.MAIL_PASS ? 'OK' : 'NO CARGADO');

async function run() {
  try {
    console.log('Creando transporter...');

    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    console.log('Verificando conexión...');
    await transporter.verify();

    console.log('Enviando correo...');
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: 'demo@test.com',
      subject: 'Prueba Mailtrap',
      html: '<h1>Correo funcionando</h1>',
    });

    console.log('CORREO ENVIADO:', info.messageId);
  } catch (error) {
    console.error('ERROR:', error);
  } finally {
    console.log('FIN DEL SCRIPT');
    process.exit(0);
  }
}

run();