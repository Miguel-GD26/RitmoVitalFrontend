import { Pagination } from '../../../core/models/api-response.model';

export interface TaskSubmitResult {
  task_id: string;
  status: 'pending';
}

export interface TaskStatusResponse {
  task_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  message?: string;
  result?: Record<string, unknown>;
}

export interface AnalysisTaskStatus {
  data: TaskStatusResponse;
  pagination?: Pagination;
}
