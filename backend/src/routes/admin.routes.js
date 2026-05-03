const { Router } = require('express');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const {
  getMedicos,
  getDisponibilidadMedico,
  crearDisponibilidadMedico,
  actualizarDisponibilidadMedico,
  eliminarDisponibilidadMedico,
} = require('../controllers/admin.controller');

const router = Router();

// Todas las rutas admin requieren JWT válido y rol Administrador
router.use(requireAuth);
router.use(requireRole('Administrador'));

// Médicos
router.get('/medicos', getMedicos);

// Disponibilidad de un médico específico
router.get('/medicos/:id/disponibilidad', getDisponibilidadMedico);
router.post('/medicos/:id/disponibilidad', crearDisponibilidadMedico);

// Operaciones sobre un bloque individual
router.patch('/disponibilidad/:id', actualizarDisponibilidadMedico);
router.delete('/disponibilidad/:id', eliminarDisponibilidadMedico);

module.exports = router;
