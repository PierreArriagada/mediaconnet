const { Router } = require('express');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const {
  getDashboardMedico,
  getCitasParaMarcar,
  getCitasProximas,
  marcarAsistencia,
  getFichaPaciente,
  getPacientesMedico,
} = require('../controllers/medico.controller');

const router = Router();

// Todas las rutas del módulo médico requieren JWT válido y rol Medico
router.use(requireAuth);
router.use(requireRole('Medico'));

router.get('/dashboard', getDashboardMedico);
router.get('/citas-hoy', getCitasParaMarcar);
router.get('/citas-proximas', getCitasProximas);
// Edu: listado inicial de pacientes asociados al profesional autenticado.
router.get('/pacientes', getPacientesMedico);
// Edu: ficha paciente para futuras vistas clínicas del profesional.
router.get('/paciente/:idPaciente/ficha', getFichaPaciente);
router.patch('/cita/:idCita/marcar-asistencia', marcarAsistencia);

module.exports = router;
