import { db } from './firestore';
import {
  collection,
  doc,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';

// ═══════════════════════════════════════════════════════════
// 📢 SERVICIO BROADCAST - Plantillas aprobadas Meta API
// ═══════════════════════════════════════════════════════════

export interface RutaCliente {
  id: string | number;
  nombre: string;
  cel: string;
  celular: string;
  telefono: string;
  prod?: string;
  cobrar?: number;
  dir?: string;
  dist?: string;
  st?: string;
}

export interface RutaActiva {
  clientes: RutaCliente[];
  ruta_activa?: {
    hora_inicio?: string;
    orden_optimo?: number[];
  };
  fecha?: string;
  total_clientes?: number;
}

/**
 * Suscribe a los cambios de ruta_activa en Firestore
 * Compatible con la estructura que usa RiderTrack Modular
 */
export function subscribeToRutaActiva(
  userId: string,
  onUpdate: (ruta: RutaActiva | null) => void,
  onError?: (err: Error) => void
): () => void {
  if (!db || !userId) {
    console.warn('Broadcast: Firebase no disponible o sin userId');
    onUpdate(null);
    return () => {};
  }

  try {
    const rutaRef = doc(db, 'ruta_activa', userId);
    return onSnapshot(
      rutaRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as RutaActiva;
          onUpdate(data);
        } else {
          onUpdate(null);
        }
      },
      (err) => {
        console.warn('Broadcast: error leyendo ruta_activa:', err);
        if (onError) onError(err);
        onUpdate(null);
      }
    );
  } catch (e) {
    console.warn('Broadcast: excepción:', e);
    onUpdate(null);
    return () => {};
  }
}

/**
 * Obtiene los clientes de la ruta activa con teléfono válido
 */
export function getClientesDeRuta(ruta: RutaActiva | null): RutaCliente[] {
  if (!ruta || !ruta.clientes) return [];
  return ruta.clientes.filter((c) => {
    const tel = c.cel || c.celular || c.telefono || '';
    const limpio = String(tel).replace(/\D/g, '');
    return limpio.length >= 9;
  });
}

/**
 * Normaliza un teléfono peruano a formato internacional (51XXXXXXXXX)
 */
export function normalizarTelefono(tel: string): string {
  let limpio = String(tel || '').replace(/\D/g, '');
  // Si empieza con 51 y tiene 11 dígitos, está bien
  if (limpio.startsWith('51') && limpio.length === 11) return limpio;
  // Si tiene 9 dígitos (número peruano), agregar 51
  if (limpio.length === 9 && limpio.startsWith('9')) return '51' + limpio;
  return limpio;
}

// ═══════════════════════════════════════════════════════════
// 📋 PLANTILLAS APROBADAS - Meta Cloud API
// ═══════════════════════════════════════════════════════════

export interface PlantillaMeta {
  name: string;
  language: string;
  label: string;
  descripcion: string;
  emoji: string;
  componentes?: any[];
}

// Plantillas aprobadas en tu cuenta de Meta
export const PLANTILLAS_APROBADAS: PlantillaMeta[] = [
  {
    name: 'inicio_ruta',
    language: 'es',
    label: 'Inicio de Ruta',
    descripcion: 'Avisa al cliente que su pedido va en camino',
    emoji: '🚀',
  },
  {
    name: 'solicitar_ubicacion',
    language: 'es',
    label: 'Solicitar Ubicación',
    descripcion: 'Pide al cliente su ubicación actual',
    emoji: '📍',
  },
];

/**
 * Envía una plantilla aprobada a un cliente mediante Meta Cloud API
 */
export async function enviarPlantillaMeta(
  config: { phoneNumberId: string; accessToken: string; mockMode?: boolean },
  telefono: string,
  plantilla: PlantillaMeta,
  componentes?: any[]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const telNormalizado = normalizarTelefono(telefono);

  // Modo simulación
  if (config.mockMode || !config.phoneNumberId || !config.accessToken) {
    console.log(`[Broadcast Mock] Enviando ${plantilla.name} a ${telNormalizado}`);
    await new Promise((r) => setTimeout(r, 500));
    return {
      success: true,
      messageId: `mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    };
  }

  // Llamada real a Meta Cloud API
  const url = `https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`;
  const body: any = {
    messaging_product: 'whatsapp',
    to: telNormalizado,
    type: 'template',
    template: {
      name: plantilla.name,
      language: { code: plantilla.language },
      components: componentes || [],
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (response.ok && data.messages?.[0]?.id) {
      return {
        success: true,
        messageId: data.messages[0].id,
      };
    }

    return {
      success: false,
      error: data.error?.message || `HTTP ${response.status}`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Error de conexión',
    };
  }
}

/**
 * Guarda el mensaje enviado en Firestore para que aparezca en el chat
 */
export async function guardarMensajeBroadcastEnFirestore(
  telefono: string,
  textoPlantilla: string,
  messageId: string,
  nombreCliente?: string
): Promise<void> {
  if (!db) return;

  const telLimpio = normalizarTelefono(telefono);

  try {
    // Guardar el mensaje en chats/{tel}/messages
    await fetch(
      `https://firestore.googleapis.com/v1/projects/ridertrack-93c8a/databases/(default)/documents/chats/${telLimpio}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            direction: { stringValue: 'sent' },
            text: { stringValue: textoPlantilla },
            status: { stringValue: 'sent' },
            senderId: { stringValue: 'broadcast' },
            metaMessageId: { stringValue: messageId },
            timestamp: { timestampValue: new Date().toISOString() },
          },
        }),
      }
    ).catch(() => {});

    // Usar Firebase Admin SDK (si está disponible en el navegador, lo cual no es el caso)
    // Por ahora, dejamos que el bot-meta maneje el guardado cuando el cliente responda
    console.log(`📡 Broadcast: mensaje enviado a ${telLimpio}`);
  } catch (e) {
    console.warn('Error guardando broadcast en Firestore:', e);
  }
}
