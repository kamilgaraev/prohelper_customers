import axios from 'axios';

import { extractApiData, resolveApiMessage } from '@shared/api/apiHelpers';
import { customerApi } from '@shared/api/customerApi';
import type { ApiEnvelope } from '@shared/types/api';

import type { ProjectRfi, RfiDirection, RfiListResult, RfiRecipient } from './rfiTypes';

interface RfiAttachmentDownload {
  url: string;
  expires_in: number;
}

const basePath = '/change-management/rfis';

function actionError(error: unknown, fallback: string): Error {
  if (axios.isAxiosError(error) && error.response?.status === 409) {
    return new Error('Вопрос уже изменился. Обновите карточку и повторите действие.');
  }
  if (axios.isAxiosError(error) && error.response?.status === 413) {
    return new Error('Размер файла не должен превышать 20 МБ.');
  }
  if (axios.isAxiosError(error) && error.response?.status === 415) {
    return new Error('Формат файла не поддерживается. Выберите PDF, DOC, DOCX, XLS, XLSX, PNG или JPG.');
  }
  if (axios.isAxiosError(error) && [403, 404].includes(error.response?.status ?? 0)) {
    return new Error('Вопрос или вложение недоступны. Обновите список и проверьте доступ.');
  }

  return new Error(resolveApiMessage(error, fallback));
}

async function postAction(id: number, action: string, payload: Record<string, unknown>, fallback: string): Promise<ProjectRfi> {
  try {
    const response = await customerApi.post<ApiEnvelope<ProjectRfi>>(`${basePath}/${id}/${action}`, payload);
    return extractApiData(response.data);
  } catch (error) {
    throw actionError(error, fallback);
  }
}

export const rfiService = {
  async list(projectId: number, direction: RfiDirection, page = 1): Promise<RfiListResult> {
    try {
      const response = await customerApi.get<ApiEnvelope<RfiListResult>>(basePath, {
        params: { project_id: projectId, direction, page, per_page: 100 },
      });
      return extractApiData(response.data);
    } catch (error) {
      throw actionError(error, 'Не удалось загрузить вопросы проекта');
    }
  },

  async recipients(projectId: number): Promise<RfiRecipient[]> {
    try {
      const response = await customerApi.get<ApiEnvelope<{ items: RfiRecipient[] }>>(`${basePath}/recipients`, {
        params: { project_id: projectId },
      });
      return extractApiData(response.data).items ?? [];
    } catch (error) {
      throw actionError(error, 'Не удалось загрузить участников проекта');
    }
  },

  async get(id: number): Promise<ProjectRfi> {
    try {
      const response = await customerApi.get<ApiEnvelope<ProjectRfi>>(`${basePath}/${id}`);
      return extractApiData(response.data);
    } catch (error) {
      throw actionError(error, 'Не удалось загрузить вопрос');
    }
  },

  async create(payload: {
    project_id: number;
    subject: string;
    question: string;
    due_date?: string;
    recipient_organization_id?: number;
  }): Promise<ProjectRfi> {
    try {
      const response = await customerApi.post<ApiEnvelope<ProjectRfi>>(basePath, payload);
      return extractApiData(response.data);
    } catch (error) {
      throw actionError(error, 'Не удалось сохранить черновик');
    }
  },

  async send(id: number, recipient_organization_id: number): Promise<ProjectRfi> {
    return postAction(id, 'send', { recipient_organization_id }, 'Не удалось отправить вопрос');
  },

  async answer(id: number, answer: string): Promise<ProjectRfi> {
    return postAction(id, 'answer', { answer }, 'Не удалось отправить ответ');
  },

  async requestClarification(id: number, message: string): Promise<ProjectRfi> {
    return postAction(id, 'clarification', { message }, 'Не удалось запросить уточнение');
  },

  async accept(id: number): Promise<ProjectRfi> {
    return postAction(id, 'accept', {}, 'Не удалось принять ответ');
  },

  async close(id: number): Promise<ProjectRfi> {
    return postAction(id, 'close', {}, 'Не удалось закрыть вопрос');
  },

  async uploadAttachment(id: number, file: File): Promise<ProjectRfi> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await customerApi.post<ApiEnvelope<ProjectRfi>>(`${basePath}/${id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return extractApiData(response.data);
    } catch (error) {
      throw actionError(error, 'Не удалось загрузить вложение');
    }
  },

  async getAttachmentDownloadUrl(id: number, attachmentId: string): Promise<string> {
    try {
      const response = await customerApi.get<ApiEnvelope<RfiAttachmentDownload>>(
        `${basePath}/${id}/attachments/${attachmentId}/download`
      );
      const { url } = extractApiData(response.data);
      if (!url) throw new Error('Ссылка на файл не получена. Запросите её повторно.');
      return url;
    } catch (error) {
      throw actionError(error, 'Не удалось открыть вложение');
    }
  },
};
