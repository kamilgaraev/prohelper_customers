import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockedGet, mockedPost } = vi.hoisted(() => ({
  mockedGet: vi.fn(),
  mockedPost: vi.fn(),
}));

vi.mock('@shared/api/customerApi', () => ({
  customerApi: {
    get: mockedGet,
    post: mockedPost,
  },
}));

import { customerPortalService } from '@shared/api/customerPortalService';

describe('customerPortalService contracts flow', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedPost.mockReset();
  });

  it('sanitizes empty contract filters and unwraps paginated contracts payload', async () => {
    mockedGet.mockResolvedValue({
      data: {
        success: true,
        data: {
          items: [
            {
              id: 11,
              number: 'C-002',
              status: 'draft',
              subject: 'Тестовый договор',
              customer: {
                id: 9,
                name: 'ООО Заказчик',
              },
              contract_side: {
                type: 'customer_to_general_contractor',
                display_label: 'Заказчик -> Генподрядчик',
                first_party: {
                  id: 9,
                  name: 'ООО Заказчик',
                },
                second_party: {
                  id: 18,
                  name: 'ООО Генподрядчик',
                },
                first_party_role_label: 'Заказчик',
                second_party_role_label: 'Генподрядчик',
                customer_organization: {
                  id: 9,
                  name: 'ООО Заказчик',
                },
                executor_organization: {
                  id: 18,
                  name: 'ООО Генподрядчик',
                },
              },
              current_organization_role: 'customer',
            },
          ],
          meta: {
            current_page: 1,
            per_page: 5,
            total: 1,
            last_page: 1,
            filters: {
              search: 'C-002',
              project_id: 7,
            },
          },
        },
      },
    });

    const response = await customerPortalService.getContracts({
      page: 1,
      per_page: 5,
      project_id: 7,
      contractor_search: 'Заказ',
      search: 'C-002',
      status: '',
      contractor_id: undefined,
    });

    expect(mockedGet).toHaveBeenCalledWith('/contracts', {
      params: {
        page: 1,
        per_page: 5,
        project_id: 7,
        contractor_search: 'Заказ',
        search: 'C-002',
      },
    });
    expect(response.items).toHaveLength(1);
    expect(response.items[0].contract_side?.type).toBe('customer_to_general_contractor');
    expect(response.items[0].current_organization_role).toBe('customer');
    expect(response.meta.filters.project_id).toBe(7);
  });

  it('loads project-scoped contracts through the paginated endpoint', async () => {
    mockedGet.mockResolvedValue({
      data: {
        success: true,
        data: {
          items: [
            {
              id: 12,
              number: 'C-003',
              status: 'active',
              subject: 'Договор проекта',
            },
          ],
          meta: {
            current_page: 2,
            per_page: 10,
            total: 11,
            last_page: 2,
            filters: {
              page: 2,
              per_page: 10,
              status: 'active',
            },
          },
        },
      },
    });

    const response = await customerPortalService.getProjectContracts(42, {
      page: 2,
      per_page: 10,
      status: 'active',
    });

    expect(mockedGet).toHaveBeenCalledWith('/projects/42/contracts', {
      params: {
        page: 2,
        per_page: 10,
        status: 'active',
      },
    });
    expect(response.meta.current_page).toBe(2);
    expect(response.meta.total).toBe(11);
    expect(response.items[0].number).toBe('C-003');
  });

  it('loads read-only quality defects with sanitized filters', async () => {
    mockedGet.mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            id: 77,
            defect_number: 'QD-77',
            title: 'Отклонение отделки',
            status: 'open',
            status_label: 'Открыт',
            severity: 'major',
            severity_label: 'Существенный',
            inspection_required: true,
            created_at: '2026-05-14T10:00:00+03:00',
            updated_at: '2026-05-14T10:00:00+03:00',
          },
        ],
      },
    });

    const response = await customerPortalService.getQualityDefects({
      project_id: 15,
      status: '',
      severity: 'major',
      overdue: false,
    });

    expect(mockedGet).toHaveBeenCalledWith('/quality-control/defects', {
      params: {
        project_id: 15,
        severity: 'major',
        overdue: false,
      },
    });
    expect(response).toHaveLength(1);
    expect(response[0].defect_number).toBe('QD-77');
  });

  it('loads transmitted executive documentation sets for customer documents center', async () => {
    mockedGet.mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            id: 18,
            project_id: 4,
            set_number: 'ED-202605-0001',
            title: 'Foundation executive package',
            status: 'transmitted',
            status_label: 'Передано',
            project: {
              id: 4,
              name: 'ЖК Север',
            },
            documents: [
              {
                id: 30,
                document_type: 'hidden_work_act',
                document_type_label: 'Акт скрытых работ',
                title: 'Армирование фундамента',
                status: 'approved',
                status_label: 'Согласован',
                versions: [
                  {
                    id: 41,
                    document_id: 30,
                    version_number: '1.0',
                    file_url: 'https://cdn.example.com/ed-1.pdf',
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    const response = await customerPortalService.getExecutiveDocumentSets();

    expect(mockedGet).toHaveBeenCalledWith('/executive-documentation/sets');
    expect(response).toHaveLength(1);
    expect(response[0].documents?.[0].versions?.[0].file_url).toBe('https://cdn.example.com/ed-1.pdf');
  });

  it('uses real customer executive-documentation lifecycle endpoints', async () => {
    mockedPost
      .mockResolvedValueOnce({ data: { success: true, data: { id: 51, status: 'open' } } })
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            id: 18,
            project_id: 4,
            set_number: 'ED-202605-0001',
            title: 'Foundation executive package',
            status: 'transmitted',
            status_label: 'Передано',
            transmittal: {
              id: 9,
              transmittal_number: 'TR-2026-0001',
              acknowledged: true,
            },
          },
        },
      });

    await customerPortalService.addExecutiveDocumentRemark(30, {
      body: 'Нужен паспорт партии бетона',
      severity: 'major',
    });
    const acknowledged = await customerPortalService.acknowledgeExecutiveDocumentSet(18, {
      comment: 'Получено',
    });

    expect(mockedPost).toHaveBeenNthCalledWith(1, '/executive-documentation/documents/30/remarks', {
      body: 'Нужен паспорт партии бетона',
      severity: 'major',
    });
    expect(mockedPost).toHaveBeenNthCalledWith(2, '/executive-documentation/sets/18/acknowledge', {
      comment: 'Получено',
    });
    expect(acknowledged.transmittal?.acknowledged).toBe(true);
  });

  it('uses customer change-management approval endpoints', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          items: [
            {
              id: 5,
              project_id: 9,
              change_number: 'CHG-00001',
              title: 'Дополнительное армирование',
              status: 'customer_review',
              impact: {
                cost_delta: '125000.00',
                schedule_delta_days: 4,
                requires_customer_approval: true,
              },
              problem_flags: [{ code: 'schedule_impact', message: 'Влияет на график', severity: 'warning' }],
            },
          ],
        },
      },
    });
    mockedPost.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          id: 5,
          status: 'approved',
          customer_approval: {
            status: 'approved',
            comment: 'Согласовано',
          },
        },
      },
    });

    const changes = await customerPortalService.getChangeApprovals();
    const approved = await customerPortalService.approveChangeRequest(5, { comment: 'Согласовано' });

    expect(mockedGet).toHaveBeenCalledWith('/change-management/changes');
    expect(changes[0].impact?.schedule_delta_days).toBe(4);
    expect(mockedPost).toHaveBeenCalledWith('/change-management/changes/5/approve', { comment: 'Согласовано' });
    expect(approved.customer_approval?.status).toBe('approved');
  });

  it('loads customer handover scopes with sanitized project filter', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          {
            id: 10,
            project_id: 9,
            title: 'Секция А / этаж 2',
            status: 'findings_open',
            project: { id: 9, name: 'ЖК Север' },
            findings: [
              {
                id: 31,
                acceptance_scope_id: 10,
                acceptance_session_id: 21,
                title: 'Скол плитки',
                severity: 'major',
                status: 'open',
              },
            ],
            handover_package: {
              id: 40,
              acceptance_scope_id: 10,
              title: 'Комплект передачи',
              status: 'draft',
              documents: [{ id: 41, title: 'Исполнительная документация', is_required: true, status: 'draft' }],
            },
          },
        ],
      },
    });

    const scopes = await customerPortalService.getHandoverScopes({
      project_id: 9,
    });

    expect(mockedGet).toHaveBeenCalledWith('/handover-acceptance/scopes', {
      params: {
        project_id: 9,
      },
    });
    expect(scopes[0].findings[0].title).toBe('Скол плитки');
    expect(scopes[0].handover_package?.documents[0].is_required).toBe(true);
  });

  it('uses customer handover sign and reject endpoints', async () => {
    mockedPost.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          id: 10,
          status: 'handed_over',
        },
      },
    });
    mockedPost.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          id: 10,
          status: 'reopened',
        },
      },
    });

    const signed = await customerPortalService.signHandoverScope(10);
    const rejected = await customerPortalService.rejectHandoverScope(10, {
      reason: 'Нужно проверить комплект ключей',
    });

    expect(mockedPost).toHaveBeenNthCalledWith(1, '/handover-acceptance/scopes/10/handover');
    expect(mockedPost).toHaveBeenNthCalledWith(2, '/handover-acceptance/scopes/10/reject', {
      reason: 'Нужно проверить комплект ключей',
    });
    expect(signed.status).toBe('handed_over');
    expect(rejected.status).toBe('reopened');
  });

  it('normalizes empty customer portal payloads without mock fallbacks', async () => {
    mockedGet
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {},
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {},
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {},
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {},
        },
      });

    await expect(customerPortalService.getProjects()).resolves.toEqual([]);
    await expect(customerPortalService.getApprovals()).resolves.toEqual([]);
    await expect(customerPortalService.getConversations()).resolves.toEqual([]);

    const dashboard = await customerPortalService.getDashboard();

    expect(mockedGet).toHaveBeenNthCalledWith(1, '/projects');
    expect(mockedGet).toHaveBeenNthCalledWith(2, '/approvals');
    expect(mockedGet).toHaveBeenNthCalledWith(3, '/conversations');
    expect(mockedGet).toHaveBeenNthCalledWith(4, '/dashboard');
    expect(dashboard.metrics).toEqual([]);
    expect(dashboard.attention_feed).toEqual({
      contracts: [],
      approvals: [],
      issues: [],
      requests: [],
    });
    expect(dashboard.project_risks).toEqual([]);
    expect(dashboard.recent_changes).toEqual([]);
  });
});
