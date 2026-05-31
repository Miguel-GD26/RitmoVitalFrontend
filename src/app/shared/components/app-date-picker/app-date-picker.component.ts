import {
  Component, ElementRef, HostListener, forwardRef,
  inject, input, signal, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

interface CalCell { day: number; current: boolean; date: string | null; }

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [CommonModule],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => AppDatePickerComponent),
    multi: true,
  }],
  template: `
    <div class="dp-wrapper">

      <i class="dp-icon-left fas" [ngClass]="icon()" [class.dp-icon-left-active]="isOpen()"></i>

      <input type="text" class="dp-input"
             [class.dp-open]="isOpen()"
             [value]="displayValue()"
             placeholder=" "
             readonly
             (click)="open($event)">

      <label class="dp-label" [class.dp-floated]="isOpen() || !!value()">
        {{ placeholder() }}
      </label>

      <i class="fas fa-calendar-alt dp-icon-right" [class.dp-icon-active]="isOpen()"></i>

      <!-- ──────── Panel del calendario ──────── -->
      <div *ngIf="isOpen()" class="dp-panel"
           [style.top.px]="panelPos().top"
           [style.left.px]="panelPos().left"
           [style.width.px]="panelPos().width"
           [style.visibility]="panelVisible() ? 'visible' : 'hidden'"
           (click)="$event.stopPropagation()">

        <!-- ═══ VISTA DÍAS ═══ -->
        <ng-container *ngIf="view() === 'days'">
          <div class="dp-nav">
            <button type="button" class="dp-nav-btn" (click)="prevMonth()">
              <i class="fas fa-chevron-left"></i>
            </button>
            <div class="dp-nav-center">
              <button type="button" class="dp-nav-lbl" (click)="showMonths()">
                {{ MONTHS[currentMonth()] }}
              </button>
              <button type="button" class="dp-nav-lbl" (click)="showYears()">
                {{ currentYear() }}
              </button>
            </div>
            <button type="button" class="dp-nav-btn" (click)="nextMonth()">
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>

          <div class="dp-days-header">
            <span *ngFor="let d of DAYS" class="dp-day-name">{{ d }}</span>
          </div>

          <div class="dp-days-grid">
            <button *ngFor="let cell of calendarDays()"
                    type="button"
                    class="dp-day"
                    [class.dp-day-other]="!cell.current"
                    [class.dp-day-today]="isToday(cell.date) && !isSelected(cell.date)"
                    [class.dp-day-sel]="isSelected(cell.date)"
                    [disabled]="!cell.current"
                    (click)="selectDate(cell.date)">
              {{ cell.day }}
            </button>
          </div>
        </ng-container>

        <!-- ═══ VISTA MESES ═══ -->
        <ng-container *ngIf="view() === 'months'">
          <div class="dp-nav">
            <button type="button" class="dp-nav-btn" (click)="prevYear()">
              <i class="fas fa-chevron-left"></i>
            </button>
            <button type="button" class="dp-nav-lbl" (click)="showYears()">
              {{ currentYear() }}
            </button>
            <button type="button" class="dp-nav-btn" (click)="nextYear()">
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>
          <div class="dp-grid3">
            <button *ngFor="let m of MONTHS_SHORT; let i = index"
                    type="button"
                    class="dp-cell3"
                    [class.dp-cell3-sel]="i === currentMonth()"
                    (click)="selectMonth(i)">
              {{ m }}
            </button>
          </div>
        </ng-container>

        <!-- ═══ VISTA AÑOS ═══ -->
        <ng-container *ngIf="view() === 'years'">
          <div class="dp-nav">
            <button type="button" class="dp-nav-btn" (click)="prevYearRange()">
              <i class="fas fa-chevron-left"></i>
            </button>
            <span class="dp-nav-range">{{ yearStart() }} – {{ yearStart() + 11 }}</span>
            <button type="button" class="dp-nav-btn" (click)="nextYearRange()">
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>
          <div class="dp-grid3">
            <button *ngFor="let y of yearRange()"
                    type="button"
                    class="dp-cell3"
                    [class.dp-cell3-sel]="y === currentYear()"
                    (click)="selectYear(y)">
              {{ y }}
            </button>
          </div>
        </ng-container>

        <!-- Footer -->
        <div class="dp-footer">
          <button type="button" class="dp-footer-clear" (click)="clearDate()">
            <i class="fas fa-times"></i> Limpiar
          </button>
          <button type="button" class="dp-footer-today" (click)="selectToday()">
            <i class="fas fa-calendar-day"></i> Hoy
          </button>
        </div>

      </div><!-- /dp-panel -->
    </div><!-- /dp-wrapper -->
  `,
  styles: [`
    :host { display: block; }

    /* ── Contenedor ── */
    .dp-wrapper { position: relative; display: block; width: 100%; }

    /* ── Icono izquierdo ── */
    .dp-icon-left {
      position: absolute; left: 1rem; top: 50%;
      transform: translateY(-50%);
      color: #94A3B8; font-size: 0.9rem;
      transition: color 0.2s; z-index: 2; pointer-events: none;
    }
    .dp-icon-left-active { color: var(--accent) !important; }

    /* ── Input trigger ── */
    .dp-input {
      width: 100%;
      padding: 0.875rem 2.5rem 0.875rem 2.75rem;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      font-size: 0.9rem;
      font-family: 'Inter', sans-serif;
      background: white; color: #1E293B;
      box-sizing: border-box;
      outline: none; cursor: pointer;
      transition: all 0.2s ease;
    }
    .dp-input:hover  { border-color: #CBD5E1; }
    .dp-input.dp-open {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(23, 74, 122, 0.08);
    }

    /* ── Label flotante material ── */
    .dp-label {
      position: absolute;
      left: 2.75rem; top: 50%;
      transform: translateY(-50%);
      color: #94A3B8; font-size: 0.9rem; font-weight: 400;
      padding: 0 0.25rem; background: white;
      transition: all 0.2s ease;
      pointer-events: none; z-index: 3;
    }
    .dp-label.dp-floated {
      top: 0;
      left: 0.75rem;
      transform: translateY(-50%);
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    /* ── Icono calendario derecha ── */
    .dp-icon-right {
      position: absolute; right: 0.875rem; top: 50%;
      transform: translateY(-50%);
      color: #CBD5E1; font-size: 0.75rem;
      pointer-events: none; transition: color 0.2s;
    }
    .dp-icon-right.dp-icon-active { color: var(--accent); }

    /* ── Panel ── */
    .dp-panel {
      position: fixed; z-index: 9999;
      background: white;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.13);
      padding: 0.75rem;
      animation: dpSlide 0.15s ease-out;
    }
    @keyframes dpSlide {
      from { opacity: 0; transform: translateY(-5px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Navegación ── */
    .dp-nav {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 0.75rem;
    }
    .dp-nav-center { display: flex; align-items: center; gap: 0.15rem; }
    .dp-nav-btn {
      width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 8px; border: none; background: none;
      color: #94A3B8; cursor: pointer; font-size: 0.72rem;
      transition: all 0.15s; flex-shrink: 0;
    }
    .dp-nav-btn:hover { background: #F8FAFC; color: #1E293B; }
    .dp-nav-lbl {
      font-size: 0.875rem; font-weight: 700; color: #1E293B;
      border: none; background: none; cursor: pointer;
      padding: 0.25rem 0.5rem; border-radius: 8px;
      transition: all 0.15s; font-family: 'Inter', sans-serif;
    }
    .dp-nav-lbl:hover { background: #EFF6FF; color: var(--accent); }
    .dp-nav-range { font-size: 0.875rem; font-weight: 700; color: #64748B; }

    /* ── Cabecera días ── */
    .dp-days-header {
      display: grid; grid-template-columns: repeat(7, 1fr);
      margin-bottom: 0.25rem;
    }
    .dp-day-name {
      text-align: center; font-size: 0.62rem; font-weight: 700;
      color: #94A3B8; text-transform: uppercase; padding: 0.25rem 0;
    }

    /* ── Grid días ── */
    .dp-days-grid {
      display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px;
    }
    .dp-day {
      height: 36px; width: 100%;
      display: flex; align-items: center; justify-content: center;
      border-radius: 8px; border: none; background: none;
      font-size: 0.875rem; font-weight: 500; color: #374151;
      cursor: pointer; transition: all 0.15s; font-family: 'Inter', sans-serif;
    }
    .dp-day:hover:not(:disabled):not(.dp-day-sel) { background: #EFF6FF; color: var(--accent); }
    .dp-day-other     { color: #CBD5E1 !important; pointer-events: none; }
    .dp-day-today     { box-shadow: inset 0 0 0 2px #BFDBFE; color: var(--accent); }
    .dp-day-sel       { background: var(--accent) !important; color: white !important; border-radius: 8px; }
    .dp-day:disabled  { pointer-events: none; }

    /* ── Grid meses / años ── */
    .dp-grid3 {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;
    }
    .dp-cell3 {
      padding: 0.7rem 0.25rem; border-radius: 10px; border: none; background: none;
      font-size: 0.875rem; font-weight: 600; color: #374151;
      cursor: pointer; transition: all 0.15s; font-family: 'Inter', sans-serif;
      text-align: center;
    }
    .dp-cell3:hover:not(.dp-cell3-sel) { background: #EFF6FF; color: var(--accent); }
    .dp-cell3-sel { background: var(--accent); color: white; }

    /* ── Footer ── */
    .dp-footer {
      display: flex; align-items: center; justify-content: space-between;
      margin-top: 0.625rem; padding-top: 0.5rem;
      border-top: 1px solid #F1F5F9;
    }
    .dp-footer-clear {
      font-size: 0.72rem; font-weight: 600; color: #94A3B8;
      border: none; background: none; cursor: pointer;
      padding: 0.25rem 0.5rem; border-radius: 6px;
      transition: all 0.15s; font-family: 'Inter', sans-serif;
      display: flex; align-items: center; gap: 0.3rem;
    }
    .dp-footer-clear:hover { background: #FEF2F2; color: #DC2626; }
    .dp-footer-today {
      font-size: 0.72rem; font-weight: 600; color: var(--accent);
      border: none; background: none; cursor: pointer;
      padding: 0.25rem 0.5rem; border-radius: 6px;
      transition: all 0.15s; font-family: 'Inter', sans-serif;
      display: flex; align-items: center; gap: 0.3rem;
    }
    .dp-footer-today:hover { background: #EFF6FF; }
  `],
})
export class AppDatePickerComponent implements ControlValueAccessor {
  placeholder = input<string>('Fecha');
  icon        = input<string>('fa-calendar-alt');

