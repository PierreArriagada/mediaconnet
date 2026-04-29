const LOCALE_ES_CL = 'es-CL';
const FECHA_COMPLETA: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
};
const FECHA_LARGA: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
};
const FECHA_BENTO: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
};
const FECHA_DIA_MES: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
};
const FECHA_DIA_MES_ANIO: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
};
const FECHA_LARGA_CON_DIA: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
};
const FECHA_CON_HORA: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
};
const MES_ANIO: Intl.DateTimeFormatOptions = {
  month: 'long',
  year: 'numeric',
};

function fechaLocalDesdeIso(fecha: string | null | undefined): Date | null {
  if (!fecha) return null;

  const [year, month, day] = fecha.split('T')[0].split('-').map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function formatearFecha(
  fecha: string | null | undefined,
  options: Intl.DateTimeFormatOptions,
): string {
  const fechaLocal = fechaLocalDesdeIso(fecha);
  if (!fechaLocal) return '-';

  return fechaLocal.toLocaleDateString(LOCALE_ES_CL, options);
}

export function formatFechaCompleta(fecha: string | null | undefined): string {
  return formatearFecha(fecha, FECHA_COMPLETA);
}

export function formatFechaLarga(fecha: string | null | undefined): string {
  return formatearFecha(fecha, FECHA_LARGA);
}

export function formatFechaCorta(fecha: string | null | undefined): string {
  return formatearFecha(fecha, FECHA_BENTO);
}

export function formatFechaDiaMes(fecha: string | null | undefined): string {
  return formatearFecha(fecha, FECHA_DIA_MES);
}

export function formatFechaDiaMesAnio(fecha: string | null | undefined): string {
  return formatearFecha(fecha, FECHA_DIA_MES_ANIO);
}

export function formatFechaLargaConDia(fecha: string | null | undefined): string {
  return formatearFecha(fecha, FECHA_LARGA_CON_DIA);
}

export function formatFechaConHora(fecha: string | null | undefined): string {
  const fechaReal = fecha ? new Date(fecha) : null;
  if (!fechaReal || !Number.isFinite(fechaReal.getTime())) return '-';

  return fechaReal.toLocaleString(LOCALE_ES_CL, FECHA_CON_HORA);
}

export function formatMesAnio(fecha: Date): string {
  return fecha.toLocaleDateString(LOCALE_ES_CL, MES_ANIO);
}

export function formatHoraCorta(hora: string | null | undefined): string {
  return hora ? hora.slice(0, 5) : '-';
}

export function esHoy(fecha: string | null | undefined): boolean {
  const fechaLocal = fechaLocalDesdeIso(fecha);
  if (!fechaLocal) return false;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return fechaLocal.getTime() === hoy.getTime();
}

export function formatFechaCercana(fecha: string | null | undefined): string {
  const fechaLocal = fechaLocalDesdeIso(fecha);
  if (!fechaLocal) return '-';

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const diff = Math.round((fechaLocal.getTime() - hoy.getTime()) / 86_400_000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';

  return formatFechaDiaMes(fecha);
}

export function tiempoRelativoCorto(fechaISO: string): string {
  const fecha = new Date(fechaISO);
  const diffMs = Date.now() - fecha.getTime();

  if (!Number.isFinite(diffMs) || diffMs < 60_000) return 'Ahora';

  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return `Hace ${diffMin}m`;

  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH}h`;

  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Ayer';

  return `Hace ${diffD}d`;
}
