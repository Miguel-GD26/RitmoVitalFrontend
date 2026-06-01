import { Component, OnInit, AfterViewInit, OnDestroy, inject, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardApiService } from './services/dashboard-api.service';
import { DashboardStats } from './models/dashboard-stats.model';
import { FormatDatePipe } from '@shared/pipes/format-date.pipe';
import { AuthService } from '@core/services/auth/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormatDatePipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('heroEkgCanvas') heroEkgCanvas!: ElementRef<HTMLCanvasElement>;

  private readonly api  = inject(DashboardApiService);
  private readonly auth = inject(AuthService);

  isLoading    = signal(true);
  stats        = signal<DashboardStats | null>(null);
  errorMessage = signal<string | null>(null);

  readonly isPaciente = computed(() => {
    const u = this.auth.currentUser();
    return !u?.is_superuser && (u?.groups.includes('paciente') ?? false);
  });
  readonly isAdmin = computed(() => {
    const u = this.auth.currentUser();
    return u?.is_superuser || (u?.groups.includes('administrador') ?? false);
  });
  readonly isInvestigador = computed(() => {
    const u = this.auth.currentUser();
    return !u?.is_superuser && (u?.groups.includes('investigador') ?? false);
  });
  readonly dashboardSubtitle = computed(() => {
    if (this.isAdmin()) return 'Resumen global de clasificación ECG en el sistema';
    if (this.isInvestigador()) return 'Resumen de tu actividad de investigación';
    if (this.isPaciente()) return 'Resumen de tus análisis ECG';
    return 'Resumen de tu actividad de clasificación ECG';
  });
  readonly analysisCardLabel = computed(() =>
    this.isAdmin() ? 'Total Análisis (Sistema)' : 'Total Análisis'
  );

  readonly greeting = computed(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  });

  readonly userName = computed(() => this.auth.currentUser()?.username ?? 'Usuario');

  readonly modeLabels: Record<string, string | undefined> = {
    demo: 'Demo',
    anotado: 'Con Anotaciones',
    produccion: 'Producción',
  };
  readonly modeIcons: Record<string, string | undefined> = {
    demo: 'fas fa-flask',
    anotado: 'fas fa-file-medical-alt',
    produccion: 'fas fa-heartbeat',
  };
  readonly modeBarClass: Record<string, string | undefined> = {
    demo: 'bar-demo',
    anotado: 'bar-anotado',
    produccion: 'bar-produccion',
  };
  readonly modeIconClass: Record<string, string | undefined> = {
    demo: 'mode-icon-demo',
    anotado: 'mode-icon-anotado',
    produccion: 'mode-icon-produccion',
  };

  private rafId = 0;
  private ekgSignal!: Float32Array;
  private offset = 0;
  private resizeObserver?: ResizeObserver;

  ngOnInit(): void {
    this.api.getStats().subscribe({
      next: data => { this.stats.set(data); this.isLoading.set(false); },
      error: () => { this.errorMessage.set('No se pudo cargar el dashboard. Intenta de nuevo.'); this.isLoading.set(false); },
    });
  }

  ngAfterViewInit(): void {
    this.ekgSignal = this.buildEKGSignal(1200, 6);
    this.startHeroAnimation();
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

  private startHeroAnimation(): void {
    const canvas = this.heroEkgCanvas.nativeElement;
    const ctx = canvas.getContext('2d')!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const color = '#2563eb';
    const speed = 1.4;
    const amplitude = 0.48;
    const lineWidth = 1.8;
    let w = 0, h = 0;

    const hexToRgba = (hex: string, a: number): string => {
      const c = parseInt(hex.replace('#', ''), 16);
      return `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width  = Math.max(1, Math.round(rect.width  * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    this.resizeObserver = new ResizeObserver(resize);
    this.resizeObserver.observe(canvas);

    const draw = () => {
      if (w === 0 || h === 0) { this.rafId = requestAnimationFrame(draw); return; }
      const cy  = h * 0.58;
      const amp = h * amplitude * 0.5;
      ctx.clearRect(0, 0, w, h);

      ctx.save();
      ctx.lineWidth = lineWidth;
      ctx.lineJoin  = 'round';
      ctx.lineCap   = 'round';

      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0,    hexToRgba(color, 0));
      grad.addColorStop(0.08, hexToRgba(color, 0.06));
      grad.addColorStop(0.35, hexToRgba(color, 0.30));
      grad.addColorStop(0.72, hexToRgba(color, 0.42));
      grad.addColorStop(0.90, hexToRgba(color, 0.20));
      grad.addColorStop(1,    hexToRgba(color, 0));
      ctx.strokeStyle = grad;

      ctx.beginPath();
      const off = this.offset;
      for (let x = 0; x <= w; x++) {
        const idx = ((Math.floor(x + off) % this.ekgSignal.length) + this.ekgSignal.length) % this.ekgSignal.length;
        const y   = cy - this.ekgSignal[idx] * amp;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      this.offset = (this.offset + speed) % this.ekgSignal.length;
      this.rafId  = requestAnimationFrame(draw);
    };

    this.rafId = requestAnimationFrame(draw);
  }

  getModeEntries(porModo: Record<string, number>): Array<{ modo: string; count: number }> {
    return Object.entries(porModo).map(([modo, count]) => ({ modo, count }));
  }

  getModePercent(count: number): number {
    const total = this.stats()?.total_analisis ?? 0;
    return total > 0 ? Math.round((count / total) * 100) : 0;
  }
}
