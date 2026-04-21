import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonToast } from '@ionic/angular/standalone';
import { PacienteService, DetalleMedicoData } from '../../../core/services/paciente.service';
import { NotificacionesPacienteStateService } from '../../../core/services/notificaciones-paciente-state.service';
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
  private readonly notificacionesState = inject(NotificacionesPacienteStateService);

  data: DetalleMedicoData | null = null;
  isLoading  = true;
  showError  = false;
  errorMsg   = '';
  userName   = '';
  noLeidas   = 0;
  activeTab  = 'info';

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
        this.notificacionesState.setNoLeidas(res.noLeidas);
        this.isLoading = false;
      },
      error: () => {
        this.errorMsg  = 'No se pudo cargar la informacion del profesional.';
        this.showError = true;
        this.isLoading = false;
      },
    });
  }

  volver(): void {
    window.history.back();
  }

  verHorarios(): void {
    if (!this.data) return;
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

  // Genera arreglo de estrellas para la valoracion
  estrellas(): ('full' | 'half' | 'empty')[] {
    const rating = parseFloat(this.data?.medico.valoracion_promedio ?? '0');
    const result: ('full' | 'half' | 'empty')[] = [];
    for (let i = 1; i <= 5; i++) {
      if (rating >= i) result.push('full');
      else if (rating >= i - 0.5) result.push('half');
      else result.push('empty');
    }
    return result;
  }

  nombreDia(isodow: number): string {
    const dias: Record<number, string> = {
      1: 'Lunes', 2: 'Martes', 3: 'Miercoles',
      4: 'Jueves', 5: 'Viernes', 6: 'Sabado', 7: 'Domingo',
    };
    return dias[isodow] ?? '';
  }

  formatHora(hora: string): string {
    return hora.slice(0, 5);
  }

  formatFecha(fechaStr: string): string {
    const [y, m, d] = fechaStr.split('-').map(Number);
    const fecha = new Date(y, m - 1, d);
    const hoy   = new Date();
    hoy.setHours(0, 0, 0, 0);
    const diff  = Math.round((fecha.getTime() - hoy.getTime()) / 86400000);

    if (diff === 0) return 'Hoy';
    if (diff === 1) return 'Manana';

    const dias  = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${dias[fecha.getDay()]} ${d} ${meses[m - 1]}`;
  }
}
