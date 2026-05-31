import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafeUrl } from '@angular/platform-browser';
import { ProductionAnalysisResult, ProductionBeat } from '../../models/production-analysis.model';
import { Patient } from '@core/models/patient.model';

@Component({
  selector: 'app-analysis-results-production',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analysis-results-production.component.html',
  styleUrls: ['./analysis-results-production.component.css'],
})
export class AnalysisResultsProductionComponent {
  result  = input<ProductionAnalysisResult | null>(null);
  patient = input<Patient | null>(null);
  plotUrl = input<SafeUrl | string | null>(null);
  reset   = output<void>();

  readonly PAGE_SIZE = 100;
  currentPage = signal(1);

  readonly allBeats   = computed(() => this.result()?.latidos ?? []);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.allBeats().length / this.PAGE_SIZE)));
  readonly rangeStart = computed(() => (this.currentPage() - 1) * this.PAGE_SIZE + 1);
  readonly rangeEnd   = computed(() => Math.min(this.currentPage() * this.PAGE_SIZE, this.allBeats().length));

  readonly paginatedBeats = computed(() => {
    const start = (this.currentPage() - 1) * this.PAGE_SIZE;
    return this.allBeats().slice(start, start + this.PAGE_SIZE);
  });

  readonly pageNumbers = computed<(number | '...')[]>(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    const left = Math.max(2, current - 2);
    const right = Math.min(total - 1, current + 2);
    if (left > 2) pages.push('...');
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < total - 1) pages.push('...');
    pages.push(total);
    return pages;
  });

  goToPage(page: number | '...'): void {
    if (typeof page === 'number') this.currentPage.set(page);
  }

  getStatsArray(stats: Record<string, number>): Array<{ clase: string; porcentaje: number }> {
    return Object.entries(stats).map(([clase, porcentaje]) => ({ clase, porcentaje }));
  }

  trackByIndex(i: number, _: ProductionBeat): number { return i; }
}
