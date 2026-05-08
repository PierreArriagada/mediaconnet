const { Router } = require('express');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const auditService = require('../services/audit.service');

const router = Router();

router.use(requireAuth);
router.use(requireRole('Administrador'));

function leerEntero(valor, fallback, max) {
  const numero = parseInt(valor, 10);
  if (!Number.isInteger(numero) || numero < 0) return fallback;
  return typeof max === 'number' ? Math.min(numero, max) : numero;
}

function leerFecha(valor) {
  if (!valor) return null;

  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
}

router.get('/logs', async (req, res) => {
  try {
    const limit = leerEntero(req.query.limit, 25, 100);
    const offset = leerEntero(req.query.offset, 0);

    const resultado = await auditService.obtenerLogs({
      categoria: req.query.categoria || null,
      tipoAccion: req.query.tipoAccion || null,
      busqueda: typeof req.query.busqueda === 'string' ? req.query.busqueda.trim() : '',
      desde: leerFecha(req.query.desde),
      hasta: leerFecha(req.query.hasta),
      limit,
      offset,
    });

    return res.json({
      logs: resultado.logs,
      paginacion: {
        total: resultado.total,
        limit: resultado.limit,
        offset: resultado.offset,
        paginas: Math.max(1, Math.ceil(resultado.total / resultado.limit)),
        pagina_actual: Math.floor(resultado.offset / resultado.limit) + 1,
      },
    });
  } catch (err) {
    console.error('Error obteniendo auditoría admin:', err);
    return res.status(500).json({ message: 'Error al obtener la auditoría.' });
  }
});

router.get('/resumen', async (_req, res) => {
  try {
    const resumen = await auditService.obtenerResumen();
    return res.json(resumen);
  } catch (err) {
    console.error('Error obteniendo resumen de auditoría:', err);
    return res.status(500).json({ message: 'Error al obtener el resumen de auditoría.' });
  }
});

module.exports = router;
