import {
  Bell,
  CheckCheck,
  CircleUserRound,
  FileSignature,
  Files,
  FolderKanban,
  LayoutDashboard,
  LifeBuoy,
  MessageSquareText
} from 'lucide-react';

export const customerNavigation = [
  { to: '/dashboard', label: 'Обзор', icon: LayoutDashboard },
  { to: '/dashboard/contracts', label: 'Договоры', icon: FileSignature },
  { to: '/dashboard/projects', label: 'Проекты', icon: FolderKanban },
  { to: '/dashboard/documents', label: 'Документы', icon: Files },
  { to: '/dashboard/approvals', label: 'Согласования', icon: CheckCheck },
  { to: '/dashboard/conversations', label: 'Сообщения', icon: MessageSquareText },
  { to: '/dashboard/notifications', label: 'Уведомления', icon: Bell },
  { to: '/dashboard/support', label: 'Поддержка', icon: LifeBuoy },
  { to: '/dashboard/profile', label: 'Профиль', icon: CircleUserRound }
];
