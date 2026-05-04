require('dotenv').config();
require('ts-node/register');

const express          = require('express');
const helmet           = require('helmet');
const cors             = require('cors');
const rateLimit        = require('express-rate-limit');
const authRoutes       = require('./routes/auth.routes');
const pacienteRoutes   = require('./routes/paciente.routes');
const citasRoutes      = require('./routes/citas.routes');
const medicoRoutes     = require('./routes/medico.routes');
const adminRoutes      = require('./routes/admin.routes');
const errorHandler     = require('./middleware/error.middleware');
const { sendEmail }    = require('./services/email.service.ts');

const app  = express();
const PORT = process.env.PORT || 3000;

// Cabeceras de seguridad HTTP (OWASP: Security Misconfiguration)
app.use(helmet());

// CORS: solo acepta peticiones del frontend en desarrollo
app.use(cors({
  origin: ['http://localhost:8100', 'http://localhost:4200'],
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Limita el tamaño del cuerpo para prevenir ataques de payload masivo
app.use(express.json({ limit: '10kb' }));

// Rate limit global como segunda capa de protección
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use('/api/auth',     authRoutes);
app.use('/api/paciente', pacienteRoutes);
app.use('/api/citas',    citasRoutes);
app.use('/api/medico',   medicoRoutes);
app.use('/api/admin',    adminRoutes);

app.get('/api/test-email', async (req, res) => {
  const to = String(req.query.to || process.env.MAIL_FROM || 'test@example.com');

  try {
    await sendEmail({
      to,
      subject: 'Correo de prueba MediConnect',
      html: '<p>Este es un correo de prueba enviado desde el backend de MediConnect.</p>',
    });

    return res.json({ message: 'Correo de prueba enviado', to });
  } catch (err) {
    console.error('Error al enviar email de prueba:', err);
    return res.status(500).json({ message: 'Error enviando email de prueba' });
  }
});

// Rutas no encontradas
app.use((_req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada.' });
});

// Manejador de errores global centralizado
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`API MediConnect corriendo en puerto ${PORT}`);
});
