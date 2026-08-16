import { Chat, Message, QuickTemplate, WhatsAppConfig } from '../types/chat';
import { Preferences } from '@capacitor/preferences';

// ═══════════════════════════════════════════════════════════
// 🔧 SISTEMA DE ALMACENAMIENTO HÍBRIDO v3 (FIX DEFINITIVO)
// - Import ESTÁTICO de @capacitor/preferences (no dinámico)
// - Funciones ASYNC para garantizar persistencia en APK
// - Fallback a localStorage en Web
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

// Detectar si estamos en APK (Capacitor nativo)
const isNativeAPK = typeof (window as any).Capacitor !== 'undefined' &&
                    (window as any).Capacitor?.isNative &&
                    (window as any).Capacitor?.Plugins?.Preferences !== undefined;

console.log('📱 Ambiente detectado:', isNativeAPK ? 'APK nativo' : 'Web');

// Cache en memoria para lecturas síncronas
const memoryCache: { [key: string]: string | null } = {};

// Flag de carga
let preferencesLoaded = false;

// Sistema de eventos para notificar cuando los datos estén cargados
type ConfigChangeListener = () => void;
const configChangeListeners: Set<ConfigChangeListener> = new Set();

export function onConfigLoaded(listener: ConfigChangeListener): () => void {
  configChangeListeners.add(listener);
  return () => configChangeListeners.delete(listener);
}

function notifyConfigLoaded() {
  configChangeListeners.forEach(listener => {
    try { listener(); } catch (e) { console.warn('Error in config listener:', e); }
  });
}

// Función async para guardar en Preferences (APK) o localStorage (Web)
async function persistItem(key: string, value: string): Promise<void> {
  // 1. Guardar en localStorage SIEMPRE (sync, inmediato)
  try {
    localStorage.setItem(key, value);
    memoryCache[key] = value;
  } catch (e) {
    console.warn(`Error guardando en localStorage ${key}:`, e);
  }

  // 2. En APK, también guardar en Capacitor Preferences (persistente)
  if (isNativeAPK) {
    try {
      await Preferences.set({ key, value });
    } catch (e) {
      console.warn(`Error guardando en Preferences ${key}:`, e);
    }
  }
}

// Función async para leer de Preferences (APK) o localStorage (Web)
async function readItem(key: string): Promise<string | null> {
  // En APK, leer de Preferences (persistente)
  if (isNativeAPK) {
    try {
      const result = await Preferences.get({ key });
      return result.value;
    } catch (e) {
      console.warn(`Error leyendo de Preferences ${key}:`, e);
    }
  }
  // Fallback a localStorage
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

// Precargar TODA la config desde Preferences al iniciar (solo en APK)
async function preloadAllFromPreferences(): Promise<void> {
  if (!isNativeAPK) {
    preferencesLoaded = true;
    return;
  }

  try {
    console.log('🔄 Precargando datos desde Capacitor Preferences...');
    for (const key of Object.values(KEYS)) {
      const value = await readItem(key);
      if (value !== null) {
        // Migrar a localStorage si no existe
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, value);
          console.log('📦 Migrado de Preferences a localStorage:', key);
        }
        memoryCache[key] = value;
      }
    }
    preferencesLoaded = true;
    console.log('✅ Precarga completada');
    notifyConfigLoaded();
  } catch (e) {
    console.warn('Error en precarga:', e);
    preferencesLoaded = true;
    notifyConfigLoaded();
  }
}

// Ejecutar precarga al iniciar
preloadAllFromPreferences();

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
  mockMode: false, // Por defecto: NO simular (si hay token, enviar de verdad)
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
        if (isNativeAPK) {
          Preferences.set({ key: KEYS.ACTIVE_CHAT, value: phone }).catch(() => {});
        }
      } else {
        localStorage.removeItem(KEYS.ACTIVE_CHAT);
        if (isNativeAPK) {
          Preferences.remove({ key: KEYS.ACTIVE_CHAT }).catch(() => {});
        }
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
      const jsonStr = JSON.stringify(drafts);
      localStorage.setItem(KEYS.DRAFTS, jsonStr);
      if (isNativeAPK) {
        Preferences.set({ key: KEYS.DRAFTS, value: jsonStr }).catch(() => {});
      }
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
      const jsonStr = JSON.stringify(templates);
      localStorage.setItem(KEYS.QUICK_TEMPLATES, jsonStr);
      if (isNativeAPK) {
        Preferences.set({ key: KEYS.QUICK_TEMPLATES, value: jsonStr }).catch(() => {});
      }
    } catch (e) {
      console.warn('LocalStorage error saving templates', e);
    }
  },

  // ═══════════════════════════════════════════════════════════
  // 🔑 WHATSAPP CONFIG - Versión ASYNC para garantizar persistencia
  // ═══════════════════════════════════════════════════════════
  getWhatsAppConfig(): WhatsAppConfig {
    try {
      const saved = localStorage.getItem(KEYS.WA_CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_WA_CONFIG, ...parsed };
      }
      return DEFAULT_WA_CONFIG;
    } catch (e) {
      console.warn('Failed reading WhatsApp config', e);
      return DEFAULT_WA_CONFIG;
    }
  },

  saveWhatsAppConfig(config: WhatsAppConfig): void {
    try {
      const jsonStr = JSON.stringify(config);
      console.log('💾 Guardando config:', {
        hasToken: !!config.accessToken,
        hasPhoneId: !!config.phoneNumberId,
        mockMode: config.mockMode
      });

      // Guardar en localStorage (sync, inmediato)
      localStorage.setItem(KEYS.WA_CONFIG, jsonStr);
      memoryCache[KEYS.WA_CONFIG] = jsonStr;

      // En APK, también guardar en Preferences (async, persistente)
      if (isNativeAPK) {
        Preferences.set({ key: KEYS.WA_CONFIG, value: jsonStr })
          .then(() => console.log('✅ Config guardada en Preferences (persistente)'))
          .catch(e => console.warn('Error guardando en Preferences:', e));
      }

      // Verificar que se guardó en localStorage
      const verify = localStorage.getItem(KEYS.WA_CONFIG);
      if (verify === jsonStr) {
        console.log('✅ Verificación OK: config guardada en localStorage');
      } else {
        console.error('❌ Verificación FALLÓ: la config no se guardó');
      }
    } catch (e) {
      console.error('❌ Error CRÍTICO guardando WhatsApp config:', e);
    }
  },

  // Offline Cache for Chats
  saveOfflineChats(chats: Chat[]): void {
    try {
      const jsonStr = JSON.stringify(chats);
      localStorage.setItem(KEYS.OFFLINE_CHATS, jsonStr);
      if (isNativeAPK) {
        Preferences.set({ key: KEYS.OFFLINE_CHATS, value: jsonStr }).catch(() => {});
      }
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
      const key = `${KEYS.OFFLINE_MESSAGES_PREFIX}${phone}`;
      const jsonStr = JSON.stringify(messages);
      localStorage.setItem(key, jsonStr);
      if (isNativeAPK) {
        Preferences.set({ key, value: jsonStr }).catch(() => {});
      }
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
