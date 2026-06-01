import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="si-root">
      <span class="si-left">
        <i class="fas"
           [class.fa-search]="!loading()"
           [class.fa-spinner]="loading()"
           [class.fa-spin]="loading()"></i>
      </span>

      <input class="si-input"
             type="text"
             [placeholder]="placeholder()"
             [value]="value()"
             (input)="onInput($any($event.target).value)" />

      @if (value()) {
        <button type="button" class="si-clear" (click)="clear()" title="Limpiar búsqueda">
          <i class="fas fa-times"></i>
        </button>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .si-root {
      position: relative;
      display: flex;
      align-items: center;
    }

    /* Left icon wrapper — isolated so fa-spin no afecta posición */
    .si-left {
      position: absolute;
      left: 0.875rem;
      top: 50%;
      transform: translateY(-50%);
      color: #94A3B8;
      font-size: 0.85rem;
      pointer-events: none;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1em;
      height: 1em;
    }

    /* Input principal */
    .si-input {
      width: 100%;
      padding: 0.6rem 2.25rem 0.6rem 2.5rem;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--card-bg);
      color: var(--text-primary);
      font-size: 0.875rem;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
      box-sizing: border-box;
    }
    .si-input::placeholder { color: var(--text-secondary); }
    .si-input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(23, 74, 122, 0.08);
    }

    /* X button — sin fondo, solo ícono */
    .si-clear {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 4px;
      color: var(--text-secondary);
      font-size: 0.72rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.15s;
      line-height: 1;
    }
    .si-clear:hover { color: #ef4444; }
  `],
})
export class AppSearchInputComponent {
  readonly placeholder = input<string>('Buscar...');
  readonly value       = input<string>('');
  readonly loading     = input<boolean>(false);

  readonly valueChange = output<string>();

  onInput(val: string): void {
    this.valueChange.emit(val);
  }

  clear(): void {
    this.valueChange.emit('');
  }
}
