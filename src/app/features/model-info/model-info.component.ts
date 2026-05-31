import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EcgApiService } from '../ecg-analysis/services/ecg-api.service';
import { ModelInfo } from '../ecg-analysis/models/model-info.model';

interface ClassMeta {
  label: string;
  desc: string;
  symbols: string[];
  chipClass: string;
  icon: string;
}

interface InputMeta {
  label: string;
  icon: string;
  branch: string;
  color: string;
}

@Component({
  selector: 'app-model-info',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './model-info.component.html',
  styleUrls: ['./model-info.component.css'],
})
export class ModelInfoComponent implements OnInit {
  private readonly api = inject(EcgApiService);

  isLoading = signal(true);
  modelInfo = signal<ModelInfo | null>(null);
  errorMessage = signal<string | null>(null);

  readonly classMeta: Record<string, ClassMeta> = {
    '0': {
      label: 'Normal (N)',
      desc: 'Ritmo sinusal normal y variantes. Incluye bloqueo de rama izquierda (L), derecha (R) y latidos de escape (e, j).',
      symbols: ['N', 'L', 'R', 'e', 'j'],
      chipClass: 'chip-green',
      icon: 'fas fa-check-circle',
    },
    '1': {
      label: 'Supraventricular (S)',
      desc: 'Latidos ectópicos originados por encima del haz de His. Incluye PAC auriculares (A, a) y de la unión (J, S).',
      symbols: ['A', 'a', 'J', 'S'],
      chipClass: 'chip-blue',
      icon: 'fas fa-chevron-circle-up',
    },
    '2': {
      label: 'Ventricular (V)',
      desc: 'Latidos ectópicos ventriculares (PVC). Incluye contracciones ventriculares prematuras (V) y escapes ventriculares (E).',
      symbols: ['V', 'E'],
      chipClass: 'chip-red',
      icon: 'fas fa-exclamation-circle',
    },
    '3': {
      label: 'Fusión (F)',
      desc: 'Latidos de fusión simultánea entre impulso sinusal y ventricular. Morfología intermedia, clínicamente relevante.',
      symbols: ['F'],
      chipClass: 'chip-yellow',
      icon: 'fas fa-code-branch',
    },
  };

  readonly inputMeta: Record<string, InputMeta> = {
    cwt_image: {
      label: 'Escalograma CWT',
      icon: 'fas fa-image',
      branch: 'Conv2D → MaxPool2D → GlobalAvgPool2D',
      color: 'blue',
    },
    signal_1d: {
      label: 'Señal ECG 1D',
      icon: 'fas fa-wave-square',
      branch: 'Conv1D → MaxPool1D → GlobalAvgPool1D',
      color: 'green',
    },
    rr_intervals: {
      label: 'Intervalos RR',
      icon: 'fas fa-ruler-horizontal',
      branch: 'Dense + BatchNorm',
      color: 'purple',
    },
  };

  ngOnInit(): void {
    this.api.getModelInfo().subscribe({
      next: data => {
        this.modelInfo.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar la información del modelo.');
        this.isLoading.set(false);
      },
    });
  }

  getClassEntries(): Array<{ key: string; meta: ClassMeta }> {
    return Object.entries(this.classMeta).map(([key, meta]) => ({ key, meta }));
  }

  getInputEntries(shapes: Record<string, string>): Array<{ key: string; shape: string; meta: InputMeta }> {
    return Object.entries(shapes).map(([key, shape]) => ({
      key,
      shape,
      meta: this.inputMeta[key] ?? { label: key, icon: 'fas fa-database', branch: '', color: 'gray' },
    }));
  }
}
