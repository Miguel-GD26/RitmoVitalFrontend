export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: Pagination;
  error_code?: string;
  errors?: Record<string, unknown>;
  timestamp?: string;
}

export interface ApiError {
  status: number;
  error_code: string;
  message: string;
  errors?: Record<string, string[]>;
}

export interface Pagination {
  page: number;
  page_size: number;
  count: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}
