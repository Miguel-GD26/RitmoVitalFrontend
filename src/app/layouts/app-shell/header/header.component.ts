import { Component, HostListener, ElementRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SidebarService } from '@shared/services/sidebar.service';
import { AuthService } from '@core/services/auth/auth.service';
import { ROLE_LABELS } from '@core/constants/roles.constants';
import { ProfileModalComponent } from '@features/profile/profile-modal.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, ProfileModalComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  private authService    = inject(AuthService);
  private sidebarService = inject(SidebarService);
  private router         = inject(Router);
  private elementRef     = inject(ElementRef);

  readonly isCollapsed = this.sidebarService.collapsed;

  readonly userName     = computed(() => this.authService.currentUser()?.username ?? 'Usuario');
  readonly userInitials = computed(() => this.generateInitials(this.userName()));
  readonly userAvatar   = computed(() => this.authService.currentUser()?.avatar_url ?? null);
  readonly userRole = computed(() => {
    const groups = this.authService.currentUser()?.groups ?? [];
    return groups.map(g => ROLE_LABELS[g]).find(Boolean) ?? 'Usuario';
  });

  isProfileDropdownOpen = signal(false);
  showProfileModal      = signal(false);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isProfileDropdownOpen.set(false);
    }
  }

  toggleProfileDropdown(event: Event): void {
    event.stopPropagation();
    this.isProfileDropdownOpen.update(v => !v);
  }

  openProfile(event: Event): void {
    event.stopPropagation();
    this.isProfileDropdownOpen.set(false);
    this.showProfileModal.set(true);
  }

  onProfileClosed(): void {
    this.showProfileModal.set(false);
    // Refrescar avatar en el header si cambió
    this.authService.verifySession().subscribe();
  }

  toggleDesktopSidebar(): void {
    this.sidebarService.toggleDesktopSidebar();
  }

  toggleMobileSidebar(): void {
    this.sidebarService.toggleMobileSidebar();
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }

  private generateInitials(name: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(/[\s_.-]+/).filter(p => p.length > 0);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0] ? parts[0][0].toUpperCase() : 'U';
  }
}
