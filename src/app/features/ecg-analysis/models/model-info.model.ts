export interface ModelInfo {
  model_file: string;
  model_loaded: boolean;
  model_size_mb: number | null;
  architecture: string;
  standard: string;
  dataset: string;
  classes: Record<string, string>;
  input_shapes: Record<string, string>;
}
