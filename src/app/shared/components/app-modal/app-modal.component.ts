import { Component, AfterViewInit, HostListener, ElementRef, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '7xl' | 'full';

const FOCUSABLE_SEL = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

let _modalIdCounter = 0;

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      [attr.aria-labelledby]="titleId"
      (click)="onBackdropClick($event)">
      <div class="modal-content modal-{{ size() }}" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2 [id]="titleId"><ng-content select="[modal-title]"></ng-content></h2>
          <button class="modal-close-btn" (click)="close()" aria-label="Cerrar modal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <ng-content select="[modal-body]"></ng-content>
        </div>
        <div class="modal-footer" *ngIf="hasFooter()">
          <ng-content select="[modal-footer]"></ng-content>
        </div>
      </div>
    </div>
  `,
})
export class AppModalComponent implements AfterViewInit {
  size          = input<ModalSize>('md');
  hasFooter     = input<boolean>(true);
  backdropClose = input<boolean>(true);
  closed        = output<void>();

  readonly titleId = `modal-title-${++_modalIdCounter}`;

  private readonly elRef      = inject(ElementRef<HTMLElement>);
  private previousFocus: HTMLElement | null = null;

  ngAfterViewInit(): void {
    this.previousFocus = document.activeElement as HTMLElement;
    setTimeout(() => this.focusableEls()[0]?.focus(), 50);
  }

  close(): void {
    this.previousFocus?.focus();
    this.closed.emit();
  }

  onBackdropClick(e: MouseEvent): void {
    if (this.backdropClose()) this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.close(); }

  @HostListener('document:keydown.tab', ['$event'])
  onTab(e: Event): void {
    const ke = e as KeyboardEvent;
    const els = this.focusableEls();
    if (!els.length) return;
    const first = els[0];
    const last  = els[els.length - 1];
    if (ke.shiftKey) {
      if (document.activeElement === first) { ke.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { ke.preventDefault(); first.focus(); }
    }
  }

  private focusableEls(): HTMLElement[] {
    const nl = this.elRef.nativeElement.querySelectorAll(FOCUSABLE_SEL);
    return Array.from(nl as NodeListOf<HTMLElement>).filter(el => el.offsetParent !== null);
  }
}
