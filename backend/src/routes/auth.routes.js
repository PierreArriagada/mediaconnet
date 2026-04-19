const { Router } = require('express');
const { body }   = require('express-validator');
const rateLimit  = require('express-rate-limit');
const { login, register, forgotPassword } = require('../controllers/auth.controller');

const router = Router();

// Rate limit estricto para todos los endpoints de autenticación (anti-fuerza bruta)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Demasiados intentos. Espera 15 minutos e intenta de nuevo.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginValidators = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 }),
];

const registerValidators = [
  body('nombre').trim().isLength({ min: 2, max: 100 })
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s\-']+$/),
  body('apellido').trim().isLength({ min: 2, max: 100 })
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s\-']+$/),
  body('correo').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('telefono').optional({ nullable: true }).trim().isLength({ max: 20 }),
  // RUT requerido: clave para vincular solicitudes de invitado con la nueva cuenta
  body('rut').trim().notEmpty().isLength({ min: 8, max: 12 }),
];

router.post('/login',           authLimiter, loginValidators,    login);
router.post('/register',        authLimiter, registerValidators, register);
router.post('/forgot-password', authLimiter,                     forgotPassword);

module.exports = router;
