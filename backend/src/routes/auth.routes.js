const { Router } = require('express');
const { body }   = require('express-validator');
const rateLimit  = require('express-rate-limit');
<<<<<<< Updated upstream
const { login, register, forgotPassword } = require('../controllers/auth.controller');
=======
const { login, register, forgotPassword, resetPassword, changePassword } = require('../controllers/auth.controller');
>>>>>>> Stashed changes

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

const changePasswordValidators = [
  body('userId').notEmpty().isInt().toInt(),
  body('currentPassword').isLength({ min: 1 }),
  body('newPassword').isLength({ min: 8 }),
  body('confirmPassword').isLength({ min: 8 }),
];

router.post('/login',           authLimiter, loginValidators,    login);
router.post('/register',        authLimiter, registerValidators, register);
router.post('/forgot-password', authLimiter,                     forgotPassword);
<<<<<<< Updated upstream
=======
router.post('/reset-password',  authLimiter,                     resetPassword);
router.post('/change-password', authLimiter, changePasswordValidators, changePassword);
>>>>>>> Stashed changes

module.exports = router;
