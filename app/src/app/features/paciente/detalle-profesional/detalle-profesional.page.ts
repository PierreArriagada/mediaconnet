import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonToast } from '@ionic/angular/standalone';
import { PacienteService, DetalleMedicoData } from '../../../core/services/paciente.service';
import { NotificacionesPacienteStateService } from '../../../core/services/notificaciones-paciente-state.service';
import { PacienteHeaderComponent } from '../../../shared/components/paciente-header/paciente-header.component';
import { PacienteBottomNavComponent } from '../../../shared/components/paciente-bottom-nav/paciente-bottom-nav.component';
import { AuthService } from '../../../core/services/auth.service';
import { formatFechaCercana, formatHoraCorta } from '../../../shared/utils/fecha.utils';
import {
  inicialesPersona,
  temaAvatarPorId,
  tituloMedicoPorNombre,
} from '../../../shared/utils/paciente-ui.utils';

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
  readonly iniciales = inicialesPersona;
  readonly temaAvatar = temaAvatarPorId;
  readonly titulo = tituloMedicoPorNombre;

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
        this.errorMsg  = 'No se pudo cargar la información del profesional.';
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

  nombreDia(isodow: number): string {
    const dias: Record<number, string> = {
      1: 'Lunes', 2: 'Martes', 3: 'Miércoles',
      4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 7: 'Domingo',
    };
    return dias[isodow] ?? '';
  }

  formatHora(hora: string): string {
    return formatHoraCorta(hora);
  }

  formatFecha(fechaStr: string): string {
    return formatFechaCercana(fechaStr);
  }
}
