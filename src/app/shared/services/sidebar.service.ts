import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SidebarService {
  private readonly _collapsed  = signal(false);
  private readonly _mobileOpen = signal(false);

  readonly collapsed  = this._collapsed.asReadonly();
  readonly mobileOpen = this._mobileOpen.asReadonly();

  toggleDesktopSidebar(): void { this._collapsed.update(v => !v); }
  toggleMobileSidebar():  void { this._mobileOpen.update(v => !v); }
  closeMobileSidebar():   void { this._mobileOpen.set(false); }
}
