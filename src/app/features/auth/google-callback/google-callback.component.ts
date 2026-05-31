import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@core/services/auth/auth.service';
import { AlertService } from '@core/services/alert';

@Component({
  selector: 'app-google-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8fafc;">
      <div style="text-align:center;">
        <svg style="animation:spin 1s linear infinite;width:2rem;height:2rem;margin:0 auto 1rem;display:block;"
             viewBox="0 0 24 24" fill="none" stroke="#1e88e5" stroke-width="2.5">
          <circle cx="12" cy="12" r="9" opacity="0.25"/>
          <path d="M21 12a9 9 0 0 0-9-9" stroke-linecap="round"/>
        </svg>
        <p style="color:#718096;font-size:.875rem;font-family:sans-serif;">Autenticando con Google…</p>
      </div>
    </div>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
  `,
})
export class GoogleCallbackComponent implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth   = inject(AuthService);
  private readonly alert  = inject(AlertService);

  ngOnInit(): void {
    const code  = this.route.snapshot.queryParamMap.get('code');
    const error = this.route.snapshot.queryParamMap.get('error');

    if (error || !code) {
      this.alert.error('No se pudo completar el login con Google.', 'Error de autenticación');
      this.router.navigate(['/login']);
      return;
    }

    const redirectUri = `${window.location.origin}/auth/google/callback`;
    this.auth.googleLogin(code, redirectUri).subscribe({
      next: () => this.router.navigate(['/']),
      error: () => {
        this.alert.error('Error al autenticar con Google. Intenta nuevamente.', 'Error');
        this.router.navigate(['/login']);
      },
    });
  }
}
