import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ProfileApiService } from '@core/services/profile/profile-api.service';
import { AuthService } from '@core/services/auth/auth.service';
import { firstValueFrom } from 'rxjs';

type State = 'verifying' | 'success' | 'error';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="verify-container">
      <div class="verify-card">
        <div class="brand">
          <i class="fa-solid fa-heart-pulse brand-icon"></i>
          <span>RitmoVital</span>
        </div>

        @if (state() === 'verifying') {
          <div class="state-block">
            <i class="fas fa-spinner fa-spin state-icon spinning"></i>
            <h2>Verificando tu correo...</h2>
            <p>Por favor espera un momento.</p>
          </div>
        }

        @if (state() === 'success') {
          <div class="state-block">
            <i class="fas fa-check-circle state-icon success"></i>
            <h2>¡Correo verificado!</h2>
            <p>Tu dirección de email ha sido confirmada correctamente.</p>
            <p class="hint">Serás redirigido en un momento...</p>
          </div>
        }

        @if (state() === 'error') {
          <div class="state-block">
            <i class="fas fa-times-circle state-icon error"></i>
            <h2>Enlace inválido o expirado</h2>
            <p>{{ errorMsg() }}</p>
            <button class="btn-primary" (click)="goToLogin()">
              Ir al inicio de sesión
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .verify-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--app-bg, #f1f5f9);
      padding: 1rem;
    }
    .verify-card {
      background: var(--card-bg, #fff);
      border: 1px solid var(--border-color, #e2e8f0);
      border-radius: 12px;
      padding: 2.5rem 2rem;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 4px 24px rgba(0,0,0,.08);
    }
    .brand {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: .5rem;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--accent, #174a7a);
      margin-bottom: 2rem;
    }
    .brand-icon { font-size: 1.4rem; }
    .state-block { display: flex; flex-direction: column; align-items: center; gap: .75rem; }
    .state-icon { font-size: 3rem; }
    .state-icon.spinning { color: var(--accent, #174a7a); }
    .state-icon.success  { color: #22c55e; }
    .state-icon.error    { color: #ef4444; }
    h2 { font-size: 1.3rem; font-weight: 700; color: var(--text-primary, #1e293b); margin: 0; }
    p  { font-size: .9rem; color: var(--text-secondary, #64748b); margin: 0; }
    .hint { font-size: .8rem; }
    .btn-primary {
      margin-top: .5rem;
      padding: .6rem 1.5rem;
      background: var(--accent, #174a7a);
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: .9rem;
      font-weight: 600;
      cursor: pointer;
      transition: opacity .15s;
    }
    .btn-primary:hover { opacity: .85; }
  `],
})
export class VerifyEmailComponent implements OnInit {
  private readonly route   = inject(ActivatedRoute);
  private readonly router  = inject(Router);
  private readonly api     = inject(ProfileApiService);
  private readonly auth    = inject(AuthService);

  state    = signal<State>('verifying');
  errorMsg = signal('El enlace de verificación es inválido o ha expirado. Solicita uno nuevo desde el sistema.');

  async ngOnInit(): Promise<void> {
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!token) {
      this.state.set('error');
      return;
    }

    try {
      await firstValueFrom(this.api.verifyEmail(token));
      this.state.set('success');
      // Refresca la sesión para que los signals reflejen email_verified=true
      await firstValueFrom(this.auth.verifySession());
      setTimeout(() => this.router.navigate(['/dashboard']), 1800);
    } catch (err: any) {
      this.state.set('error');
      const msg = err?.error?.message;
      if (msg) this.errorMsg.set(msg);
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
