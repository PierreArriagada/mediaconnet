import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonContent, IonSpinner, ToastController } from '@ionic/angular/standalone';

import { AdminService, SolicitudAdminItem, MedicoAlternativa, SlotAlternativa } from '../../../../core/services/admin.service';
import { AuthService } from '../../../../core/services/auth.service';
import { AdminHeaderComponent } from '../../../../shared/components/admin-header/admin-header.component';
import { AdminBottomNavComponent } from '../../../../shared/components/admin-bottom-nav/admin-bottom-nav.component';

@Component({
  selector: 'app-solicitudes',
  templateUrl: './solicitudes.page.html',
  styleUrls: ['./solicitudes.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonSpinner,
    AdminHeaderComponent,
    AdminBottomNavComponent,
  ],
})
export class SolicitudesPage implements OnInit, OnDestroy {
  private readonly adminSvc    = inject(AdminService);
  private readonly auth        = inject(AuthService);
  private readonly route       = inject(ActivatedRoute);
  private readonly router      = inject(Router);
  private readonly toastCtrl   = inject(ToastController);

  user = this.auth.getCurrentUser();

  cargando      = signal(true);
  errorCarga    = signal(false);
  solicitudes   = signal<SolicitudAdminItem[]>([]);

  /** id_cita cuyo panel de reasignación está abierto */
  reasignandoId = signal<number | null>(null);
  alternativas  = signal<MedicoAlternativa[]>([]);
  cargandoAlts  = signal(false);

  /** Acción en curso (id_cita) para mostrar spinner */
  accionEnCurso = signal<number | null>(null);
  solicitudDestacadaId = signal<number | null>(null);

  private pollingId: ReturnType<typeof setInterval> | null = null;
  private timerIds: ReturnType<typeof setInterval>[] = [];
  private solicitudDestacadaEnfocada = false;

  ngOnInit(): void {
    const solicitud = Number.parseInt(this.route.snapshot.queryParamMap.get('solicitud') ?? '', 10);
    this.solicitudDestacadaId.set(Number.isFinite(solicitud) && solicitud > 0 ? solicitud : null);
    this.cargar();
    // Recargar cada 30s para actualizar la cuenta regresiva desde el servidor
    this.pollingId = setInterval(() => this.cargar(), 30_000);
  }

  ngOnDestroy(): void {
    if (this.pollingId) clearInterval(this.pollingId);
    this.timerIds.forEach(id => clearInterval(id));
  }

  cargar(): void {
    this.adminSvc.getSolicitudes().subscribe({
      next: (data) => {
        this.solicitudes.set(data);
        this.cargando.set(false);
        this.errorCarga.set(false);
        this.enfocarSolicitudDestacada();
      },
      error: () => {
        this.cargando.set(false);
        this.errorCarga.set(true);
      },
    });
  }

  private enfocarSolicitudDestacada(): void {
    const idSolicitud = this.solicitudDestacadaId();
    if (!idSolicitud || this.solicitudDestacadaEnfocada) return;

    setTimeout(() => {
      const elemento = document.getElementById(`solicitud-${idSolicitud}`);
      if (!elemento) return;

      this.solicitudDestacadaEnfocada = true;
      elemento.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 0);
  }

  // ── Countdown ────────────────────────────────────────────────────────────

  /**
   * Devuelve la cadena de tiempo restante a partir de tiempo_restante_seg.
   * Negativo = ya venció (el job lo procesará en el próximo ciclo).
   */
  countdown(seg: number): string {
    if (seg <= 0) return 'Vencido — pendiente de procesamiento';
    const h = Math.floor(seg / 3600);
    const m = Math.floor((seg % 3600) / 60);
    const s = seg % 60;
    if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
    if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
    return `${s}s`;
  }

  urgente(seg: number): boolean {
    return seg > 0 && seg <= 1800; // últimos 30 minutos
  }

  // ── Confirmar ────────────────────────────────────────────────────────────

  async confirmar(solicitud: SolicitudAdminItem): Promise<void> {
    this.accionEnCurso.set(solicitud.id_cita);
    this.adminSvc.confirmarSolicitud(solicitud.id_cita).subscribe({
      next: async () => {
        this.accionEnCurso.set(null);
        this.solicitudes.update(list => list.filter(s => s.id_cita !== solicitud.id_cita));
        await this.mostrarToast(
          `Cita de ${solicitud.nombre_invitado} confirmada con Dr. ${solicitud.medico_apellido}`,
          'success'
        );
      },
      error: async (err) => {
        this.accionEnCurso.set(null);
        await this.mostrarToast(err?.error?.message ?? 'Error al confirmar', 'danger');
      },
    });
  }

  // ── Reasignar ─────────────────────────────────────────────────────────────

  abrirReasignar(idCita: number): void {
    if (this.reasignandoId() === idCita) {
      this.reasignandoId.set(null);
      return;
    }
    this.reasignandoId.set(idCita);
    this.alternativas.set([]);
    this.cargandoAlts.set(true);

    this.adminSvc.getSolicitudAlternativas(idCita).subscribe({
      next: (data) => {
        this.alternativas.set(data);
        this.cargandoAlts.set(false);
      },
      error: async () => {
        this.cargandoAlts.set(false);
        await this.mostrarToast('No se pudieron cargar alternativas', 'danger');
      },
    });
  }

  async elegirSlot(solicitud: SolicitudAdminItem, slot: SlotAlternativa): Promise<void> {
    this.accionEnCurso.set(solicitud.id_cita);
    this.adminSvc.reasignarSolicitud(solicitud.id_cita, slot.id_disponibilidad).subscribe({
      next: async () => {
        this.accionEnCurso.set(null);
        this.reasignandoId.set(null);
        this.solicitudes.update(list => list.filter(s => s.id_cita !== solicitud.id_cita));
        await this.mostrarToast(
          `Cita de ${solicitud.nombre_invitado} reasignada al ${this.formatFechaCorta(slot.fecha)} a las ${slot.hora_inicio}`,
          'success'
        );
      },
      error: async (err) => {
        this.accionEnCurso.set(null);
        await this.mostrarToast(err?.error?.message ?? 'Error al reasignar', 'danger');
      },
    });
  }

  // ── Formateo ──────────────────────────────────────────────────────────────

  formatFechaCorta(fecha: string | null | undefined): string {
    if (!fecha) return '—';
    const d = new Date(fecha + 'T12:00:00');
    return d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  formatHora(hora: string | null | undefined): string {
    if (!hora) return '—';
    return hora.slice(0, 5);
  }

  formatFechaRegistro(ts: string | null | undefined): string {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) +
           ' ' + d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  }

  // ── Utilidades ────────────────────────────────────────────────────────────

  private async mostrarToast(message: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const t = await this.toastCtrl.create({ message, duration: 4000, color, position: 'bottom' });
    await t.present();
  }

  volver(): void {
    this.router.navigate(['/admin/operacion']);
  }
}
