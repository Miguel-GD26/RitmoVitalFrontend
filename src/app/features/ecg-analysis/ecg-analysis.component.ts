import { Component, OnInit, DestroyRef, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { timer, EMPTY, expand, switchMap } from 'rxjs';
import { EcgApiService } from './services/ecg-api.service';
import { ModelConfigService } from './services/model-config.service';
import { NotificationService } from '@core/services/notification/notification.service';
import { Patient } from '@core/models/patient.model';
import { PatientAnalysisResult } from './models/patient-analysis.model';
import { ProductionAnalysisResult } from './models/production-analysis.model';
import { AnalysisResultsAnnotatedComponent } from './components/analysis-results-annotated/analysis-results-annotated.component';
import { AnalysisResultsProductionComponent } from './components/analysis-results-production/analysis-results-production.component';
import { AppPatientSelectComponent } from '@shared/components/app-patient-select/app-patient-select.component';

type AnalysisMode = 'evaluation' | 'production';

@Component({
  selector: 'app-ecg-analysis',
  standalone: true,
  imports: [CommonModule, AnalysisResultsAnnotatedComponent, AnalysisResultsProductionComponent, AppPatientSelectComponent],
  templateUrl: './ecg-analysis.component.html',
  styleUrls: ['./ecg-analysis.component.css']
})
export class EcgAnalysisComponent implements OnInit {
  private readonly api           = inject(EcgApiService);
  private readonly modelConfig   = inject(ModelConfigService);
  private readonly route         = inject(ActivatedRoute);
  private readonly sanitizer     = inject(DomSanitizer);
  private readonly destroyRef    = inject(DestroyRef);
  private readonly notifications = inject(NotificationService);

  mode             = signal<AnalysisMode>('evaluation');
  isAnalyzing      = signal(false);
  hasResult        = signal(false);
  errorMessage     = signal<string | null>(null);
  validationError  = signal<string | null>(null);
  statusMessage    = signal<string>('Procesando señal ECG...');
  patientResult    = signal<PatientAnalysisResult | null>(null);
  productionResult = signal<ProductionAnalysisResult | null>(null);

  datFile = signal<File | null>(null);
  heaFile = signal<File | null>(null);
  atrFile = signal<File | null>(null);

  selectedPatient = signal<Patient | null>(null);

  readonly isEvaluation = computed(() => this.mode() === 'evaluation');

  readonly ecgPlotUrl = computed<SafeUrl | string | null>(() => {
    const result = this.isEvaluation() ? this.patientResult() : this.productionResult();
    if (!result?.signal_plot) return null;
    const plot = result.signal_plot;
    if (plot.startsWith('http')) return plot;
    return this.sanitizer.bypassSecurityTrustUrl('data:image/png;base64,' + plot);
  });

  ngOnInit(): void {
    const routeMode = this.route.snapshot.data['mode'] as AnalysisMode;
    this.mode.set(routeMode ?? 'evaluation');
    this.notifications.requestPermission();
  }

  onPatientChange(patient: Patient | null): void {
    this.selectedPatient.set(patient);
  }

  // ── Files ────────────────────────────────────────────────────────────

  onFileChange(event: Event, type: 'dat' | 'hea' | 'atr'): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    if (type === 'dat') this.datFile.set(file);
    else if (type === 'hea') this.heaFile.set(file);
    else this.atrFile.set(file);
    this.validationError.set(null);
  }

  // ── Submit & poll ────────────────────────────────────────────────────

  submit(): void {
    const dat = this.datFile();
    const hea = this.heaFile();
    if (!dat || !hea) { this.validationError.set('Faltan archivos requeridos (.dat y .hea).'); return; }
    const base = dat.name.split('.')[0];
    if (hea.name.split('.')[0] !== base) { this.validationError.set('Los nombres de archivo no coinciden.'); return; }
    if (this.modelConfig.isPacemakerRecord(base)) {
      this.validationError.set(`El registro "${base}" contiene marcapasos y no es compatible.`);
      return;
    }
    const pacienteId = this.selectedPatient()?.id;
    if (this.isEvaluation()) {
      const atr = this.atrFile();
      if (!atr) { this.validationError.set('Falta el archivo de anotaciones (.atr).'); return; }
      if (atr.name.split('.')[0] !== base) { this.validationError.set('Los nombres de archivo no coinciden.'); return; }
      this.submitAndPoll(() => this.api.analyzePatient({ datFile: dat, heaFile: hea, atrFile: atr, pacienteId }), 'annotated');
    } else {
      this.submitAndPoll(() => this.api.analyzeProduction({ datFile: dat, heaFile: hea, pacienteId }), 'production');
    }
  }

  private submitAndPoll(submit: () => ReturnType<typeof this.api.analyzePatient>, mode: 'annotated' | 'production'): void {
    this.isAnalyzing.set(true);
    this.errorMessage.set(null);
    this.statusMessage.set('Enviando archivos...');

    submit().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ task_id }) => {
        this.statusMessage.set('Analizando señal ECG...');
        this.pollWithBackoff(task_id).pipe(
          takeUntilDestroyed(this.destroyRef),
        ).subscribe({
          next: res => {
            const { status, message, result } = res.data;
            if (message) this.statusMessage.set(message);
            if (status === 'completed' && result) {
              const pagination = res.pagination ?? undefined;
              this.isAnalyzing.set(false);
              if (mode === 'annotated') {
                this.patientResult.set({ ...result, pagination } as PatientAnalysisResult);
              } else {
                this.productionResult.set({ ...result, pagination } as ProductionAnalysisResult);
              }
              this.hasResult.set(true);
              this.sendNotification(mode, result as Record<string, unknown>);
            } else if (status === 'failed') {
              this.isAnalyzing.set(false);
              this.errorMessage.set(message ?? 'El análisis falló en el servidor.');
            }
          },
          error: () => {
            this.isAnalyzing.set(false);
            this.errorMessage.set('Error al verificar el estado del análisis.');
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.isAnalyzing.set(false);
        this.errorMessage.set(this.extractError(err));
      },
    });
  }

  private sendNotification(mode: 'annotated' | 'production', result: Record<string, unknown>): void {
    const patient = this.selectedPatient();
    const who = patient ? `${patient.nombre} ${patient.apellido}` : String(result['record_name'] ?? '');
    if (mode === 'annotated') {
      const acc = typeof result['accuracy'] === 'number' ? result['accuracy'].toFixed(1) : '—';
      this.notifications.notify('Análisis completado', `Registro ${who} procesado. Accuracy: ${acc}%`);
    } else {
      this.notifications.notify('Análisis completado', `${result['total_latidos']} latidos detectados para ${who}.`);
    }
  }

  resetForm(): void {
    this.hasResult.set(false);
    this.patientResult.set(null);
    this.productionResult.set(null);
    this.datFile.set(null);
    this.heaFile.set(null);
    this.atrFile.set(null);
    this.errorMessage.set(null);
    this.validationError.set(null);
    this.selectedPatient.set(null);
  }

  private pollWithBackoff(taskId: string) {
    const DELAYS = [2000, 4000, 8000, 15000, 30000];
    let attempt = 0;
    return this.api.getAnalysisStatus(taskId).pipe(
      expand(res => {
        if (res.data.status === 'completed' || res.data.status === 'failed') return EMPTY;
        const d = DELAYS[Math.min(attempt++, DELAYS.length - 1)];
        return timer(d).pipe(switchMap(() => this.api.getAnalysisStatus(taskId)));
      }),
    );
  }

  private extractError(err: HttpErrorResponse): string {
    if (err.error?.message) {
      const details = err.error.errors ? Object.values(err.error.errors).flat().join(', ') : '';
      return details ? `${err.error.message}: ${details}` : err.error.message;
    }
    return err.error?.error ?? 'Ocurrió un error inesperado en el servidor.';
  }
}
