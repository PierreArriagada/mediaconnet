const { Router } = require('express');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const {
  getDashboard,
  getEspecialidadesConBadge,
  getProfesionalesPorEspecialidad,
  getDetalleMedico,
  getDisponibilidadMedico,
  crearCitaPaciente,
  getDetalleCita,
  cancelarCita,
  reagendarCita,
  getHistorialCitas,
} = require('../controllers/paciente.controller');

const router = Router();

// Todas las rutas del módulo paciente requieren JWT válido y rol Paciente
router.use(requireAuth);
router.use(requireRole('Paciente'));

router.get('/dashboard', getDashboard);
router.get('/especialidades', getEspecialidadesConBadge);
router.get('/profesionales/:idEspecialidad', getProfesionalesPorEspecialidad);
router.get('/medico/:idMedico', getDetalleMedico);
router.get('/medico/:idMedico/disponibilidad', getDisponibilidadMedico);
router.post('/reservar', crearCitaPaciente);
router.get('/cita/:idCita', getDetalleCita);
router.patch('/cita/:idCita/cancelar', cancelarCita);
router.patch('/cita/:idCita/reagendar', reagendarCita);
router.get('/historial', getHistorialCitas);

module.exports = router;
