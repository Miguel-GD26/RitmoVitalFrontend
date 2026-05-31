import {
  Component, ElementRef, HostListener, forwardRef,
  inject, input, signal, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption { value: string; label: string; }

@Component({
  selector: 'app-form-select',
  standalone: true,
  imports: [CommonModule],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => AppFormSelectComponent),
    multi: true,
  }],
  template: `
    <div class="cs-root" (click)="$event.stopPropagation()">
      <i class="input-icon fas" [ngClass]="icon()"></i>

      <div class="form-input cs-trigger"
           [class.has-value]="!!val()"
           [class.cs-open]="open()"
           tabindex="0"
           (click)="toggle()"
           (keydown.enter)="toggle(); $event.preventDefault()"
           (keydown.escape)="close()"
           (keydown.tab)="close()">
        <span class="cs-display" [class.cs-empty]="!val()">{{ label() }}</span>
        <i class="fas cs-chevron"
           [class.fa-chevron-down]="!open()"
           [class.fa-chevron-up]="open()"></i>
      </div>

      <label class="form-label" [class.floating]="!!val() || open()">{{ placeholder() }}</label>

      <!-- Dropdown con posición fija para no ser cortado por overflow del modal -->
      <div class="cs-dropdown"
           *ngIf="open()"
           [style.top.px]="panelPos().top"
           [style.left.px]="panelPos().left"
           [style.width.px]="panelPos().width">
        <div class="cs-option"
             *ngFor="let opt of options()"
             [class.cs-selected]="opt.value === val()"
             (mousedown)="pick(opt, $event)">
          <i class="fas fa-check cs-check" *ngIf="opt.value === val()"></i>
          <span [class.cs-check-offset]="opt.value !== val()">{{ opt.label }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .cs-root { position: relative; }

    .cs-trigger {
      display: flex !important;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      user-select: none;
      outline: none;
      padding-right: 0.75rem !important;
      min-height: 2.875rem; /* garantiza la misma altura que un <input> vacío */
    }
    .cs-trigger:focus-visible,
    .cs-trigger.cs-open {
      border-color: var(--accent) !important;
      box-shadow: 0 0 0 3px rgba(23, 74, 122, 0.08) !important;
    }

    .cs-display {
      flex: 1; min-width: 0;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .cs-empty { color: transparent; }

    .cs-chevron {
      font-size: 0.7rem; color: #94A3B8;
      flex-shrink: 0; margin-left: 0.5rem;
      transition: transform 0.2s ease;
    }

    /* Panel fijo para sobresalir del overflow del modal */
    .cs-dropdown {
      position: fixed;
      z-index: 9999;
      background: white;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.13);
      overflow: hidden;
      animation: csSlide 0.15s ease-out;
    }
    @keyframes csSlide {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .cs-option {
      padding: 0.625rem 1rem;
      cursor: pointer;
      font-size: 0.9rem;
      color: #374151;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: background 0.1s ease;
    }
    .cs-option:hover { background: #EFF6FF; color: var(--accent); }
    .cs-selected     { background: #EFF6FF; color: #2563EB; font-weight: 500; }

    .cs-check        { font-size: 0.7rem; color: #2563EB; width: 12px; flex-shrink: 0; }
    .cs-check-offset { margin-left: 20px; }
  `],
})
export class AppFormSelectComponent implements ControlValueAccessor {
  placeholder = input<string>('Seleccionar');
  icon        = input<string>('fa-list');
  options     = input<SelectOption[]>([]);

  private readonly el = inject(ElementRef);

  val      = signal<string>('');
  open     = signal(false);
  panelPos = signal<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 200 });

  private onChange_  = (_: string) => {};
  private onTouched_ = () => {};

  readonly label = computed(() =>
    this.options().find(o => o.value === this.val())?.label ?? ''
  );

  @HostListener('document:click')
  onOutside(): void { this.close(); }

  @HostListener('window:scroll')
  onScroll(): void { if (this.open()) this.close(); }

  @HostListener('window:resize')
  onResize(): void { if (this.open()) this.close(); }

  toggle(): void {
    if (!this.open()) {
      const trigger = (this.el.nativeElement as HTMLElement).querySelector('.cs-trigger');
      if (trigger) {
        const r      = trigger.getBoundingClientRect();
        const opts   = this.options().length;
        const dropH  = Math.min(opts, 6) * 42 + 2;
        const below  = window.innerHeight - r.bottom;
        const top    = below >= dropH + 8 ? r.bottom + 4 : r.top - dropH - 4;
        this.panelPos.set({ top, left: r.left, width: Math.max(r.width, 180) });
      }
      this.open.set(true);
    } else {
      this.close();
    }
  }

  close(): void {
    if (this.open()) { this.open.set(false); this.onTouched_(); }
  }

  pick(opt: SelectOption, e: MouseEvent): void {
    e.preventDefault();
    this.val.set(opt.value);
    this.onChange_(opt.value);
    this.onTouched_();
    this.open.set(false);
  }

  writeValue(v: string): void        { this.val.set(v ?? ''); }
  registerOnChange(fn: (v: string) => void): void { this.onChange_ = fn; }
  registerOnTouched(fn: () => void): void          { this.onTouched_ = fn; }
  setDisabledState(_: boolean): void {}
}
