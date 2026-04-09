export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiErrorEnvelope {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedMeta<TFilters = Record<string, unknown>> {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  filters: TFilters;
}
