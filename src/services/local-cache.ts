import { Chat, Message, QuickTemplate, WhatsAppConfig } from '../types/chat';

// ═══════════════════════════════════════════════════════════
// 🔧 SISTEMA DE ALMACENAMIENTO HÍBRIDO v2 (FIX DEFINITIVO)
// - En APK (Capacitor): usa @capacitor/preferences (nativo, persistente)
// - En Web (navegador): usa localStorage (funciona normal)
// - SIEMPRE guarda en localStorage como backup inmediato
// - En APK, también guarda en Capacitor Preferences (persistente)
// - Al iniciar la app en APK, migra de Preferences a localStorage
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

// Detectar si estamos en APK (Capacitor disponible)
const isNativeAPK = typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor?.isNative;

// Plugin de Capacitor Preferences (cargado async)
let PreferencesPlugin: any = null;
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

// Cargar Capacitor Preferences (solo en APK)
if (isNativeAPK) {
  console.log('📱 APK detectado - cargando Capacitor Preferences...');
  import('@capacitor/preferences')
    .then(mod => {
      PreferencesPlugin = mod.Preferences;
      preferencesLoaded = true;
      console.log('✅ Capacitor Preferences cargado');
      // Migrar datos de Preferences a localStorage
      migrateFromPreferences();
    })
    .catch(e => {
      console.warn('⚠️ No se pudo cargar Capacitor Preferences:', e);
      preferencesLoaded = true; // Marcar como cargado para no quedarse colgado
    });
} else {
  preferencesLoaded = true;
}

// Migrar datos de Capacitor Preferences a localStorage al iniciar
async function migrateFromPreferences(): Promise<void> {
  if (!PreferencesPlugin) return;
  try {
    for (const key of Object.values(KEYS)) {
      const result = await PreferencesPlugin.get({ key });
      if (result.value && !localStorage.getItem(key)) {
        // Solo migrar si localStorage no tiene el valor (prioridad: localStorage)
        localStorage.setItem(key, result.value);
        console.log('📦 Migrado de Preferences a localStorage:', key);
      }
    }
    console.log('✅ Migración completada');
    // Notificar a los hooks que la config está disponible
    notifyConfigLoaded();
  } catch (e) {
    console.warn('Error migrando datos:', e);
    notifyConfigLoaded(); // Notificar igual para no quedarse colgado
  }
}

// Función helper para guardar en AMBOS storage (sync localStorage + async Preferences)
async function persistItem(key: string, value: string): Promise<void> {
  // 1. Guardar en localStorage SIEMPRE (sync, inmediato)
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`Error guardando en localStorage ${key}:`, e);
  }

  // 2. En APK, también guardar en Capacitor Preferences (async, persistente)
  if (isNativeAPK && PreferencesPlugin) {
    try {
      await PreferencesPlugin.set({ key, value });
    } catch (e) {
      console.warn(`Error guardando en Preferences ${key}:`, e);
    }
  }
}

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
        if (isNativeAPK && PreferencesPlugin) {
          PreferencesPlugin.set({ key: KEYS.ACTIVE_CHAT, value: phone }).catch(() => {});
        }
      } else {
        localStorage.removeItem(KEYS.ACTIVE_CHAT);
        if (isNativeAPK && PreferencesPlugin) {
          PreferencesPlugin.remove({ key: KEYS.ACTIVE_CHAT }).catch(() => {});
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
      if (isNativeAPK && PreferencesPlugin) {
        PreferencesPlugin.set({ key: KEYS.DRAFTS, value: jsonStr }).catch(() => {});
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
      if (isNativeAPK && PreferencesPlugin) {
        PreferencesPlugin.set({ key: KEYS.QUICK_TEMPLATES, value: jsonStr }).catch(() => {});
      }
    } catch (e) {
      console.warn('LocalStorage error saving templates', e);
    }
  },

  // ═══════════════════════════════════════════════════════════
  // 🔑 WHATSAPP CONFIG - La parte más importante
  // ═══════════════════════════════════════════════════════════
  getWhatsAppConfig(): WhatsAppConfig {
    try {
      // Leer de localStorage (SIEMPRE disponible, sync)
      const saved = localStorage.getItem(KEYS.WA_CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('📖 Config leída de localStorage:', {
          hasToken: !!(parsed.accessToken),
          hasPhoneId: !!(parsed.phoneNumberId),
          mockMode: parsed.mockMode
        });
        return { ...DEFAULT_WA_CONFIG, ...parsed };
      }
      // Si no hay en localStorage, devolver default
      console.log('📖 No hay config guardada, usando default');
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
        mockMode: config.mockMode,
        jsonLength: jsonStr.length
      });

      // 1. Guardar en localStorage SIEMPRE (sync, inmediato)
      localStorage.setItem(KEYS.WA_CONFIG, jsonStr);

      // 2. En APK, también guardar en Capacitor Preferences (async, persistente)
      if (isNativeAPK && PreferencesPlugin) {
        PreferencesPlugin.set({ key: KEYS.WA_CONFIG, value: jsonStr })
          .then(() => console.log('✅ Config guardada en Preferences (persistente)'))
          .catch(e => console.warn('Error guardando en Preferences:', e));
      } else if (isNativeAPK) {
        console.warn('⚠️ PreferencesPlugin no disponible todavía, solo se guardó en localStorage');
      }

      // 3. Verificar que se guardó correctamente
      const verify = localStorage.getItem(KEYS.WA_CONFIG);
      if (verify === jsonStr) {
        console.log('✅ Verificación OK: config guardada correctamente en localStorage');
      } else {
        console.error('❌ Verificación FALLÓ: la config no se guardó en localStorage');
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
      if (isNativeAPK && PreferencesPlugin) {
        PreferencesPlugin.set({ key: KEYS.OFFLINE_CHATS, value: jsonStr }).catch(() => {});
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
      if (isNativeAPK && PreferencesPlugin) {
        PreferencesPlugin.set({ key, value: jsonStr }).catch(() => {});
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
