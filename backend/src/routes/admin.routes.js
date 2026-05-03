const { Router } = require('express');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const {
  getMedicos,
  getDisponibilidadMedico,
  crearDisponibilidadMedico,
  actualizarDisponibilidadMedico,
  eliminarDisponibilidadMedico,
  getMedicosGestion,
  getMedicoDetalle,
  crearMedico,
  editarPerfilMedico,
  cambiarEstadoLaboral,
  getEspecialidades,
  getPacientes,
  getPacienteDetalle,
  getCitaDetalle,
} = require('../controllers/admin.controller');

const router = Router();

// Todas las rutas admin requieren JWT válido y rol Administrador
router.use(requireAuth);
router.use(requireRole('Administrador'));

// ── Médicos (horarios) — orden importa: /gestion antes de /:id ──────────────
router.get('/medicos', getMedicos);
router.get('/medicos/gestion', getMedicosGestion);
router.post('/medicos', crearMedico);
router.get('/medicos/:id/detalle', getMedicoDetalle);
router.put('/medicos/:id/perfil', editarPerfilMedico);
router.patch('/medicos/:id/estado-laboral', cambiarEstadoLaboral);

// ── Disponibilidad ──────────────────────────────────────────────────────────
router.get('/medicos/:id/disponibilidad', getDisponibilidadMedico);
router.post('/medicos/:id/disponibilidad', crearDisponibilidadMedico);
router.patch('/disponibilidad/:id', actualizarDisponibilidadMedico);
router.delete('/disponibilidad/:id', eliminarDisponibilidadMedico);

// ── Catálogos ───────────────────────────────────────────────────────────────
router.get('/especialidades', getEspecialidades);

// ── Pacientes ───────────────────────────────────────────────────────────────
router.get('/pacientes', getPacientes);
router.get('/pacientes/:id', getPacienteDetalle);

// ── Citas (detalle individual) ──────────────────────────────────────────────
router.get('/citas/:id', getCitaDetalle);

module.exports = router;
