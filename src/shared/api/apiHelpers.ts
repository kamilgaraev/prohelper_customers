import axios from 'axios';

import { ApiEnvelope, ApiErrorEnvelope } from '@shared/types/api';

export function extractApiData<T>(payload: ApiEnvelope<T> | T | null | undefined): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'success' in payload &&
    'data' in payload
  ) {
    return payload.data;
  }

  if (payload == null) {
    throw new Error('Пустой ответ сервера');
  }

  return payload as T;
}

export function resolveApiMessage(
  error: unknown,
  fallbackMessage = 'Не удалось выполнить запрос'
): string {
  if (axios.isAxiosError<ApiErrorEnvelope>(error)) {
    const responseMessage = error.response?.data?.message;

    if (responseMessage) {
      return responseMessage;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}
