import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafeUrl } from '@angular/platform-browser';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { ProductionAnalysisResult, ProductionBeat } from '../../models/production-analysis.model';
import { Patient } from '@core/models/patient.model';

@Component({
  selector: 'app-analysis-results-production',
  standalone: true,
  imports: [CommonModule, ScrollingModule],
  templateUrl: './analysis-results-production.component.html',
  styleUrls: ['./analysis-results-production.component.css'],
})
export class AnalysisResultsProductionComponent {
  result  = input<ProductionAnalysisResult | null>(null);
  patient = input<Patient | null>(null);
  plotUrl = input<SafeUrl | string | null>(null);
  reset   = output<void>();

  getStatsArray(stats: Record<string, number>): Array<{ clase: string; porcentaje: number }> {
    return Object.entries(stats).map(([clase, porcentaje]) => ({ clase, porcentaje }));
  }

  trackByIndex(i: number, _: ProductionBeat): number { return i; }
}
