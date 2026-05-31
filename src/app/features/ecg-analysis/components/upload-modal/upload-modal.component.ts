import { Component, inject, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvaluationFiles, ProductionFiles } from '../../models/ecg-files.model';
import { ModelConfigService } from '../../services/model-config.service';

type AnalysisMode = 'evaluation' | 'production';
type Step = 'mode' | 'files';

@Component({
  selector: 'app-upload-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upload-modal.component.html',
  styleUrls: ['./upload-modal.component.css']
})
export class UploadModalComponent {
  private readonly modelConfig = inject(ModelConfigService);

  evaluationSubmit = output<EvaluationFiles>();
  productionSubmit = output<ProductionFiles>();
  cancelled = output<void>();

  step = signal<Step>('mode');
  selectedMode = signal<AnalysisMode>('evaluation');

  datFile = signal<File | null>(null);
  heaFile = signal<File | null>(null);
  atrFile = signal<File | null>(null);

  validationError = signal<string | null>(null);

  isEvaluation = computed(() => this.selectedMode() === 'evaluation');

  selectMode(mode: AnalysisMode): void {
    this.selectedMode.set(mode);
  }

  goToFiles(): void {
    this.step.set('files');
    this.datFile.set(null);
    this.heaFile.set(null);
    this.atrFile.set(null);
    this.validationError.set(null);
  }

  goBack(): void {
    this.step.set('mode');
    this.validationError.set(null);
  }

  cancel(): void {
    this.step.set('mode');
    this.selectedMode.set('evaluation');
    this.cancelled.emit();
  }

  onFileChange(event: Event, type: 'dat' | 'hea' | 'atr'): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    if (type === 'dat') this.datFile.set(file);
    else if (type === 'hea') this.heaFile.set(file);
    else this.atrFile.set(file);
    this.validationError.set(null);
  }

  submit(): void {
    const dat = this.datFile();
    const hea = this.heaFile();

    if (!dat || !hea) {
      this.validationError.set('Faltan archivos requeridos.');
      return;
    }

    const base = dat.name.split('.')[0];
    if (hea.name.split('.')[0] !== base) {
      this.validationError.set('Los nombres de archivo no coinciden.');
      return;
    }

    if (this.modelConfig.isPacemakerRecord(base)) {
      this.validationError.set(`El registro ${base} contiene marcapasos y no es compatible.`);
      return;
    }

    if (this.isEvaluation()) {
      const atr = this.atrFile();
      if (!atr) {
        this.validationError.set('Falta el archivo de anotaciones (.atr).');
        return;
      }
      if (atr.name.split('.')[0] !== base) {
        this.validationError.set('Los nombres de archivo no coinciden.');
        return;
      }
      this.evaluationSubmit.emit({ datFile: dat, heaFile: hea, atrFile: atr });
    } else {
      this.productionSubmit.emit({ datFile: dat, heaFile: hea });
    }
  }
}
