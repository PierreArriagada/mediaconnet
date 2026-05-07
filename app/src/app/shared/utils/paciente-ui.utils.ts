const AVATAR_TEMAS = ['primary', 'tertiary', 'secondary'] as const;

const ICONOS_NOTIFICACION: Record<string, string> = {
  recordatorio: 'event_available',
  confirmacion: 'check_circle',
  cancelacion: 'cancel',
  reprogramacion: 'event_repeat',
  general: 'info',
};

export function inicialesPersona(nombre: string | null | undefined, apellido: string | null | undefined): string {
  return `${nombre?.charAt(0) ?? ''}${apellido?.charAt(0) ?? ''}`.toUpperCase();
}

export function temaAvatarPorId(id: number | null | undefined): string {
  const idSeguro = typeof id === 'number' && Number.isFinite(id) ? Math.abs(id) : 0;
  return AVATAR_TEMAS[idSeguro % AVATAR_TEMAS.length];
}

export function tituloMedicoPorNombre(nombre: string | null | undefined): string {
  return nombre?.trim().slice(-1).toLowerCase() === 'a' ? 'Dra.' : 'Dr.';
}

export function iconoNotificacionPaciente(tipo: string | null | undefined): string {
  return ICONOS_NOTIFICACION[tipo ?? ''] ?? 'notifications';
}
