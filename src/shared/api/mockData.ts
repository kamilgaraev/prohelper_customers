import { ApprovalItem, ConversationItem, DashboardMetric, ProjectPreview } from '@shared/types/dashboard';
import { CustomerUser } from '@shared/types/auth';

export const mockCustomerUser: CustomerUser = {
  id: 101,
  name: 'РљР°РјРёР»СЊ Р“Р°СЂР°РµРІ',
  email: 'customer@prohelper.pro',
  accountType: 'organization',
  companyName: 'Р“Рљ Р—Р°РєР°Р·С‡РёРє Р”РµРІРµР»РѕРїРјРµРЅС‚',
  role: 'customer_owner',
  roles: ['customer_owner'],
  interfaces: ['customer']
};

export const mockMetrics: DashboardMetric[] = [
  { label: 'РђРєС‚РёРІРЅС‹Рµ РїСЂРѕРµРєС‚С‹', value: '6', tone: 'primary' },
  { label: 'РћР¶РёРґР°СЋС‚ СЂРµС€РµРЅРёСЏ', value: '14', tone: 'warning' },
  { label: 'РќРѕРІС‹Рµ РґРѕРєСѓРјРµРЅС‚С‹', value: '22', tone: 'neutral' },
  { label: 'РќРµРїСЂРѕС‡РёС‚Р°РЅРЅС‹Рµ СЃРѕРѕР±С‰РµРЅРёСЏ', value: '9', tone: 'success' }
];

export const mockProjects: ProjectPreview[] = [
  {
    id: 1,
    name: 'Р‘РёР·РЅРµСЃ-С†РµРЅС‚СЂ РЎРѕРєРѕР»СЊРЅРёРєРё',
    location: 'РњРѕСЃРєРІР°, РЎРѕРєРѕР»СЊРЅРёС‡РµСЃРєРёР№ Р’Р°Р»',
    phase: 'РњРѕРЅРѕР»РёС‚ Рё С„Р°СЃР°РґС‹',
    completion: 72,
    budgetLabel: '1,84 РјР»СЂРґ в‚Ѕ',
    leadLabel: 'Р“РµРЅРїРѕРґСЂСЏРґС‡РёРє: РЎРµРІРµСЂ РЎС‚СЂРѕР№'
  },
  {
    id: 2,
    name: 'Р–Рљ Р®Р¶РЅС‹Р№ РџР°СЂРє',
    location: 'РЎР°РЅРєС‚-РџРµС‚РµСЂР±СѓСЂРі, РџСѓР»РєРѕРІСЃРєРѕРµ С€РѕСЃСЃРµ',
    phase: 'РРЅР¶РµРЅРµСЂРЅС‹Рµ СЃРµС‚Рё',
    completion: 58,
    budgetLabel: '2,31 РјР»СЂРґ в‚Ѕ',
    leadLabel: 'РўРµС…Р·Р°РєР°Р·С‡РёРє: Urban PM'
  },
  {
    id: 3,
    name: 'Р›РѕРіРёСЃС‚РёС‡РµСЃРєРёР№ С…Р°Р± Р’РѕР»РіР°',
    location: 'РљР°Р·Р°РЅСЊ, РРЅРґСѓСЃС‚СЂРёР°Р»СЊРЅР°СЏ Р·РѕРЅР°',
    phase: 'РџРѕРґРіРѕС‚РѕРІРєР° Рє РІРІРѕРґСѓ',
    completion: 91,
    budgetLabel: '930 РјР»РЅ в‚Ѕ',
    leadLabel: 'РџРѕРґСЂСЏРґС‡РёРє: Volga Build'
  }
];

export const mockApprovals: ApprovalItem[] = [
  {
    id: 11,
    title: 'РђРєС‚ РљРЎ-2 Р·Р° РјР°СЂС‚',
    projectName: 'Р‘РёР·РЅРµСЃ-С†РµРЅС‚СЂ РЎРѕРєРѕР»СЊРЅРёРєРё',
    deadlineLabel: 'РќСѓР¶РЅРѕ СЂРµС€РёС‚СЊ РґРѕ 2 Р°РїСЂРµР»СЏ',
    status: 'pending'
  },
  {
    id: 12,
    title: 'РР·РјРµРЅРµРЅРёРµ РіСЂР°С„РёРєР° С„Р°СЃР°РґРѕРІ',
    projectName: 'Р–Рљ Р®Р¶РЅС‹Р№ РџР°СЂРє',
    deadlineLabel: 'РќСѓР¶РЅС‹ РїСЂР°РІРєРё РїРѕ СЃСЂРѕРєР°Рј',
    status: 'changes_requested'
  },
  {
    id: 13,
    title: 'Р”РѕРїСЃРѕРіР»Р°С€РµРЅРёРµ в„–4',
    projectName: 'Р›РѕРіРёСЃС‚РёС‡РµСЃРєРёР№ С…Р°Р± Р’РѕР»РіР°',
    deadlineLabel: 'РЎРѕРіР»Р°СЃРѕРІР°РЅРѕ РІС‡РµСЂР°',
    status: 'approved'
  }
];

export const mockConversations: ConversationItem[] = [
  {
    id: 21,
    title: 'РЎРјРµРЅР° РјР°СЂРєРё СЃС‚РµРєР»РѕРїР°РєРµС‚Р°',
    projectName: 'Р‘РёР·РЅРµСЃ-С†РµРЅС‚СЂ РЎРѕРєРѕР»СЊРЅРёРєРё',
    lastMessage: 'РџРѕРґСЂСЏРґС‡РёРє РїСЂРёР»РѕР¶РёР» РЅРѕРІСѓСЋ СЃРїРµС†РёС„РёРєР°С†РёСЋ Рё Р¶РґС‘С‚ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёСЏ.',
    unreadCount: 3
  },
  {
    id: 22,
    title: 'Р“РѕС‚РѕРІРЅРѕСЃС‚СЊ РёСЃРїРѕР»РЅРёС‚РµР»СЊРЅРѕР№ РґРѕРєСѓРјРµРЅС‚Р°С†РёРё',
    projectName: 'Р–Рљ Р®Р¶РЅС‹Р№ РџР°СЂРє',
    lastMessage: 'РќСѓР¶РЅРѕ СѓС‚РѕС‡РЅРёС‚СЊ РєРѕРјРїР»РµРєС‚ РїРµСЂРµРґ РїРµСЂРµРґР°С‡РµР№ РІ С‚РµС…РЅР°РґР·РѕСЂ.',
    unreadCount: 1
  },
  {
    id: 23,
    title: 'РџР»Р°РЅ РІРІРѕРґР° РѕС‡РµСЂРµРґРё B',
    projectName: 'Р›РѕРіРёСЃС‚РёС‡РµСЃРєРёР№ С…Р°Р± Р’РѕР»РіР°',
    lastMessage: 'РљРѕРјР°РЅРґР° РїСЂРѕРµРєС‚Р° РѕР±РЅРѕРІРёР»Р° РґРѕСЂРѕР¶РЅСѓСЋ РєР°СЂС‚Сѓ Рё РєРѕРЅС‚СЂРѕР»СЊРЅС‹Рµ РґР°С‚С‹.',
    unreadCount: 0
  }
];
