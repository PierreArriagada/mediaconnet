const express          = require('express');
const path             = require('path');
const helmet           = require('helmet');
const cors             = require('cors');
const rateLimit        = require('express-rate-limit');
const authRoutes       = require('./routes/auth.routes');
const pacienteRoutes   = require('./routes/paciente.routes');
const citasRoutes      = require('./routes/citas.routes');
const medicoRoutes     = require('./routes/medico.routes');
const adminRoutes      = require('./routes/admin.routes');
const auditRoutes      = require('./routes/audit.routes');
const errorHandler     = require('./middleware/error.middleware');
const { iniciarJobAutoAsignacion }   = require('./jobs/auto-asignacion.job');
const { iniciarJobAutoInasistencia } = require('./jobs/auto-inasistencia.job');

const app  = express();
const PORT = process.env.PORT || 3000;

// Cabeceras de seguridad HTTP (OWASP: Security Misconfiguration)
app.use(helmet());

// CORS: solo acepta peticiones del frontend en desarrollo
app.use(cors({
  origin: [
    'http://localhost:8100',
    'http://localhost:4200',
    'http://localhost',
    'https://localhost',
    'capacitor://localhost',
    'ionic://localhost',
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
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

// Archivos públicos persistentes (fotos de perfil, futuras evidencias, etc.)
app.use(
  '/uploads',
  express.static(path.join(__dirname, '../uploads'))
);

app.use('/api/auth',     authRoutes);
app.use('/api/paciente', pacienteRoutes);
app.use('/api/citas',    citasRoutes);
app.use('/api/medico',   medicoRoutes);
app.use('/api/admin/auditoria', auditRoutes);
app.use('/api/admin',    adminRoutes);

// Rutas no encontradas
app.use((_req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada.' });
});

// Manejador de errores global centralizado
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`API MediConnect corriendo en puerto ${PORT}`);
  // Iniciar job de auto-asignación de solicitudes de invitado
  iniciarJobAutoAsignacion();
  // Iniciar job de auto-inasistencia (marca citas confirmadas no atendidas tras 15 min)
  iniciarJobAutoInasistencia();
});
