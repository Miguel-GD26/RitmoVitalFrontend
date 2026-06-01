import { Component, OnInit, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistoryApiService } from './services/history-api.service';
import { AnalysisHistory } from '@core/models/analysis-history.model';
import { AppPaginationComponent } from '@shared/components/app-pagination/app-pagination.component';
import { FormatDatePipe } from '@shared/pipes/format-date.pipe';
import { AuthService } from '@core/services/auth/auth.service';
import { triggerBlobDownload } from '@shared/utils/download.utils';
import { getDropdownPos } from '@shared/utils/dropdown.utils';
import { useListSearch } from '@shared/utils/list-search.utils';
import { AppSearchInputComponent } from '@shared/components/app-search-input/app-search-input.component';

@Component({
  selector: 'app-ecg-history',
  standalone: true,
  imports: [CommonModule, AppPaginationComponent, FormatDatePipe, AppSearchInputComponent],
  templateUrl: './ecg-history.component.html',
  styleUrls: ['./ecg-history.component.css'],
})
export class EcgHistoryComponent implements OnInit {
  private readonly api  = inject(HistoryApiService);
  private readonly auth = inject(AuthService);

  private readonly _list = useListSearch<AnalysisHistory>(page => this.loadPage(page));

  readonly analyses     = this._list.items;
  readonly isLoading    = this._list.isLoading;
  readonly pagination   = this._list.pagination;
  readonly currentPage  = this._list.currentPage;
  readonly searchTerm   = this._list.searchTerm;
  readonly errorMessage = this._list.errorMessage;
  readonly totalCount   = this._list.totalCount;
  readonly onSearchInput = this._list.onSearchInput;
  readonly clearSearch   = this._list.clearSearch;

  isDownloading = signal<string | null>(null);
  isExporting   = signal(false);
  modoFilter    = signal('');
  showFilters   = signal(false);
  filtersPos    = signal<{ top: number; left: number }>({ top: 0, left: 0 });

  readonly activeFiltersCount = computed(() => this.modoFilter() ? 1 : 0);

  readonly isPaciente = computed(() => {
    const u = this.auth.currentUser();
    return !u?.is_superuser && (u?.groups.includes('paciente') ?? false);
  });
  readonly showMedicoColumn = computed(() => {
    const u = this.auth.currentUser();
    return u?.is_superuser || (u?.groups.includes('administrador') ?? false);
  });
  readonly showExportBtn = computed(() => !this.isPaciente());

  ngOnInit(): void {
    this.loadPage(1);
  }

  loadPage(page: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.currentPage.set(page);

    this.api.getHistory(page, 20, this.searchTerm(), this.modoFilter()).subscribe({
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

  trackById(_: number, item: { id: number }): number { return item.id; }
  trackByIndex(i: number): number { return i; }

  downloadPdf(uuid: string): void {
    this.isDownloading.set(uuid);
    this.api.downloadPdf(uuid).subscribe({
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

  exportCsv(): void {
    this.isExporting.set(true);
    this.api.exportCsv().subscribe({
      next: blob => {
        triggerBlobDownload(blob, `historial_ecg_${new Date().toISOString().slice(0, 10)}.csv`);
        this.isExporting.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudo exportar el historial CSV.');
        this.isExporting.set(false);
      },
    });
  }

  modeBadgeClass(modo: string): string {
    return { demo: 'badge-demo', anotado: 'badge-anotado', produccion: 'badge-produccion' }[modo] ?? '';
  }
}
