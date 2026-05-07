const { Router } = require('express');
const { body }   = require('express-validator');
const { getEspecialidades, crearCitaInvitado } = require('../controllers/citas.controller');
const { normalizeRut } = require('../utils/rut');

const router = Router();

// Validaciones de entrada para solicitud de cita invitado (OWASP A03)
// Nuevo flujo: sin fecha_preferente ni franja_horaria; el sistema asigna el slot más cercano.
const validarCitaInvitado = [
  body('nombre')
    .trim().notEmpty().withMessage('Nombre requerido.')
    .isLength({ max: 100 })
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s\-']+$/).withMessage('Nombre inválido.'),
  body('apellido')
    .trim().notEmpty().withMessage('Apellido requerido.')
    .isLength({ max: 100 })
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s\-']+$/).withMessage('Apellido inválido.'),
  body('rut')
    .trim().notEmpty().withMessage('RUT requerido.')
    .isLength({ max: 12 })
    .custom((rut) => normalizeRut(rut) !== null).withMessage('RUT inválido.'),
  body('telefono')
    .trim().notEmpty()
    .isLength({ min: 7, max: 20 }),
  body('correo')
    .trim().isEmail().withMessage('Correo inválido.')
    .normalizeEmail()
    .isLength({ max: 150 }),
  body('fecha_nacimiento')
    .isDate().withMessage('Fecha de nacimiento inválida.'),
  body('id_especialidad')
    .isInt({ min: 1 }).withMessage('Especialidad inválida.'),
  body('motivo_consulta')
    .trim().notEmpty().withMessage('Motivo requerido.')
    .isLength({ max: 255 }),
];

// Ruta pública: no requiere autenticación
router.get('/especialidades', getEspecialidades);
router.post('/invitado', validarCitaInvitado, crearCitaInvitado);

module.exports = router;
