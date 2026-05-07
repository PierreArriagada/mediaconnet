const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const {
  getDashboardMedico,
  getCitasParaMarcar,
  getCitasProximas,
  marcarAsistencia,
  getFichaPaciente,
  getPacientesMedico,
  getPerfilMedico,
  actualizarPerfilMedico,
  subirFotoPerfilMedico,
  cambiarPasswordMedico,
  getDisponibilidad,
  crearDisponibilidad,
  actualizarDisponibilidad,
  eliminarDisponibilidad,
  getNotificacionesMedico,
  actualizarEstadoNotificacionMedico,
  marcarNotificacionesLeidasMedico,
  limpiarNotificacionesMedico,
  eliminarNotificacionMedico,
} = require('../controllers/medico.controller');

// Carpeta persistente para imágenes de perfil médico.
const uploadsDir = path.join(__dirname, '../../uploads/perfiles');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase();
    const nombreSeguro = `medico-${Date.now()}${extension}`;
    cb(null, nombreSeguro);
  },
});

const uploadFotoPerfil = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter: (_req, file, cb) => {
    const permitidos = ['image/jpeg', 'image/png', 'image/webp'];

    if (!permitidos.includes(file.mimetype)) {
      return cb(new Error('Formato de imagen no permitido.'));
    }

    cb(null, true);
  },
});

const router = Router();

// Todas las rutas del módulo médico requieren JWT válido y rol Medico
router.use(requireAuth);
router.use(requireRole('Medico'));

router.get('/dashboard', getDashboardMedico);
router.get('/perfil', getPerfilMedico);
router.put('/perfil', actualizarPerfilMedico);
router.post(
  '/perfil/foto',
  uploadFotoPerfil.single('fotoPerfil'),
  subirFotoPerfilMedico
);
router.patch('/perfil/password', cambiarPasswordMedico);
router.get('/notificaciones', getNotificacionesMedico);
router.patch('/notificaciones/marcar-leidas', marcarNotificacionesLeidasMedico);
router.patch('/notificaciones/:id/leida', actualizarEstadoNotificacionMedico);
router.delete('/notificaciones', limpiarNotificacionesMedico);
router.delete('/notificaciones/:id', eliminarNotificacionMedico);
router.get('/citas-hoy', getCitasParaMarcar);
router.get('/citas-proximas', getCitasProximas);
router.get('/pacientes', getPacientesMedico);
router.get('/paciente/:idPaciente/ficha', getFichaPaciente);
router.patch('/cita/:idCita/marcar-asistencia', marcarAsistencia);

// Disponibilidad médica
router.get('/disponibilidad', getDisponibilidad);
router.post('/disponibilidad', crearDisponibilidad);
router.patch('/disponibilidad/:id', actualizarDisponibilidad);
router.delete('/disponibilidad/:id', eliminarDisponibilidad);

module.exports = router;
