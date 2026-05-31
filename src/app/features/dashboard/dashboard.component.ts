import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardApiService } from './services/dashboard-api.service';
import { DashboardStats } from './models/dashboard-stats.model';
import { FormatDatePipe } from '@shared/pipes/format-date.pipe';
import { AuthService } from '@core/services/auth/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormatDatePipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  private readonly api  = inject(DashboardApiService);
  private readonly auth = inject(AuthService);

  isLoading = signal(true);
  stats = signal<DashboardStats | null>(null);
  errorMessage = signal<string | null>(null);

  readonly isPaciente = computed(() => {
    const u = this.auth.currentUser();
    return !u?.is_superuser && (u?.groups.includes('paciente') ?? false);
  });
  readonly isAdmin = computed(() => {
    const u = this.auth.currentUser();
    return u?.is_superuser || (u?.groups.includes('administrador') ?? false);
  });
  readonly isInvestigador = computed(() => {
    const u = this.auth.currentUser();
    return !u?.is_superuser && (u?.groups.includes('investigador') ?? false);
  });
  readonly dashboardSubtitle = computed(() => {
    if (this.isAdmin()) return 'Resumen global de clasificación ECG en el sistema';
    if (this.isInvestigador()) return 'Resumen de tu actividad de investigación';
    if (this.isPaciente()) return 'Resumen de tus análisis ECG';
    return 'Resumen de tu actividad de clasificación ECG';
  });
  readonly analysisCardLabel = computed(() =>
    this.isAdmin() ? 'Total Análisis (Sistema)' : 'Total Análisis'
  );

  readonly modeLabels: Record<string, string | undefined> = {
    demo: 'Demo',
    anotado: 'Con Anotaciones',
    produccion: 'Producción',
  };

  readonly modeIcons: Record<string, string | undefined> = {
    demo: 'fas fa-flask',
    anotado: 'fas fa-file-medical-alt',
    produccion: 'fas fa-heartbeat',
  };

  ngOnInit(): void {
    this.api.getStats().subscribe({
      next: data => {
        this.stats.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar el dashboard. Intenta de nuevo.');
        this.isLoading.set(false);
      },
    });
  }

  getModeEntries(porModo: Record<string, number>): Array<{ modo: string; count: number }> {
    return Object.entries(porModo).map(([modo, count]) => ({ modo, count }));
  }

}
