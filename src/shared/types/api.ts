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
