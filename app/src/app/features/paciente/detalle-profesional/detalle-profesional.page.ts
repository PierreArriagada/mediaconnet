import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonToast } from '@ionic/angular/standalone';
import { PacienteService, DetalleMedicoData, DisponibilidadSlot } from '../../../core/services/paciente.service';
import { PacienteHeaderComponent } from '../../../shared/components/paciente-header/paciente-header.component';
import { PacienteBottomNavComponent } from '../../../shared/components/paciente-bottom-nav/paciente-bottom-nav.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-detalle-profesional',
  templateUrl: './detalle-profesional.page.html',
  styleUrls: ['./detalle-profesional.page.scss'],
  imports: [CommonModule, IonContent, IonToast, PacienteHeaderComponent, PacienteBottomNavComponent],
})
export default class DetalleProfesionalPage implements OnInit {
  private readonly route    = inject(ActivatedRoute);
  private readonly router   = inject(Router);
  private readonly svc      = inject(PacienteService);
  private readonly authSvc  = inject(AuthService);

  data: DetalleMedicoData | null = null;
  isLoading = true;
  showError = false;
  errorMsg  = '';

  // Slot seleccionado para la barra inferior
  slotSeleccionado = signal<DisponibilidadSlot | null>(null);

  // Nombre del usuario para el header
  userName = '';
  noLeidas = 0;

  // Agrupar disponibilidad por fecha
  gruposFecha: { fecha: string; slots: DisponibilidadSlot[] }[] = [];

  ngOnInit(): void {
    const user = this.authSvc.getCurrentUser();
    this.userName = user?.name ?? '';

    const idMedico = Number(this.route.snapshot.paramMap.get('idMedico'));
    if (!idMedico || idMedico < 1) {
      this.router.navigate(['/paciente/reservar']);
      return;
    }

    this.svc.getDetalleMedico(idMedico).subscribe({
      next: (res) => {
        this.data      = res;
        this.noLeidas  = res.noLeidas;
        this.agruparPorFecha(res.disponibilidad);
        this.isLoading = false;
      },
      error: () => {
        this.errorMsg  = 'No se pudo cargar la información del profesional.';
        this.showError = true;
        this.isLoading = false;
      },
    });
  }

  volver(): void {
    window.history.back();
  }

  seleccionarSlot(slot: DisponibilidadSlot): void {
    this.slotSeleccionado.set(slot);
  }

  reservarHora(): void {
    const slot = this.slotSeleccionado();
    if (!slot || !this.data) return;
    this.router.navigate(['/paciente/elegir-horario', this.data.medico.id_medico]);
  }

  // ── Helpers ──────────────────────────────
  iniciales(nombre: string, apellido: string): string {
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
  }

  temaAvatar(id: number): string {
    const temas = ['primary', 'tertiary', 'secondary'];
    return temas[id % temas.length];
  }

  titulo(nombre: string): string {
    return nombre.endsWith('a') ? 'Dra.' : 'Dr.';
  }

  formatFecha(fechaStr: string): string {
    const [y, m, d] = fechaStr.split('-').map(Number);
    const fecha = new Date(y, m - 1, d);
    const hoy   = new Date();
    hoy.setHours(0, 0, 0, 0);
    const diff  = Math.round((fecha.getTime() - hoy.getTime()) / 86400000);

    if (diff === 0) return 'Hoy';
    if (diff === 1) return 'Mañana';

    const dias    = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const meses   = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${dias[fecha.getDay()]} ${d} ${meses[m - 1]}`;
  }

  formatHora(hora: string): string {
    return hora.slice(0, 5);
  }

  private agruparPorFecha(slots: DisponibilidadSlot[]): void {
    const map = new Map<string, DisponibilidadSlot[]>();
    for (const s of slots) {
      if (!map.has(s.fecha)) map.set(s.fecha, []);
      map.get(s.fecha)!.push(s);
    }
    this.gruposFecha = Array.from(map.entries()).map(([fecha, sl]) => ({ fecha, slots: sl }));
  }
}
