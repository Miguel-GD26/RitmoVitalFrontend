import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { SidebarService } from '@shared/services/sidebar.service';
import { AuthService } from '@core/services/auth/auth.service';
import { MenuItem } from './nav-config';
import { filterNavByRole } from './nav-filter';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit, OnDestroy {
  private sidebarService = inject(SidebarService);
  private router = inject(Router);
  private authService = inject(AuthService);

  readonly isCollapsed  = this.sidebarService.collapsed;
  readonly isMobileOpen = this.sidebarService.mobileOpen;

  menuItems = signal<MenuItem[]>([]);

  private routerSub?: Subscription;

  ngOnInit(): void {
    const user = this.authService.currentUser();
    const groups = user?.groups ?? [];
    const isSuperuser = user?.is_superuser ?? false;
    this.menuItems.set(
      filterNavByRole(groups, isSuperuser).map(item => ({
        ...item,
        isOpen: false,
        isActive: false,
        subMenu: item.subMenu?.map(s => ({ ...s, isActive: false })),
      }))
    );

    this.routerSub = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => this.updateActiveStates());

    this.updateActiveStates();
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  private updateActiveStates(): void {
    const currentUrl = this.router.url;
    this.menuItems.update(items =>
      items.map(item => {
        let isActive = false;
        let isOpen = item.isOpen ?? false;

        const subMenu = item.subMenu?.map(sub => {
          const subActive = !!sub.route && currentUrl.startsWith(sub.route);
          if (subActive) { isActive = true; isOpen = true; }
          return { ...sub, isActive: subActive };
        });

        if (!isActive && item.route) {
          isActive = item.route === '/'
            ? currentUrl === '/'
            : currentUrl.startsWith(item.route);
        }

        return { ...item, isActive, isOpen, subMenu };
      })
    );
  }

  toggleMenuItem(item: MenuItem): void {
    if (!item.subMenu) return;

    if (this.isCollapsed()) {
      this.sidebarService.toggleDesktopSidebar();
      setTimeout(() => {
        this.menuItems.update(items =>
          items.map(i => i.label === item.label ? { ...i, isOpen: true } : i)
        );
      }, 150);
    } else {
      this.menuItems.update(items =>
        items.map(i => i.label === item.label ? { ...i, isOpen: !i.isOpen } : i)
      );
    }
  }

  closeMobileSidebar(): void {
    this.sidebarService.closeMobileSidebar();
  }

  onLinkClick(): void {
    if (window.innerWidth <= 768) {
      this.closeMobileSidebar();
    }
  }
}
