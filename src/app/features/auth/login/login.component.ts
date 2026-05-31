import { Component, inject, signal, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '@core/services/auth/auth.service';
import { AlertService } from '@core/services/alert';
import { environment } from '../../../../environments/environment';

type LoginStep = 'credentials' | '2fa';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements AfterViewInit, OnDestroy {
  @ViewChild('ekgCanvas') ekgCanvas!: ElementRef<HTMLCanvasElement>;

  private readonly authService = inject(AuthService);
  private readonly router      = inject(Router);
  private readonly alert       = inject(AlertService);

  email        = '';
  password     = '';
  totpCode     = '';
  isLoggingIn  = signal(false);
  showPassword = signal(false);
  loginStep    = signal<LoginStep>('credentials');
  private tempToken = '';

  private rafId = 0;
  private ekgSignal!: Float32Array;
  private offset = 0;
  private resizeObserver?: ResizeObserver;

  ngAfterViewInit(): void {
    this.ekgSignal = this.buildEKGSignal(1200, 6);
    this.startEKGAnimation();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
  }

  private buildEKGSignal(samples: number, beats: number): Float32Array {
    const ctrl: [number, number][] = [
      [0.00, 0], [0.10, 0], [0.13, 0.04], [0.17, 0.12], [0.21, 0.18],
      [0.25, 0.12], [0.29, 0.04], [0.33, 0], [0.38, -0.06], [0.40, -0.14],
      [0.42, 0.20], [0.43, 0.78], [0.44, 1.00], [0.45, 0.55], [0.46, -0.12],
      [0.48, -0.32], [0.50, -0.18], [0.54, -0.04], [0.58, 0.02], [0.64, 0.10],
      [0.70, 0.22], [0.76, 0.28], [0.82, 0.22], [0.88, 0.10], [0.93, 0.02], [1.00, 0],
    ];
    const beatLen = samples / beats;
    const sig = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const t = (i % beatLen) / beatLen;
      let lo = 0, hi = ctrl.length - 1;
      for (let k = 0; k < ctrl.length - 1; k++) {
        if (ctrl[k][0] <= t && ctrl[k + 1][0] >= t) { lo = k; hi = k + 1; break; }
      }
      const a = ctrl[lo], b = ctrl[hi];
      const u = (t - a[0]) / ((b[0] - a[0]) || 1);
      const s = u * u * (3 - 2 * u);
      sig[i] = a[1] + (b[1] - a[1]) * s;
    }
    return sig;
  }

  private startEKGAnimation(): void {
    const canvas = this.ekgCanvas.nativeElement;
    const ctx = canvas.getContext('2d')!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const color = '#22d3ee';
    const speed = 1.8;
    const amplitude = 0.5;
    const lineWidth = 1.6;
    const glow = 10;
    let w = 0, h = 0;

    const hexToRgba = (hex: string, a: number): string => {
      const c = parseInt(hex.replace('#', ''), 16);
      return `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    this.resizeObserver = new ResizeObserver(resize);
    this.resizeObserver.observe(canvas);

    const draw = () => {
      if (w === 0 || h === 0) { this.rafId = requestAnimationFrame(draw); return; }
      const cy = h / 2;
      const amp = h * amplitude * 0.5;
      ctx.clearRect(0, 0, w, h);

      ctx.save();
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowColor = color;
      ctx.shadowBlur = glow;

      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, hexToRgba(color, 0));
      grad.addColorStop(0.06, hexToRgba(color, 0.15));
      grad.addColorStop(0.3, hexToRgba(color, 0.65));
      grad.addColorStop(1, color);
      ctx.strokeStyle = grad;

      ctx.beginPath();
      const off = this.offset;
      for (let x = 0; x <= w; x++) {
        const idx = ((Math.floor(x + off) % this.ekgSignal.length) + this.ekgSignal.length) % this.ekgSignal.length;
        const y = cy - this.ekgSignal[idx] * amp;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      // leading dot
      const dotIdx = ((Math.floor(w + off) % this.ekgSignal.length) + this.ekgSignal.length) % this.ekgSignal.length;
      const dotY = cy - this.ekgSignal[dotIdx] * amp;
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(w - 1, dotY, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      this.offset = (this.offset + speed) % this.ekgSignal.length;
      this.rafId = requestAnimationFrame(draw);
    };

    this.rafId = requestAnimationFrame(draw);
  }

  loginWithGoogle(): void {
    const params = new URLSearchParams({
      client_id: environment.googleClientId,
      redirect_uri: environment.googleRedirectUri,
      response_type: 'code',
      scope: 'email profile',
      access_type: 'offline',
      prompt: 'select_account',
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  login(): void {
    if (this.isLoggingIn() || !this.email || !this.password) return;
    this.isLoggingIn.set(true);

    this.authService.login(this.email, this.password).subscribe({
      next: result => {
        this.isLoggingIn.set(false);
        this.password = '';
        if (result.requires2fa) {
          this.tempToken = result.tempToken;
          this.loginStep.set('2fa');
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (err: HttpErrorResponse | Error) => {
        this.isLoggingIn.set(false);
        this.password = '';
        this.alert.error(this.extractErrorMsg(err), 'Acceso denegado');
      },
    });
  }

  verify2fa(): void {
    if (this.isLoggingIn() || this.totpCode.length !== 6) return;
    this.isLoggingIn.set(true);

    this.authService.verify2fa(this.tempToken, this.totpCode).subscribe({
      next: () => {
        this.isLoggingIn.set(false);
        this.router.navigate(['/']);
      },
      error: (err: HttpErrorResponse | Error) => {
        this.isLoggingIn.set(false);
        this.totpCode = '';
        this.alert.error(this.extractErrorMsg(err), 'Código incorrecto');
      },
    });
  }

  backToCredentials(): void {
    this.loginStep.set('credentials');
    this.totpCode = '';
    this.tempToken = '';
  }

  private extractErrorMsg(err: HttpErrorResponse | Error): string {
    if (err instanceof HttpErrorResponse && err.error) {
      const body = err.error as { errors?: Record<string, string[]>; message?: string };
      if (body.errors && typeof body.errors === 'object') {
        const first = Object.values(body.errors)[0];
        return Array.isArray(first) && first.length ? first[0] : (body.message ?? 'Error inesperado.');
      }
      return body.message ?? 'Error inesperado.';
    }
    return err instanceof Error ? err.message : 'Credenciales incorrectas.';
  }
}
