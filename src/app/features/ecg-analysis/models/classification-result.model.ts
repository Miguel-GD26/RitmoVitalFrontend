export interface ClassificationResult {
  prediction: string;
  confidence: number;
  confidence_percent: number;
  true_label: string;
  is_correct: boolean;
  all_probabilities: Record<string, number>;
  rr_info: {
    pre_ratio: number;
    es_prematuro: boolean;
  };
}
