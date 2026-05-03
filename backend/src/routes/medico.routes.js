const { Router } = require('express');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const {
  getDashboardMedico,
  getCitasParaMarcar,
  getCitasProximas,
  marcarAsistencia,
  getFichaPaciente,
  getPacientesMedico,
  getPerfilMedico,
  getDisponibilidad,
  crearDisponibilidad,
  actualizarDisponibilidad,
  eliminarDisponibilidad,
  getNotificacionesMedico,
  actualizarEstadoNotificacionMedico,
  eliminarNotificacionMedico,
} = require('../controllers/medico.controller');

const router = Router();

// Todas las rutas del módulo médico requieren JWT válido y rol Medico
router.use(requireAuth);
router.use(requireRole('Medico'));

router.get('/dashboard', getDashboardMedico);
router.get('/perfil', getPerfilMedico);
router.get('/notificaciones', getNotificacionesMedico);
router.patch('/notificaciones/:id/leida', actualizarEstadoNotificacionMedico);
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
