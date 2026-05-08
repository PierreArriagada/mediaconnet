const pool = require('../db/pool');

const METODOS_AUDITABLES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function limitarTexto(valor, max) {
  if (!valor) return null;
  return String(valor).slice(0, max);
}

function obtenerIp(req) {
  return limitarTexto(
    req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.ip
      || req.socket?.remoteAddress
      || null,
    45,
  );
}

function accionDesdeMetodo(method) {
  switch (method) {
    case 'POST':
      return 'CREATE';
    case 'DELETE':
      return 'DELETE';
    case 'PUT':
    case 'PATCH':
      return 'UPDATE';
    default:
      return 'VIEW';
  }
}

function categoriaDesdePath(pathname) {
  if (pathname.includes('/medicos')) return 'MEDICO';
  if (pathname.includes('/especialidades')) return 'ESPECIALIDAD';
  if (pathname.includes('/pacientes')) return 'PACIENTE';
  if (pathname.includes('/citas')) return 'CITA';
  if (pathname.includes('/solicitudes')) return 'SOLICITUD';
  if (pathname.includes('/disponibilidad')) return 'DISPONIBILIDAD';
  if (pathname.includes('/perfil')) return 'PERFIL_ADMIN';
  return 'SEGURIDAD';
}

function entidadDesdePath(pathname) {
  const partes = pathname.split('/').filter(Boolean);
  const indice = partes.findIndex((parte) => /^\d+$/.test(parte));

  if (indice === -1) {
    return { entidadTipo: null, entidadId: null };
  }

  return {
    entidadTipo: partes[indice - 1] || null,
    entidadId: parseInt(partes[indice], 10),
  };
}

async function registrarEventoAdmin({ req, statusCode, duracionMs }) {
  const idUsuario = parseInt(req.user?.id, 10);

  if (!Number.isInteger(idUsuario)) {
    return;
  }

  const pathname = req.path || req.originalUrl || '';
  const { entidadTipo, entidadId } = entidadDesdePath(pathname);
  const estado = statusCode >= 400 ? 'error' : 'completado';

  await pool.query(
    `INSERT INTO audit_log (
       id_usuario_admin,
       nombre_usuario_admin,
       email_usuario_admin,
       tipo_accion,
       categoria,
       entidad_tipo,
       entidad_id,
       ip_origen,
       user_agent,
       endpoint_api,
       metodo_http,
       codigo_respuesta,
       duracion_ms,
       estado,
       mensaje_error
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [
      idUsuario,
      limitarTexto(req.user?.name || 'Administrador', 200),
      limitarTexto(req.user?.email || 'sin-correo@mediconnect.local', 150),
      accionDesdeMetodo(req.method),
      categoriaDesdePath(pathname),
      limitarTexto(entidadTipo, 50),
      entidadId,
      obtenerIp(req),
      limitarTexto(req.get('user-agent'), 500),
      limitarTexto(req.originalUrl, 200),
      limitarTexto(req.method, 10),
      statusCode,
      duracionMs,
      estado,
      estado === 'error' ? `HTTP ${statusCode}` : null,
    ],
  );
}

async function registrarLoginAdmin({ req, user, duracionMs = 0 }) {
  try {
    const idUsuario = parseInt(user?.id, 10);

    if (!Number.isInteger(idUsuario) || user?.role !== 'Administrador') {
      return;
    }

    await pool.query(
      `INSERT INTO audit_log (
         id_usuario_admin,
         nombre_usuario_admin,
         email_usuario_admin,
         tipo_accion,
         categoria,
         ip_origen,
         user_agent,
         endpoint_api,
         metodo_http,
         codigo_respuesta,
         duracion_ms,
         estado
       ) VALUES ($1, $2, $3, 'LOGIN', 'SEGURIDAD', $4, $5, $6, $7, 200, $8, 'completado')`,
      [
        idUsuario,
        limitarTexto(user.name || 'Administrador', 200),
        limitarTexto(user.email || 'sin-correo@mediconnect.local', 150),
        obtenerIp(req),
        limitarTexto(req.get('user-agent'), 500),
        limitarTexto(req.originalUrl, 200),
        limitarTexto(req.method, 10),
        duracionMs,
      ],
    );
  } catch (err) {
    console.error('Error registrando login admin:', err.message);
  }
}

function auditarAccionAdmin(req, res, next) {
  if (!METODOS_AUDITABLES.has(req.method) || req.originalUrl.startsWith('/api/admin/auditoria')) {
    return next();
  }

  const inicio = Date.now();

  res.on('finish', () => {
    registrarEventoAdmin({
      req,
      statusCode: res.statusCode,
      duracionMs: Date.now() - inicio,
    }).catch((err) => {
      console.error('Error registrando auditoría admin:', err.message);
    });
  });

  return next();
}

function agregarFiltro(queryParts, params, campo, valor, operador = '=') {
  if (!valor) return;
  params.push(valor);
  queryParts.push(`${campo} ${operador} $${params.length}`);
}

async function obtenerLogs(filtros = {}) {
  const {
    categoria,
    tipoAccion,
    busqueda,
    desde,
    hasta,
    limit = 25,
    offset = 0,
  } = filtros;

  const condiciones = [];
  const params = [];

  agregarFiltro(condiciones, params, 'categoria', categoria);
  agregarFiltro(condiciones, params, 'tipo_accion', tipoAccion);

  if (desde) {
    agregarFiltro(condiciones, params, 'fecha_evento', desde, '>=');
  }

  if (hasta) {
    agregarFiltro(condiciones, params, 'fecha_evento', hasta, '<=');
  }

  if (busqueda) {
    params.push(`%${busqueda}%`);
    condiciones.push(`(
      nombre_usuario_admin ILIKE $${params.length}
      OR email_usuario_admin ILIKE $${params.length}
      OR endpoint_api ILIKE $${params.length}
      OR entidad_tipo ILIKE $${params.length}
    )`);
  }

  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

  const dataParams = [...params, limit, offset];
  const dataResult = await pool.query(
    `SELECT
       id_audit_log,
       id_usuario_admin,
       nombre_usuario_admin,
       email_usuario_admin,
       tipo_accion,
       categoria,
       entidad_tipo,
       entidad_id,
       ip_origen,
       endpoint_api,
       metodo_http,
       codigo_respuesta,
       fecha_evento,
       duracion_ms,
       estado
     FROM audit_log
     ${where}
     ORDER BY fecha_evento DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    dataParams,
  );

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM audit_log ${where}`,
    params,
  );

  return {
    logs: dataResult.rows,
    total: countResult.rows[0]?.total || 0,
    limit,
    offset,
  };
}

async function obtenerResumen() {
  const result = await pool.query(
    `SELECT
       COUNT(*)::int AS total_eventos,
       COUNT(*) FILTER (WHERE fecha_evento >= CURRENT_DATE)::int AS eventos_hoy,
       COUNT(*) FILTER (WHERE estado = 'error')::int AS eventos_error,
       COUNT(DISTINCT id_usuario_admin)::int AS administradores
     FROM audit_log`,
  );

  return result.rows[0] || {
    total_eventos: 0,
    eventos_hoy: 0,
    eventos_error: 0,
    administradores: 0,
  };
}

module.exports = {
  auditarAccionAdmin,
  obtenerLogs,
  obtenerResumen,
  registrarLoginAdmin,
  registrarEventoAdmin,
};
