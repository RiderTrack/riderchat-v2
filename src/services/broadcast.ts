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
// Nombres EXACTOS como están en Meta Developers
// Idioma: es_PE (Español Perú)
// ═══════════════════════════════════════════════════════════

export interface PlantillaMeta {
  name: string;
  language: string; // es_PE para español Perú
  label: string;
  descripcion: string;
  emoji: string;
  componentes?: any[];
}

// Plantillas aprobadas en tu cuenta de Meta (nombres exactos)
// IMPORTANTE: El idioma es es_PE (Español Perú), no es
export const PLANTILLAS_APROBADAS: PlantillaMeta[] = [
  {
    name: 'inicio_ruta',
    language: 'es_PE',
    label: 'Inicio de Ruta',
    descripcion: 'Avisa al cliente que su pedido va en camino',
    emoji: '🚀',
  },
  {
    name: 'solicitar_ubicacion',
    language: 'es_PE',
    label: 'Solicitar Ubicación',
    descripcion: 'Pide al cliente su ubicación actual',
    emoji: '📍',
  },
  {
    name: 'qr_metodo_de_pago',
    language: 'es_PE',
    label: 'QR Método de Pago',
    descripcion: 'Envía el QR de Yape con el monto a pagar',
    emoji: '💳',
  },
  {
    name: 'eta_actualizada',
    language: 'es_PE',
    label: 'ETA Actualizada',
    descripcion: 'Avisa en cuántos minutos llegás',
    emoji: '⏱️',
  },
  {
    name: 'entrega_completada',
    language: 'es_PE',
    label: 'Entrega Completada',
    descripcion: 'Confirma que el pedido fue entregado',
    emoji: '✅',
  },
];

/**
 * Construye los parámetros para cada plantilla según sus variables EXACTAS
 * Basado en las plantillas aprobadas en Meta (variables confirmadas por Rudy)
 *
 * VARIABLES POR PLANTILLA (según Meta Developers):
 *
 * inicio_ruta (8 variables):
 *   {{customer_name}}, {{order_product}}, {{order_amount}},
 *   {{address_street}}, {{address_district}}, {{start_time}},
 *   {{total_deliveries}}, {{delivery_number}}
 *
 * solicitar_ubicacion (4 variables):
 *   {{customer_name}}, {{order_product}}, {{order_amount}}, {{address_district}}
 *
 * qr_metodo_de_pago (5 variables):
 *   {{customer_name}}, {{yape_number}}, {{yape_owner_name}},
 *   {{order_product}}, {{order_amount}}
 *
 * eta_actualizada (4 variables):
 *   {{customer_name}}, {{eta_minutes}}, {{order_product}}, {{order_amount}}
 *
 * entrega_completada (3 variables):
 *   {{customer_name}}, {{order_product}}, {{order_amount}}
 */
function construirParametros(nombrePlantilla: string, cliente: RutaCliente): string[] {
  const customer_name = cliente.nombre || 'Cliente';
  const order_product = cliente.prod || 'Producto';
  const order_amount = cliente.cobrar ? cliente.cobrar.toFixed(2) : '0.00';
  const address_district = cliente.dist || 'Distrito';
  const address_street = cliente.dir || 'Dirección';
  const yape_number = '980811297';
  const yape_owner_name = 'Lorenzo N. Tarazona T.';
  const eta_minutes = '15';
  const start_time = '09:00';
  const total_deliveries = '0';
  const delivery_number = '0';

  switch (nombrePlantilla) {
    case 'inicio_ruta':
      // Hola, {{customer_name}}! 👋
      // 📦 Pedido: {{order_product}}
      // 💰 Monto: S/ {{order_amount}}
      // 📍 Dirección: {{address_street}}, {{address_district}}
      // Mi ruta empieza a partir de las {{start_time}} ⏱️
      // 🗺️ Mi ruta de hoy — {{total_deliveries}} entregas
      // ⏱️ Eres la entrega #{{delivery_number}}.
      return [
        customer_name,      // {{1}}
        order_product,      // {{2}}
        order_amount,       // {{3}}
        address_street,     // {{4}}
        address_district,   // {{5}}
        start_time,         // {{6}}
        total_deliveries,   // {{7}}
        delivery_number,    // {{8}}
      ];

    case 'solicitar_ubicacion':
      // Hola {{customer_name}} 👋
      // Te escribo para confirmar tu pedido {{order_product}} por S/ {{order_amount}}
      // a entregar en {{address_district}}.
      return [
        customer_name,      // {{1}}
        order_product,      // {{2}}
        order_amount,       // {{3}}
        address_district,   // {{4}}
      ];

    case 'qr_metodo_de_pago':
      // Buenas, {{customer_name}} 👋
      // El número de SOLO YAPE es: {{yape_number}}
      // A nombre de: {{yape_owner_name}}
      // 📦 Producto: {{order_product}}
      // 💰 Monto a pagar: S/ {{order_amount}}
      return [
        customer_name,      // {{1}}
        yape_number,        // {{2}}
        yape_owner_name,    // {{3}}
        order_product,      // {{4}}
        order_amount,       // {{5}}
      ];

    case 'eta_actualizada':
      // Hola, {{customer_name}} 👋
      // Le informo que estaré llegando aproximadamente en {{eta_minutes}} minutos ⏱️
      // 📦 Pedido: {{order_product}}
      // 💰 Monto a pagar: S/ {{order_amount}}
      return [
        customer_name,      // {{1}}
        eta_minutes,        // {{2}}
        order_product,      // {{3}}
        order_amount,       // {{4}}
      ];

    case 'entrega_completada':
      // ✅ ¡{{customer_name}}, tu pedido fue entregado!
      // 📦 {{order_product}}
      // 💰 Monto cobrado: S/ {{order_amount}}
      return [
        customer_name,      // {{1}}
        order_product,      // {{2}}
        order_amount,       // {{3}}
      ];

    default:
      return [];
  }
}

/**
 * Envía una plantilla aprobada a un cliente mediante Meta Cloud API
 * Ahora con soporte para variables (parámetros) del cliente
 */
export async function enviarPlantillaMeta(
  config: { phoneNumberId: string; accessToken: string; mockMode?: boolean },
  telefono: string,
  plantilla: PlantillaMeta,
  cliente?: RutaCliente
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

  // 🎯 Construir componentes con los parámetros del cliente
  let componentes: any[] = [];

  if (cliente) {
    const params = construirParametros(plantilla.name, cliente);
    if (params.length > 0) {
      componentes = [{
        type: 'body',
        parameters: params.map(p => ({ type: 'text', text: p }))
      }];
    }
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
      components: componentes,
    },
  };

  console.log('📡 Enviando plantilla:', {
    name: plantilla.name,
    language: plantilla.language,
    to: telNormalizado,
    componentes: componentes
  });

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
