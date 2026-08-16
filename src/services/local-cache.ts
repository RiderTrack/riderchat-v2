import { Chat, Message, QuickTemplate, WhatsAppConfig } from '../types/chat';
import { Preferences } from '@capacitor/preferences';

// ═══════════════════════════════════════════════════════════
// 🔧 SISTEMA DE ALMACENAMIENTO v4 (Solución definitiva)
// - APK: SOLO Preferences (persistente)
// - Web: SOLO localStorage
// - Setters: async con await
// - Getters: síncronos (leen de memoryCache)
// - Precarga automática al iniciar
// ═══════════════════════════════════════════════════════════

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

// Detectar ambiente
const isNativeAPK = typeof (window as any).Capacitor !== 'undefined' &&
                    (window as any).Capacitor?.isNative === true;

console.log(isNativeAPK ? '📱 Ambiente: APK nativo' : '🌐 Ambiente: Web');

// memoryCache para lecturas síncronas
const memoryCache: { [key: string]: string | null } = {};

// Flag y Promise de carga
let loaded = false;
let loadPromise: Promise<void>;

// Sistema de eventos para notificar carga
type Listener = () => void;
const listeners: Set<Listener> = new Set();

export function onConfigLoaded(listener: Listener): () => void {
  if (loaded) {
    // Ya está cargado, ejecutar inmediatamente
    setTimeout(listener, 0);
    return () => {};
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyLoaded() {
  listeners.forEach(l => {
    try { l(); } catch (e) { console.warn('Listener error:', e); }
  });
  listeners.clear();
}

// Esperar a que termine la precarga
export function waitForLoad(): Promise<void> {
  return loadPromise;
}

// Función async para guardar
async function setItem(key: string, value: string): Promise<void> {
  // Actualizar memoryCache SIEMPRE (síncrono, inmediato)
  memoryCache[key] = value;

  if (isNativeAPK) {
    // APK: SOLO Preferences
    await Preferences.set({ key, value });
  } else {
    // Web: SOLO localStorage
    localStorage.setItem(key, value);
  }
}

// Función async para leer
async function getItem(key: string): Promise<string | null> {
  if (isNativeAPK) {
    // APK: SOLO Preferences
    const result = await Preferences.get({ key });
    return result.value;
  } else {
    // Web: SOLO localStorage
    return localStorage.getItem(key);
  }
}

// Función async para eliminar
async function removeItem(key: string): Promise<void> {
  delete memoryCache[key];
  if (isNativeAPK) {
    await Preferences.remove({ key });
  } else {
    localStorage.removeItem(key);
  }
}

// Precargar TODA la config desde el almacenamiento al iniciar
async function preloadAll(): Promise<void> {
  try {
    if (isNativeAPK) {
      console.log('🔄 Precargando datos desde Preferences...');
    } else {
      console.log('🔄 Precargando datos desde localStorage...');
    }

    for (const key of Object.values(KEYS)) {
      const value = await getItem(key);
      if (value !== null) {
        memoryCache[key] = value;
        console.log('✅ recuperado:', key);
      }
    }

    // También precargar mensajes offline por teléfono (no se conocen las keys exactas)
    if (!isNativeAPK) {
      // En Web, no podemos enumerar, pero localStorage ya está disponible
    }

    loaded = true;
    console.log('✅ Precarga completada - memoryCache listo');
    notifyLoaded();
  } catch (e) {
    console.warn('⚠️ Error en precarga:', e);
    loaded = true;
    notifyLoaded();
  }
}

// Iniciar precarga
loadPromise = preloadAll();

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
  phoneNumberId: '1272517762604297',
  accessToken: '',
  businessAccountId: '',
  mockMode: false,
};

export const localCache = {
  // ═══════════════════════════════════════════════════════════
  // GETTERS - Síncronos (leen de memoryCache)
  // ═══════════════════════════════════════════════════════════
  getActiveChatPhone(): string | null {
    return memoryCache[KEYS.ACTIVE_CHAT] || null;
  },

  getDraft(phone: string): string {
    try {
      const draftsJson = memoryCache[KEYS.DRAFTS];
      if (!draftsJson) return '';
      const drafts = JSON.parse(draftsJson);
      return drafts[phone] || '';
    } catch {
      return '';
    }
  },

  getQuickTemplates(): QuickTemplate[] {
    try {
      const saved = memoryCache[KEYS.QUICK_TEMPLATES];
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed reading quick templates', e);
    }
    return DEFAULT_QUICK_TEMPLATES;
  },

  getWhatsAppConfig(): WhatsAppConfig {
    try {
      const saved = memoryCache[KEYS.WA_CONFIG];
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_WA_CONFIG, ...parsed };
      }
    } catch (e) {
      console.warn('Failed reading WhatsApp config', e);
    }
    return DEFAULT_WA_CONFIG;
  },

  getOfflineChats(): Chat[] {
    try {
      const saved = memoryCache[KEYS.OFFLINE_CHATS];
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error loading offline chats', e);
    }
    return [];
  },

  getOfflineMessages(phone: string): Message[] {
    try {
      const saved = memoryCache[`${KEYS.OFFLINE_MESSAGES_PREFIX}${phone}`];
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(`Error loading messages for ${phone}`, e);
    }
    return [];
  },

  getTheme(): string {
    return memoryCache[KEYS.THEME] || 'dark';
  },

  isCompactMode(): boolean {
    return memoryCache[KEYS.COMPACT_MODE] === 'true';
  },

  // ═══════════════════════════════════════════════════════════
  // SETTERS - Async con await (persisten en APK)
  // ═══════════════════════════════════════════════════════════
  async setActiveChatPhone(phone: string | null): Promise<void> {
    if (phone) {
      await setItem(KEYS.ACTIVE_CHAT, phone);
    } else {
      await removeItem(KEYS.ACTIVE_CHAT);
    }
  },

  async saveDraft(phone: string, text: string): Promise<void> {
    try {
      const draftsJson = memoryCache[KEYS.DRAFTS];
      const drafts = draftsJson ? JSON.parse(draftsJson) : {};
      if (text.trim()) {
        drafts[phone] = text;
      } else {
        delete drafts[phone];
      }
      await setItem(KEYS.DRAFTS, JSON.stringify(drafts));
    } catch (e) {
      console.warn('Error saving draft', e);
    }
  },

  async saveQuickTemplates(templates: QuickTemplate[]): Promise<void> {
    await setItem(KEYS.QUICK_TEMPLATES, JSON.stringify(templates));
  },

  async saveWhatsAppConfig(config: WhatsAppConfig): Promise<void> {
    await setItem(KEYS.WA_CONFIG, JSON.stringify(config));
  },

  async saveOfflineChats(chats: Chat[]): Promise<void> {
    await setItem(KEYS.OFFLINE_CHATS, JSON.stringify(chats));
  },

  async saveOfflineMessages(phone: string, messages: Message[]): Promise<void> {
    await setItem(`${KEYS.OFFLINE_MESSAGES_PREFIX}${phone}`, JSON.stringify(messages));
  },

  async setTheme(theme: string): Promise<void> {
    await setItem(KEYS.THEME, theme);
  },

  async setCompactMode(enabled: boolean): Promise<void> {
    await setItem(KEYS.COMPACT_MODE, enabled ? 'true' : 'false');
  },

  // ═══════════════════════════════════════════════════════════
  // UTILIDADES
  // ═══════════════════════════════════════════════════════════
  async clearAll(): Promise<void> {
    for (const key of Object.values(KEYS)) {
      await removeItem(key);
    }
    console.log('🧹 Todo el cache limpio');
  },

  debugStatus(): void {
    console.log({
      environment: isNativeAPK ? 'APK' : 'Web',
      loaded,
      cacheSize: Object.keys(memoryCache).length,
      keys: Object.keys(memoryCache),
    });
  },
};