  private readonly el = inject(ElementRef);

  value        = signal<string>('');
  isOpen       = signal(false);
  panelVisible = signal(false);
  view         = signal<'days' | 'months' | 'years'>('days');
  currentMonth = signal(new Date().getMonth());
  currentYear  = signal(new Date().getFullYear());
  yearStart    = signal(new Date().getFullYear() - 4);
  panelPos     = signal<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 280 });

  private onChange_  = (_: string) => {};
  private onTouched_ = () => {};

  readonly DAYS        = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
  readonly MONTHS      = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  readonly MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  readonly displayValue = computed(() => {
    const v = this.value();
    if (!v) return '';
    const [y, m, d] = v.split('-');
    return `${d}/${m}/${y}`;
  });

  readonly calendarDays = computed((): CalCell[] => {
    const mo = this.currentMonth();
    const yr = this.currentYear();
    const firstDay = new Date(yr, mo, 1);
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;
    const daysInMonth     = new Date(yr, mo + 1, 0).getDate();
    const daysInPrevMonth = new Date(yr, mo,     0).getDate();
    const cells: CalCell[] = [];

    for (let i = startDay - 1; i >= 0; i--)
      cells.push({ day: daysInPrevMonth - i, current: false, date: null });

    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(mo + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      cells.push({ day: d, current: true, date: `${yr}-${mm}-${dd}` });
    }

    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++)
      cells.push({ day: i, current: false, date: null });

    return cells;
  });

  readonly yearRange = computed(() =>
    Array.from({ length: 12 }, (_, i) => this.yearStart() + i)
  );

  open(e: MouseEvent): void {
    e.stopPropagation();
    if (this.isOpen()) return;

    if (this.value()) {
      const [y, m] = this.value().split('-').map(Number);
      this.currentYear.set(y);
      this.currentMonth.set(m - 1);
    }
    this.yearStart.set(this.currentYear() - 4);
    this.view.set('days');

    // Paso 1: renderizar el panel invisible primero
    this.panelVisible.set(false);
    this.isOpen.set(true);

    // Paso 2: medir la altura REAL del panel ya renderizado, luego posicionar
    setTimeout(() => this.finalizePosition());
  }

  private finalizePosition(): void {
    if (!this.isOpen()) return;
    const host = this.el.nativeElement as HTMLElement;
    const rect = host.getBoundingClientRect();

    // Altura calculada (no medida) — igual que appGastos reference
    // nav(44) + header-días(28) + grid-días(6×36+gaps=226) + footer(50) + padding(24) ≈ 372
    const CAL_H  = 372;
    const width  = Math.max(rect.width, 280);
    const left   = Math.min(rect.left, window.innerWidth - width - 8);

    const spaceBelow = window.innerHeight - rect.bottom;
    const top = (spaceBelow < CAL_H && rect.top > CAL_H)
      ? rect.top - CAL_H - 4   // abrir hacia arriba
      : rect.bottom + 4;        // abrir hacia abajo (default)

    this.panelPos.set({ top, left, width });
    this.panelVisible.set(true);
  }

  close(): void {
    this.isOpen.set(false);
    this.panelVisible.set(false);
    this.onTouched_();
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (this.isOpen() && !(this.el.nativeElement as HTMLElement).contains(e.target as Node))
      this.close();
  }

  @HostListener('window:scroll')
  onScroll(): void { if (this.isOpen()) this.close(); }

  @HostListener('window:resize')
  onResize(): void { if (this.isOpen()) this.close(); }

  prevMonth(): void {
    if (this.currentMonth() === 0) { this.currentMonth.set(11); this.currentYear.update(y => y - 1); }
    else { this.currentMonth.update(m => m - 1); }
  }

  nextMonth(): void {
    if (this.currentMonth() === 11) { this.currentMonth.set(0); this.currentYear.update(y => y + 1); }
    else { this.currentMonth.update(m => m + 1); }
  }

  prevYear(): void { this.currentYear.update(y => y - 1); }
  nextYear(): void { this.currentYear.update(y => y + 1); }

  showMonths(): void { this.view.set('months'); }
  showYears():  void { this.yearStart.set(this.currentYear() - 4); this.view.set('years'); }

  selectMonth(m: number): void { this.currentMonth.set(m); this.view.set('days'); }
  selectYear(y: number):  void { this.currentYear.set(y); this.yearStart.set(y - 4); this.view.set('months'); }

  prevYearRange(): void { this.yearStart.update(s => s - 12); }
  nextYearRange(): void { this.yearStart.update(s => s + 12); }

  selectDate(date: string | null): void {
    if (!date) return;
    this.value.set(date);
    this.onChange_(date);
    this.close();
  }

  clearDate(): void {
    this.value.set('');
    this.onChange_('');
    this.close();
  }

  selectToday(): void {
    const t  = new Date();
    const iso = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    this.selectDate(iso);
  }

  isToday(date: string | null): boolean {
    if (!date) return false;
    const t  = new Date();
    const iso = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    return date === iso;
  }

  isSelected(date: string | null): boolean { return !!date && date === this.value(); }

  writeValue(v: string): void {
    this.value.set(v ?? '');
    if (v) {
      const [y, m] = v.split('-').map(Number);
      this.currentYear.set(y);
      this.currentMonth.set(m - 1);
    }
  }
  registerOnChange(fn: (v: string) => void): void { this.onChange_ = fn; }
  registerOnTouched(fn: () => void): void          { this.onTouched_ = fn; }
  setDisabledState(_: boolean): void {}
}
