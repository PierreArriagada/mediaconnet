const { Router } = require('express');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { getDashboard } = require('../controllers/paciente.controller');

const router = Router();

// Todas las rutas del módulo paciente requieren JWT válido y rol Paciente
router.use(requireAuth);
router.use(requireRole('Paciente'));

router.get('/dashboard', getDashboard);

module.exports = router;
