import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { EcgApiService } from '../ecg-analysis/services/ecg-api.service';
import { EcgSample } from '../ecg-analysis/models/ecg-sample.model';
import { ClassificationResult } from '../ecg-analysis/models/classification-result.model';
import { MODEL_ACCURACY_DISPLAY, TOTAL_ANALYSES_DISPLAY } from '@core/constants/ecg-domain.constants';

@Component({
  selector: 'app-demo-ecg',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './demo-ecg.component.html',
  styleUrls: ['./demo-ecg.component.scss']
})
export class DemoEcgComponent implements OnInit {
  private readonly api = inject(EcgApiService);
  private readonly sanitizer = inject(DomSanitizer);

  isLoading = signal(true);
  isClassifying = signal(false);
  errorMessage = signal<string | null>(null);
  currentSample = signal<EcgSample | null>(null);
  classificationResult = signal<ClassificationResult | null>(null);

  ecgPlotUrl = computed(() => {
    const s = this.currentSample();
    return s ? this.sanitizer.bypassSecurityTrustUrl('data:image/png;base64,' + s.ecg_plot) : null;
  });

  readonly MODEL_ACCURACY = MODEL_ACCURACY_DISPLAY;
  readonly TOTAL_ANALYSES = TOTAL_ANALYSES_DISPLAY;

  ngOnInit(): void {
    this.loadNewSample();
  }

  loadNewSample(): void {
    this.isLoading.set(true);
    this.classificationResult.set(null);
    this.errorMessage.set(null);
    this.currentSample.set(null);

    this.api.getNewSample().subscribe({
      next: data => {
        this.currentSample.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudo conectar con el servidor.');
        this.isLoading.set(false);
      }
    });
  }

  classifyCurrentSample(): void {
    const sample = this.currentSample();
    if (!sample || this.isClassifying()) return;
    this.isClassifying.set(true);
    this.classificationResult.set(null);

    this.api.classifySample(sample.beat_index).subscribe({
      next: result => {
        this.classificationResult.set(result);
        this.isClassifying.set(false);
      },
      error: () => {
        this.errorMessage.set('Error al procesar el latido.');
        this.isClassifying.set(false);
      }
    });
  }
}
