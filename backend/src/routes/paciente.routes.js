const { Router } = require('express');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const {
  getDashboard,
  getEspecialidadesConBadge,
  getProfesionalesPorEspecialidad,
} = require('../controllers/paciente.controller');

const router = Router();

// Todas las rutas del módulo paciente requieren JWT válido y rol Paciente
router.use(requireAuth);
router.use(requireRole('Paciente'));

router.get('/dashboard', getDashboard);
router.get('/especialidades', getEspecialidadesConBadge);
router.get('/profesionales/:idEspecialidad', getProfesionalesPorEspecialidad);

module.exports = router;
