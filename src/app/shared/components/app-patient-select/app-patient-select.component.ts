import {
  Component, OnInit, DestroyRef, inject, input, output, signal, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { PatientsApiService } from '@features/patients/services/patients-api.service';
import { Patient } from '@core/models/patient.model';

@Component({
  selector: 'app-patient-select',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ts-root" (click)="$event.stopPropagation()">

      <!-- Left icon wrapper: positions independently from spin animation -->
      <span class="ts-left-icon" [style.color]="selected() ? 'var(--success-color)' : ''">
        <i class="fas"
           [class.fa-user]="!selected() && !isSearching()"
           [class.fa-spinner]="isSearching()"
           [class.fa-spin]="isSearching()"
           [class.fa-user-check]="!!selected()"></i>
      </span>

      <!-- Control -->
      <div class="form-input ts-control"
           [class.has-value]="!!selected()"
           [class.ts-open]="dropdownOpen()"
           (click)="onControlClick()">

        @if (selected()) {
          <span class="ts-item">
            {{ selected()!.nombre }} {{ selected()!.apellido }}
            @if (selected()!.historia_clinica) {
              <span class="ts-item-meta">&middot; HC: {{ selected()!.historia_clinica }}</span>
            }
          </span>
          <button type="button" class="ts-clear"
                  (click)="$event.stopPropagation(); clear()"
                  title="Quitar paciente">
            <i class="fas fa-times"></i>
          </button>
        } @else {
          <input class="ts-input"
                 type="text"
                 placeholder=" "
                 [value]="query()"
                 (focus)="openDropdown()"
                 (input)="onSearch($any($event.target).value)"
                 (blur)="closeDropdown()"
                 autocomplete="off" />
          <i class="fas ts-chevron"
             [class.fa-chevron-down]="!dropdownOpen()"
             [class.fa-chevron-up]="dropdownOpen()"></i>
        }
      </div>

      <!-- Floating label -->
      <label class="form-label" [class.floating]="!!selected() || dropdownOpen() || !!query()">
        {{ label() }}
        @if (optional()) {
          <span class="ts-optional">Opcional</span>
        }
      </label>

      <!-- Dropdown -->
      @if (dropdownOpen() && !selected()) {
        <div class="ts-dropdown">

          @if (!isSearching() && results().length === 0) {
            <div class="ts-no-results">
              <i class="fas fa-user-slash"></i>
              {{ query() ? 'Sin resultados para "' + query() + '"' : 'Escribe para buscar' }}
            </div>
          }

          @for (p of results(); track p.id) {
            <div class="ts-option" (mousedown)="$event.preventDefault(); pick(p)">
              <span class="ts-opt-name">{{ p.nombre }} {{ p.apellido }}</span>
              <span class="ts-opt-meta">
                @if (p.historia_clinica) { <span>HC: {{ p.historia_clinica }}</span> }
                <span>{{ p.tipo_documento }}: {{ p.numero_documento }}</span>
              </span>
            </div>
          }

          @if (totalPages() > 1) {
            <div class="ts-footer">
              <span class="ts-count">{{ rangeStart() }}–{{ rangeEnd() }} de {{ total() }}</span>
              <div class="ts-pages">
                <button class="ts-page-btn" type="button"
                        [disabled]="page() <= 1"
                        (mousedown)="$event.preventDefault(); goPage(page() - 1)">
                  <i class="fas fa-chevron-left"></i>
                </button>
                <span class="ts-page-num">{{ page() }} / {{ totalPages() }}</span>
                <button class="ts-page-btn" type="button"
                        [disabled]="page() >= totalPages()"
                        (mousedown)="$event.preventDefault(); goPage(page() + 1)">
                  <i class="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          }

        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .ts-root { position: relative; }

    /* Icon wrapper: handles position; inner <i> handles spin without conflict */
    .ts-left-icon {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: #94A3B8;
      font-size: 0.9rem;
      pointer-events: none;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1em;
      height: 1em;
    }

    /* Extend form-input for the Tom Select control */
    .ts-control {
      display: flex !important;
      align-items: center;
      gap: 0.4rem;
      cursor: text;
      outline: none;
      padding-right: 0.65rem !important;
    }
    .ts-control.ts-open,
    .ts-control:focus-within {
      border-color: var(--accent) !important;
      box-shadow: 0 0 0 3px rgba(23, 74, 122, 0.08) !important;
    }
    .ts-control.has-value { cursor: default; }

    /* Borderless inner input */
    .ts-input {
      flex: 1;
      min-width: 0;
      border: none;
      outline: none;
      background: transparent;
      font-size: 0.9rem;
      color: var(--text-primary);
      line-height: 1.4;
      padding: 0;
    }
    .ts-input::placeholder { color: transparent; }

    /* Chevron */
    .ts-chevron {
      font-size: 0.68rem;
      color: #94A3B8;
      flex-shrink: 0;
      margin-left: auto;
      transition: transform 0.2s;
    }

    /* Selected item */
    .ts-item {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      flex: 1;
      min-width: 0;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--accent);
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .ts-item-meta {
      font-size: 0.75rem;
      font-weight: 400;
      color: var(--text-secondary);
    }

    /* Clear button */
    .ts-clear {
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 4px;
      color: var(--text-secondary);
      font-size: 0.75rem;
      flex-shrink: 0;
      margin-left: auto;
      transition: color 0.15s, background 0.15s;
    }
    .ts-clear:hover { color: #ef4444; background: #fee2e2; }

    /* Optional tag inside label */
    .ts-optional {
      margin-left: 0.4rem;
      font-size: 0.65rem;
      font-weight: 500;
      color: var(--text-secondary);
      background: var(--app-bg);
      border: 1px solid var(--border-color);
      border-radius: 3px;
      padding: 0px 5px;
      vertical-align: middle;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    /* Dropdown */
    .ts-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0; right: 0;
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
      z-index: 400;
      overflow: hidden;
      animation: tsSlide 0.13s ease-out;
    }
    @keyframes tsSlide {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* Options */
    .ts-option {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 0.5rem 0.75rem;
      cursor: pointer;
      border-bottom: 1px solid var(--border-color);
      transition: background 0.1s;
    }
    .ts-option:last-of-type { border-bottom: none; }
    .ts-option:hover { background: #EFF6FF; }

    .ts-opt-name { font-size: 0.875rem; font-weight: 500; color: var(--text-primary); }
    .ts-opt-meta {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      font-size: 0.72rem;
      color: var(--text-secondary);
    }

    /* Empty state */
    .ts-no-results {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }

    /* Pagination footer */
    .ts-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.35rem 0.65rem;
      border-top: 1px solid var(--border-color);
      background: var(--app-bg);
    }
    .ts-count { font-size: 0.72rem; color: var(--text-secondary); }
    .ts-pages { display: flex; align-items: center; gap: 0.3rem; }
    .ts-page-num { font-size: 0.72rem; color: var(--text-secondary); min-width: 34px; text-align: center; }

    .ts-page-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px; height: 22px;
      border: 1px solid var(--border-color);
      border-radius: 5px;
      background: var(--card-bg);
      color: var(--text-secondary);
      font-size: 0.62rem;
      cursor: pointer;
      transition: background 0.12s, color 0.12s, border-color 0.12s;
    }
    .ts-page-btn:hover:not(:disabled) { background: var(--accent); color: #fff; border-color: var(--accent); }
    .ts-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  `],
})
export class AppPatientSelectComponent implements OnInit {
  readonly label    = input<string>('Paciente');
  readonly optional = input<boolean>(false);

  readonly patientChange = output<Patient | null>();

  private readonly patientsApi = inject(PatientsApiService);
  private readonly destroyRef  = inject(DestroyRef);

  selected   = signal<Patient | null>(null);
  query      = signal('');
  results    = signal<Patient[]>([]);
  isSearching = signal(false);
  dropdownOpen = signal(false);
  page       = signal(1);
  total      = signal(0);
  readonly pageSize = 6;

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));
  readonly rangeStart = computed(() => this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize + 1);
  readonly rangeEnd   = computed(() => Math.min(this.page() * this.pageSize, this.total()));

  private readonly searchSubject = new Subject<string>();

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      this.page.set(1);
      this.fetchPatients();
    });
  }

  onControlClick(): void {
    if (!this.selected()) this.openDropdown();
  }

  openDropdown(): void {
    if (this.dropdownOpen()) return;
    this.dropdownOpen.set(true);
    this.page.set(1);
    this.fetchPatients();
  }

  closeDropdown(): void {
    setTimeout(() => this.dropdownOpen.set(false), 200);
  }

  onSearch(value: string): void {
    this.query.set(value);
    this.searchSubject.next(value);
  }

  goPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.page.set(page);
    this.fetchPatients();
  }

  pick(p: Patient): void {
    this.selected.set(p);
    this.query.set('');
    this.results.set([]);
    this.dropdownOpen.set(false);
    this.patientChange.emit(p);
  }

  clear(): void {
    this.selected.set(null);
    this.query.set('');
    this.patientChange.emit(null);
  }

  private fetchPatients(): void {
    this.isSearching.set(true);
    this.patientsApi.getPatients(this.page(), this.pageSize, this.query())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.results.set(res.data);
          this.total.set(res.pagination?.count ?? 0);
          this.isSearching.set(false);
        },
        error: () => this.isSearching.set(false),
      });
  }
}
