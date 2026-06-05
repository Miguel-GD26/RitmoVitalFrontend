import { Component, inject, computed, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarService } from '@shared/services/sidebar.service';
import { AuthService } from '@core/services/auth/auth.service';
import { ProfileApiService } from '@core/services/profile/profile-api.service';
import { AlertService } from '@core/services/alert';
import { SidebarComponent } from '../app-shell/sidebar/sidebar.component';
import { HeaderComponent } from '../app-shell/header/header.component';

@Component({
  selector: 'app-app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent],
  templateUrl: './app-layout.component.html',
  styleUrls: ['./app-layout.component.scss']
})
export class AppLayoutComponent {
  private readonly sidebarService = inject(SidebarService);
  private readonly authService    = inject(AuthService);
  private readonly profileApi     = inject(ProfileApiService);
  private readonly alert          = inject(AlertService);
  private readonly destroyRef     = inject(DestroyRef);

  readonly isCollapsed = this.sidebarService.collapsed;

  readonly emailNotVerified = computed(() => {
    const u = this.authService.currentUser();
    return u !== null && u.email_verified === false;
  });

  readonly mustChangePassword = computed(() => {
    const u = this.authService.currentUser();
    return u !== null && u.email_verified !== false && u.must_change_password === true;
  });

  readonly currentUserEmail = computed(() => this.authService.currentUser()?.email ?? '');

  // Estado de reenvío de correo
  resending      = signal(false);
  resendCooldown = signal(false);

  // Estado del cambio de contraseña forzado
  forcedNewPwd     = signal('');
  forcedConfirmPwd = signal('');
  forcedPwdError   = signal<string | null>(null);
  savingForcedPwd  = signal(false);

  resendVerification(): void {
    if (this.resending() || this.resendCooldown()) return;
    this.resending.set(true);
    this.profileApi.sendVerificationEmail()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.resending.set(false);
          this.resendCooldown.set(true);
          this.alert.toast('Correo reenviado. Revisa tu bandeja de entrada.', 'success');
          setTimeout(() => this.resendCooldown.set(false), 120_000);
        },
        error: err => {
          this.resending.set(false);
          const msg = err?.error?.message ?? 'No se pudo enviar el correo.';
          this.alert.toast(msg, 'error');
        },
      });
  }

  saveForcedPassword(): void {
    const pwd  = this.forcedNewPwd().trim();
    const conf = this.forcedConfirmPwd().trim();
    this.forcedPwdError.set(null);

    if (pwd.length < 8) {
      this.forcedPwdError.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (pwd !== conf) {
      this.forcedPwdError.set('Las contraseñas no coinciden.');
      return;
    }

    this.savingForcedPwd.set(true);
    this.profileApi.changePassword({ new_password: pwd })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.authService.currentUser.update(u =>
            u ? { ...u, must_change_password: false } : u
          );
          this.savingForcedPwd.set(false);
          this.forcedNewPwd.set('');
          this.forcedConfirmPwd.set('');
          this.alert.toast('Contraseña actualizada. Ya puedes usar el sistema.', 'success');
        },
        error: err => {
          this.savingForcedPwd.set(false);
          this.forcedPwdError.set(err?.error?.message ?? 'Error al actualizar la contraseña.');
        },
      });
  }
}
