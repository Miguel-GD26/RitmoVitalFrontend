import { Component, OnInit, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PatientsApiService } from './services/patients-api.service';
import { HistoryApiService } from '../ecg-history/services/history-api.service';
import { triggerBlobDownload } from '@shared/utils/download.utils';
import { getDropdownPos } from '@shared/utils/dropdown.utils';
import { Patient } from '@core/models/patient.model';
import { AnalysisHistory } from '@core/models/analysis-history.model';
import { Pagination } from '@core/models/api-response.model';
import { AuthService } from '@core/services/auth/auth.service';
import { AppSearchInputComponent } from '@shared/components/app-search-input/app-search-input.component';

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, AppSearchInputComponent],
  templateUrl: './patient-detail.component.html',
  styleUrls: ['./patient-detail.component.css'],
})
export class PatientDetailComponent implements OnInit {
  private readonly patientsApi = inject(PatientsApiService);
  private readonly historyApi  = inject(HistoryApiService);
  private readonly route       = inject(ActivatedRoute);
  private readonly router      = inject(Router);
  private readonly auth        = inject(AuthService);

  patientUuid  = signal<string>('');
  patient      = signal<Patient | null>(null);
  isLoadingPat = signal(true);

  analyses      = signal<AnalysisHistory[]>([]);
  pagination    = signal<Pagination | null>(null);
  currentPage   = signal(1);
  isLoading     = signal(true);
  isDownloading = signal<string | null>(null);
  errorMessage  = signal<string | null>(null);

  searchTerm  = signal('');
  modoFilter  = signal('');
  showFilters = signal(false);
  filtersPos  = signal<{ top: number; left: number }>({ top: 0, left: 0 });

  readonly pageInfo = computed(() => {
    const p = this.pagination();
    if (!p || p.total_pages <= 1) return null;
    return `Página ${p.page} de ${p.total_pages} (${p.count} análisis)`;
  });

  readonly hasPrev = computed(() => this.pagination()?.has_previous ?? false);
  readonly hasNext = computed(() => this.pagination()?.has_next ?? false);
  readonly activeFiltersCount = computed(() => this.modoFilter() ? 1 : 0);

  readonly fullName = computed(() => {
    const p = this.patient();
    if (!p) return '';
    if (p.nombre || p.apellido) return `${p.nombre} ${p.apellido}`.trim();
    return p.numero_documento || '';
  });

  readonly isMedico = computed(() => {
    const u = this.auth.currentUser();
    return u?.is_superuser === false && (u?.groups.includes('medico') ?? false);
  });
  readonly showMedicoColumn = computed(() => {
    const u = this.auth.currentUser();
    return u?.is_superuser || (u?.groups.includes('administrador') ?? false);
  });

  ngOnInit(): void {
    const uuid = this.route.snapshot.paramMap.get('id') ?? '';
    this.patientUuid.set(uuid);
    this.patientsApi.getPatient(uuid).subscribe({
      next: p => { this.patient.set(p); this.isLoadingPat.set(false); },
      error: () => this.isLoadingPat.set(false),
    });
    this.loadPage(1);
  }

  loadPage(page: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.currentPage.set(page);
    this.historyApi.getHistory(page, 20, this.searchTerm(), this.modoFilter(), this.patientUuid()).subscribe({
      next: res => {
        this.analyses.set(res.data);
        this.pagination.set(res.pagination ?? null);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar el historial.');
        this.isLoading.set(false);
      },
    });
  }

  search(term: string): void {
    this.searchTerm.set(term);
    this.loadPage(1);
  }

  prevPage(): void { if (this.hasPrev()) this.loadPage(this.currentPage() - 1); }
  nextPage(): void { if (this.hasNext()) this.loadPage(this.currentPage() + 1); }

  toggleFilters(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.showFilters()) {
      this.filtersPos.set(getDropdownPos(event));
      this.showFilters.set(true);
    } else {
      this.showFilters.set(false);
    }
  }

  setModoFilter(val: string): void {
    this.modoFilter.set(val);
    this.showFilters.set(false);
    this.loadPage(1);
  }

  clearFilters(): void {
    this.modoFilter.set('');
    this.showFilters.set(false);
    this.loadPage(1);
  }

  @HostListener('document:click')
  onDocClick(): void { this.showFilters.set(false); }

  downloadPdf(uuid: string): void {
    this.isDownloading.set(uuid);
    this.historyApi.downloadPdf(uuid).subscribe({
      next: blob => {
        triggerBlobDownload(blob, `reporte_analisis_${uuid}.pdf`);
        this.isDownloading.set(null);
      },
      error: () => {
        this.errorMessage.set('No se pudo descargar el reporte PDF.');
        this.isDownloading.set(null);
      },
    });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  }

  formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  goBack(): void { this.router.navigate(['/patients']); }
}
