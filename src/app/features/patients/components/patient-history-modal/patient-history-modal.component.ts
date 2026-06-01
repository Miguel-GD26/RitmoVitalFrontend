import { Component, OnChanges, SimpleChanges, inject, input, output, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistoryApiService } from '../../../ecg-history/services/history-api.service';
import { AnalysisHistory } from '@core/models/analysis-history.model';
import { Patient } from '@core/models/patient.model';
import { AppModalComponent } from '@shared/components/app-modal/app-modal.component';
import { AppPaginationComponent } from '@shared/components/app-pagination/app-pagination.component';
import { FormatDatePipe } from '@shared/pipes/format-date.pipe';
import { triggerBlobDownload } from '@shared/utils/download.utils';
import { getDropdownPos } from '@shared/utils/dropdown.utils';
import { useListSearch } from '@shared/utils/list-search.utils';
import { AppSearchInputComponent } from '@shared/components/app-search-input/app-search-input.component';

@Component({
  selector: 'app-patient-history-modal',
  standalone: true,
  imports: [CommonModule, AppModalComponent, AppPaginationComponent, FormatDatePipe, AppSearchInputComponent],
  templateUrl: './patient-history-modal.component.html',
})
export class PatientHistoryModalComponent implements OnChanges {
  private readonly historyApi = inject(HistoryApiService);

  readonly patient = input<Patient | null>(null);
  readonly closed  = output<void>();

  private readonly _list = useListSearch<AnalysisHistory>(pg => this.load(pg));

  readonly analyses     = this._list.items;
  readonly pagination   = this._list.pagination;
  readonly page         = this._list.currentPage;
  readonly isLoading    = this._list.isLoading;
  readonly errorMsg     = this._list.errorMessage;
  readonly search       = this._list.searchTerm;
  readonly totalCount   = this._list.totalCount;
  readonly onSearchInput = this._list.onSearchInput;
  readonly clearSearch   = this._list.clearSearch;

  modo        = signal('');
  downloading = signal<string | null>(null);
  showFilters = signal(false);
  filtersPos  = signal<{ top: number; left: number }>({ top: 0, left: 0 });

  readonly activeFilters = computed(() => this.modo() ? 1 : 0);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['patient'] && this.patient()) {
      this.search.set('');
      this.modo.set('');
      this.load(1);
    }
  }

  load(pg: number): void {
    const patient = this.patient();
    if (!patient) return;
    this.isLoading.set(true);
    this.errorMsg.set(null);
    this.page.set(pg);
    this.historyApi.getHistory(pg, 15, this.search(), this.modo(), patient.uuid).subscribe({
      next: res => {
        this.analyses.set(res.data.filter(a => a.paciente === patient.id));
        this.pagination.set(res.pagination ?? null);
        this.isLoading.set(false);
      },
      error: () => { this.errorMsg.set('No se pudo cargar el historial.'); this.isLoading.set(false); },
    });
  }

  setModo(modo: string): void { this.modo.set(modo); this.showFilters.set(false); this.load(1); }
  clearFilters(): void { this.modo.set(''); this.showFilters.set(false); this.load(1); }

  toggleFilters(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.showFilters()) {
      this.filtersPos.set(getDropdownPos(event));
      this.showFilters.set(true);
    } else {
      this.showFilters.set(false);
    }
  }

  close(): void { this.showFilters.set(false); this.closed.emit(); }

  downloadPdf(uuid: string): void {
    this.downloading.set(uuid);
    this.historyApi.downloadPdf(uuid).subscribe({
      next: blob => {
        triggerBlobDownload(blob, `reporte_analisis_${uuid}.pdf`);
        this.downloading.set(null);
      },
      error: () => { this.errorMsg.set('No se pudo descargar el PDF.'); this.downloading.set(null); },
    });
  }

  @HostListener('document:click')
  onDocClick(): void { this.showFilters.set(false); }

  trackById(_: number, item: { id: number }): number { return item.id; }
}
