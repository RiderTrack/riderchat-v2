import { Chat, Message, QuickTemplate, WhatsAppConfig } from '../types/chat';

const KEYS = {
  ACTIVE_CHAT: 'riderchat_active_phone',
  THEME: 'riderchat_theme',
  COMPACT_MODE: 'riderchat_compact_mode',
  DRAFTS: 'riderchat_drafts',
  QUICK_TEMPLATES: 'riderchat_quick_templates',
  WA_CONFIG: 'riderchat_wa_config',
  OFFLINE_CHATS: 'riderchat_offline_chats_v2',
  OFFLINE_MESSAGES_PREFIX: 'riderchat_offline_msg_',
};

export const DEFAULT_QUICK_TEMPLATES: QuickTemplate[] = [
  {
    id: 'tmpl_1',
    title: '🚀 Inicio de Ruta',
    category: 'delivery',
    content: '¡Hola {{cliente}}! 👋 Soy tu rider de MATE Pharmacy. Hoy te entrego tu pedido. ¿A qué hora te viene bien la entrega?',
    variables: ['cliente'],
  },
  {
    id: 'tmpl_2',
    title: '⏱️ Avisar llegada',
    category: 'delivery',
    content: '¡Hola {{cliente}}! Ya estoy cerca de tu ubicación. Llego en aproximadamente {{minutos}} minutos. 🛵💨',
    variables: ['cliente', 'minutos'],
  },
  {
    id: 'tmpl_3',
    title: '📍 Solicitar Ubicación',
    category: 'delivery',
    content: '¡Hola {{cliente}}! Por favor envíame tu ubicación actual por WhatsApp para llegar sin problemas. 📍',
    variables: ['cliente'],
  },
  {
    id: 'tmpl_4',
    title: '✅ Pedido Entregado',
    category: 'delivery',
    content: '✅ ¡Pedido entregado!\n\nGracias por confiar en MATE Pharmacy 🙏\n\n¿Tienes alguna consulta o reclamo?\n📱 WhatsApp: 956 203 893 (Fabiana)\n📞 Llamadas: 956 203 893\n\n¡Estamos para ayudarte! 😊',
  },
  {
    id: 'tmpl_5',
    title: '💳 Confirmar Pago',
    category: 'payment',
    content: 'Estimado/a {{cliente}}, el total a cancelar es S/ {{monto}}. Puedes Yapear o Plinear al número registrado. ¡Avisas cuando realices la transferencia! 📲',
    variables: ['cliente', 'monto'],
  },
];

export const DEFAULT_WA_CONFIG: WhatsAppConfig = {
  // Precargado con el Phone Number ID de Rudy (MATE Pharmacy)
  phoneNumberId: '1272517762604297',
  accessToken: '',
  businessAccountId: '',
  mockMode: true, // Inicia en modo simulación hasta que Rudy ingrese el token
};

export const localCache = {
  // Active Chat ID
  getActiveChatPhone(): string | null {
    try {
      return localStorage.getItem(KEYS.ACTIVE_CHAT);
    } catch {
      return null;
    }
  },
  setActiveChatPhone(phone: string | null): void {
    try {
      if (phone) {
        localStorage.setItem(KEYS.ACTIVE_CHAT, phone);
      } else {
        localStorage.removeItem(KEYS.ACTIVE_CHAT);
      }
    } catch (e) {
      console.warn('LocalStorage error setting active chat', e);
    }
  },

  // Message Drafts
  getDraft(phone: string): string {
    try {
      const draftsJson = localStorage.getItem(KEYS.DRAFTS);
      if (!draftsJson) return '';
      const drafts = JSON.parse(draftsJson);
      return drafts[phone] || '';
    } catch {
      return '';
    }
  },
  saveDraft(phone: string, text: string): void {
    try {
      const draftsJson = localStorage.getItem(KEYS.DRAFTS);
      const drafts = draftsJson ? JSON.parse(draftsJson) : {};
      if (text.trim()) {
        drafts[phone] = text;
      } else {
        delete drafts[phone];
      }
      localStorage.setItem(KEYS.DRAFTS, JSON.stringify(drafts));
    } catch (e) {
      console.warn('LocalStorage error saving draft', e);
    }
  },

  // Quick Templates
  getQuickTemplates(): QuickTemplate[] {
    try {
      const saved = localStorage.getItem(KEYS.QUICK_TEMPLATES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed reading quick templates', e);
    }
    return DEFAULT_QUICK_TEMPLATES;
  },
  saveQuickTemplates(templates: QuickTemplate[]): void {
    try {
      localStorage.setItem(KEYS.QUICK_TEMPLATES, JSON.stringify(templates));
    } catch (e) {
      console.warn('LocalStorage error saving templates', e);
    }
  },

  // WhatsApp Meta Cloud API Config
  getWhatsAppConfig(): WhatsAppConfig {
    try {
      const saved = localStorage.getItem(KEYS.WA_CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_WA_CONFIG, ...parsed };
      }
    } catch (e) {
      console.warn('Failed reading WhatsApp config', e);
    }
    return DEFAULT_WA_CONFIG;
  },
  saveWhatsAppConfig(config: WhatsAppConfig): void {
    try {
      localStorage.setItem(KEYS.WA_CONFIG, JSON.stringify(config));
    } catch (e) {
      console.warn('LocalStorage error saving WhatsApp config', e);
    }
  },

  // Offline Cache for Chats
  saveOfflineChats(chats: Chat[]): void {
    try {
      localStorage.setItem(KEYS.OFFLINE_CHATS, JSON.stringify(chats));
    } catch (e) {
      console.warn('Error saving offline chats', e);
    }
  },
  getOfflineChats(): Chat[] {
    try {
      const saved = localStorage.getItem(KEYS.OFFLINE_CHATS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error loading offline chats', e);
    }
    return [];
  },

  // Offline Cache for Messages by Chat Phone
  saveOfflineMessages(phone: string, messages: Message[]): void {
    try {
      localStorage.setItem(`${KEYS.OFFLINE_MESSAGES_PREFIX}${phone}`, JSON.stringify(messages));
    } catch (e) {
      console.warn(`Error saving offline messages for ${phone}`, e);
    }
  },
  getOfflineMessages(phone: string): Message[] {
    try {
      const saved = localStorage.getItem(`${KEYS.OFFLINE_MESSAGES_PREFIX}${phone}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(`Error loading offline messages for ${phone}`, e);
    }
    return [];
  },
};
