import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

import { CitaPendienteConfirmacion } from './paciente.service';

const MC_CANAL_CITAS = 'mc-citas';
const MC_PREFIJO_RECORDATORIO = 'mc-recordatorio-confirmacion-';

@Injectable({ providedIn: 'root' })
export class NotificacionesNativasService {
  private readonly router = inject(Router);

  private inicializado = false;
  private listenerRegistrado = false;

  async inicializar(): Promise<void> {
    if (!this.esAndroidNativo() || this.inicializado) return;

    this.inicializado = true;

    try {
      await LocalNotifications.createChannel({
        id: MC_CANAL_CITAS,
        name: 'Citas MediConnect',
        description: 'Recordatorios y confirmaciones de citas medicas',
        importance: 5,
        visibility: 1,
        vibration: true,
        lights: true,
      });

      if (this.listenerRegistrado) return;

      await LocalNotifications.addListener('localNotificationActionPerformed', (evento) => {
        const idCita = Number(evento.notification.extra?.idCita);

        if (Number.isInteger(idCita) && idCita > 0) {
          void this.router.navigate(['/paciente', 'citas', idCita]);
          return;
        }

        void this.router.navigate(['/paciente', 'home']);
      });

      this.listenerRegistrado = true;
    } catch (error) {
      console.error('Error al inicializar notificaciones nativas:', error);
    }
  }

  async notificarConfirmacionPendiente(cita: CitaPendienteConfirmacion): Promise<void> {
    if (!this.esAndroidNativo()) return;

    await this.inicializar();

    const permisos = await this.obtenerPermisoNotificaciones();
    if (permisos !== 'granted') return;

    const huellaActual = this.huellaCita(cita);
    const claveStorage = this.claveRecordatorio(cita.id_cita);

    if (localStorage.getItem(claveStorage) === huellaActual) {
      return;
    }

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: this.idNotificacion(cita.id_cita),
            title: 'Confirma tu asistencia',
            body: `Tu cita con Dr. ${cita.medico_nombre} ${cita.medico_apellido} es el ${this.formatearFecha(cita.fecha_cita)} a las ${this.formatearHora(cita.hora_cita)}.`,
            channelId: MC_CANAL_CITAS,
            schedule: {
              at: new Date(Date.now() + 1000),
              allowWhileIdle: true,
            },
            extra: {
              idCita: cita.id_cita,
              origen: 'confirmacion-asistencia',
            },
          },
        ],
      });

      localStorage.setItem(claveStorage, huellaActual);
    } catch (error) {
      console.error('Error al programar la notificacion local:', error);
    }
  }

  async limpiarRecordatorioConfirmacion(cita: CitaPendienteConfirmacion | null): Promise<void> {
    if (!cita) return;

    localStorage.removeItem(this.claveRecordatorio(cita.id_cita));

    if (!this.esAndroidNativo()) return;

    try {
      await LocalNotifications.cancel({
        notifications: [{ id: this.idNotificacion(cita.id_cita) }],
      });
    } catch (error) {
      console.error('Error al limpiar la notificacion local:', error);
    }
  }

  private async obtenerPermisoNotificaciones(): Promise<string> {
    const estadoActual = await LocalNotifications.checkPermissions();
    if (estadoActual.display === 'granted') {
      return estadoActual.display;
    }

    const solicitud = await LocalNotifications.requestPermissions();
    return solicitud.display;
  }

  private esAndroidNativo(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  }

  private idNotificacion(idCita: number): number {
    return 200000 + idCita;
  }

  private claveRecordatorio(idCita: number): string {
    return `${MC_PREFIJO_RECORDATORIO}${idCita}`;
  }

  private huellaCita(cita: CitaPendienteConfirmacion): string {
    return [cita.id_cita, cita.fecha_cita, cita.hora_cita, cita.modalidad].join('|');
  }

  private formatearFecha(fecha: string): string {
    const [anio, mes, dia] = fecha.split('T')[0].split('-').map(Number);

    return new Date(anio, mes - 1, dia).toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  private formatearHora(hora: string): string {
    return hora.slice(0, 5);
  }
}