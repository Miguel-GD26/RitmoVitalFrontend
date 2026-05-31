import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafeUrl } from '@angular/platform-browser';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { PatientAnalysisResult, PatientBeat } from '../../models/patient-analysis.model';
import { Patient } from '@core/models/patient.model';

@Component({
  selector: 'app-analysis-results-annotated',
  standalone: true,
  imports: [CommonModule, ScrollingModule],
  templateUrl: './analysis-results-annotated.component.html',
  styleUrls: ['./analysis-results-annotated.component.css'],
})
export class AnalysisResultsAnnotatedComponent {
  result  = input<PatientAnalysisResult | null>(null);
  patient = input<Patient | null>(null);
  plotUrl = input<SafeUrl | string | null>(null);
  reset   = output<void>();

  getStatsArray(stats: Record<string, number>): Array<{ clase: string; porcentaje: number }> {
    return Object.entries(stats).map(([clase, porcentaje]) => ({ clase, porcentaje }));
  }

  trackByIndex(i: number, _: PatientBeat): number { return i; }
}
