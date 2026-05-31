import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { buildPageNumbers } from '../../utils/pagination.utils';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="totalCount() > 0"
         class="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100">
      <span class="text-xs text-gray-500">
        Mostrando
        <strong>{{ startIndex() }}</strong>–<strong>{{ endIndex() }}</strong>
        de <strong>{{ totalCount() }}</strong> {{ itemLabel() }}
      </span>
      <nav class="flex items-center gap-1" aria-label="Paginación">
        <button (click)="prev()"
                [disabled]="currentPage() <= 1"
                class="px-2 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                aria-label="Página anterior">
          <i class="fas fa-chevron-left"></i>
        </button>

        <ng-container *ngFor="let page of pageNumbers(); trackBy: trackByIndex">
          <button *ngIf="page !== '...'"
                  (click)="onPageClick(+page)"
                  [attr.aria-current]="page === currentPage() ? 'page' : null"
                  class="min-w-[2rem] px-2 py-1.5 text-xs border rounded-lg transition-colors"
                  [style.background-color]="page === currentPage() ? 'var(--accent)' : ''"
                  [style.color]="page === currentPage() ? '#fff' : ''"
                  [style.border-color]="page === currentPage() ? 'transparent' : '#e5e7eb'">
            {{ page }}
          </button>
          <span *ngIf="page === '...'"
                class="px-1 text-xs text-gray-400" aria-hidden="true">…</span>
        </ng-container>

        <button (click)="next()"
                [disabled]="currentPage() >= totalPages()"
                class="px-2 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                aria-label="Página siguiente">
          <i class="fas fa-chevron-right"></i>
        </button>
      </nav>
    </div>
  `,
})
export class AppPaginationComponent {
  currentPage = input.required<number>();
  totalCount  = input.required<number>();
  pageSize    = input<number>(20);
  itemLabel   = input<string>('resultados');

  pageChange = output<number>();

  readonly totalPages  = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize())));
  readonly startIndex  = computed(() => this.totalCount() === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1);
  readonly endIndex    = computed(() => Math.min(this.currentPage() * this.pageSize(), this.totalCount()));
  readonly pageNumbers = computed(() => buildPageNumbers(this.currentPage(), this.totalPages()));

  prev(): void { if (this.currentPage() > 1) this.pageChange.emit(this.currentPage() - 1); }
  next(): void { if (this.currentPage() < this.totalPages()) this.pageChange.emit(this.currentPage() + 1); }

  onPageClick(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage()) {
      this.pageChange.emit(page);
    }
  }

  trackByIndex(_: number, item: number | string): number | string { return item; }
}
