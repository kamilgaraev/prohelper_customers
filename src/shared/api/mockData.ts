import { ApprovalItem, ConversationItem, DashboardMetric, ProjectPreview } from '@shared/types/dashboard';
import { CustomerUser } from '@shared/types/auth';

export const mockCustomerUser: CustomerUser = {
  id: 101,
  name: 'Камиль Гараев',
  email: 'customer@prohelper.pro',
  accountType: 'organization',
  companyName: 'ГК Заказчик Девелопмент',
  role: 'customer_owner',
  interfaces: ['customer']
};

export const mockMetrics: DashboardMetric[] = [
  { label: 'Активные проекты', value: '6', tone: 'primary' },
  { label: 'Ожидают решения', value: '14', tone: 'warning' },
  { label: 'Новые документы', value: '22', tone: 'neutral' },
  { label: 'Непрочитанные сообщения', value: '9', tone: 'success' }
];

export const mockProjects: ProjectPreview[] = [
  {
    id: 1,
    name: 'Бизнес-центр Сокольники',
    location: 'Москва, Сокольнический Вал',
    phase: 'Монолит и фасады',
    completion: 72,
    budgetLabel: '1,84 млрд ₽',
    leadLabel: 'Генподрядчик: Север Строй'
  },
  {
    id: 2,
    name: 'ЖК Южный Парк',
    location: 'Санкт-Петербург, Пулковское шоссе',
    phase: 'Инженерные сети',
    completion: 58,
    budgetLabel: '2,31 млрд ₽',
    leadLabel: 'Техзаказчик: Urban PM'
  },
  {
    id: 3,
    name: 'Логистический хаб Волга',
    location: 'Казань, Индустриальная зона',
    phase: 'Подготовка к вводу',
    completion: 91,
    budgetLabel: '930 млн ₽',
    leadLabel: 'Подрядчик: Volga Build'
  }
];

export const mockApprovals: ApprovalItem[] = [
  {
    id: 11,
    title: 'Акт КС-2 за март',
    projectName: 'Бизнес-центр Сокольники',
    deadlineLabel: 'Нужно решить до 2 апреля',
    status: 'pending'
  },
  {
    id: 12,
    title: 'Изменение графика фасадов',
    projectName: 'ЖК Южный Парк',
    deadlineLabel: 'Нужны правки по срокам',
    status: 'changes_requested'
  },
  {
    id: 13,
    title: 'Допсоглашение №4',
    projectName: 'Логистический хаб Волга',
    deadlineLabel: 'Согласовано вчера',
    status: 'approved'
  }
];

export const mockConversations: ConversationItem[] = [
  {
    id: 21,
    title: 'Смена марки стеклопакета',
    projectName: 'Бизнес-центр Сокольники',
    lastMessage: 'Подрядчик приложил новую спецификацию и ждёт подтверждения.',
    unreadCount: 3
  },
  {
    id: 22,
    title: 'Готовность исполнительной документации',
    projectName: 'ЖК Южный Парк',
    lastMessage: 'Нужно уточнить комплект перед передачей в технадзор.',
    unreadCount: 1
  },
  {
    id: 23,
    title: 'План ввода очереди B',
    projectName: 'Логистический хаб Волга',
    lastMessage: 'Команда проекта обновила дорожную карту и контрольные даты.',
    unreadCount: 0
  }
];

