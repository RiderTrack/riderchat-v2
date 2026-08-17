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
  if (limpio.startsWith('51') && limpio.length === 11) return limpio;
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
  language: string;
  label: string;
  descripcion: string;
  emoji: string;
  componentes?: any[];
}

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

// Plantillas que se muestran en el Broadcast masivo (solo 2)
// Las demás se usan como botones rápidos en cada chat individual
export const PLANTILLAS_BROADCAST: PlantillaMeta[] = PLANTILLAS_APROBADAS.filter(
  p => p.name === 'inicio_ruta' || p.name === 'solicitar_ubicacion'
);

// Plantillas para botones rápidos en cada chat (excluyendo las de broadcast)
export const PLANTILLAS_BOTONES_RAPIDOS: PlantillaMeta[] = PLANTILLAS_APROBADAS.filter(
  p => p.name !== 'inicio_ruta' && p.name !== 'solicitar_ubicacion'
);

// ═══════════════════════════════════════════════════════════
// 🖼️ CONFIGURACIÓN DE HEADERS DE PLANTILLAS
// Algunas plantillas tienen header de IMAGEN que debemos enviar
// ═══════════════════════════════════════════════════════════

// URL pública del logo MATE en Firebase Storage
const MATE_LOGO_URL = 'https://firebasestorage.googleapis.com/v0/b/ridertrack-93c8a.firebasestorage.app/o/logos%2Fmate_logo.png?alt=media';

// Plantillas que tienen header de imagen
const PLANTILLAS_CON_HEADER_IMAGEN: { [key: string]: string } = {
  'inicio_ruta': MATE_LOGO_URL,
  'solicitar_ubicacion': MATE_LOGO_URL,
  'qr_metodo_de_pago': MATE_LOGO_URL,
  // eta_actualizada tiene header de TEXTO, no imagen
  // entrega_completada: confirmar si tiene header
};

/**
 * Construye los parámetros para cada plantilla usando variables CON NOMBRE
 * Meta Cloud API soporta variables con nombre ({{customer_name}})
 * cuando se envían como objects en lugar de strings
 */
function construirParametros(
  nombrePlantilla: string,
  cliente: RutaCliente,
  deliveryNumber?: number,
  totalDeliveries?: number
): { name: string; value: string }[] {
  const customer_name = cliente.nombre || 'Cliente';
  const order_product = cliente.prod || 'Producto';
  const order_amount = cliente.cobrar ? cliente.cobrar.toFixed(2) : '0.00';
  const address_district = cliente.dist || 'Distrito';
  const address_street = cliente.dir || 'Dirección';
  const yape_number = '980811297';
  const yape_owner_name = 'Lorenzo N. Tarazona T.';
  const eta_minutes = '15';
  const start_time = '09:00';
  const total_deliveries = String(totalDeliveries || 0);
  const delivery_number = String(deliveryNumber || 0);

  switch (nombrePlantilla) {
    case 'inicio_ruta':
      // 8 variables: customer_name, order_product, order_amount,
      // address_street, address_district, start_time, total_deliveries, delivery_number
      return [
        { name: 'customer_name', value: customer_name },
        { name: 'order_product', value: order_product },
        { name: 'order_amount', value: order_amount },
        { name: 'address_street', value: address_street },
        { name: 'address_district', value: address_district },
        { name: 'start_time', value: start_time },
        { name: 'total_deliveries', value: total_deliveries },
        { name: 'delivery_number', value: delivery_number },
      ];

    case 'solicitar_ubicacion':
      // 4 variables: customer_name, order_product, order_amount, address_district
      return [
        { name: 'customer_name', value: customer_name },
        { name: 'order_product', value: order_product },
        { name: 'order_amount', value: order_amount },
        { name: 'address_district', value: address_district },
      ];

    case 'qr_metodo_de_pago':
      // 5 variables: customer_name, yape_number, yape_owner_name, order_product, order_amount
      return [
        { name: 'customer_name', value: customer_name },
        { name: 'yape_number', value: yape_number },
        { name: 'yape_owner_name', value: yape_owner_name },
        { name: 'order_product', value: order_product },
        { name: 'order_amount', value: order_amount },
      ];

    case 'eta_actualizada':
      // 4 variables: customer_name, eta_minutes, order_product, order_amount
      return [
        { name: 'customer_name', value: customer_name },
        { name: 'eta_minutes', value: eta_minutes },
        { name: 'order_product', value: order_product },
        { name: 'order_amount', value: order_amount },
      ];

    case 'entrega_completada':
      // 3 variables: customer_name, order_product, order_amount
      return [
        { name: 'customer_name', value: customer_name },
        { name: 'order_product', value: order_product },
        { name: 'order_amount', value: order_amount },
      ];

    default:
      return [];
  }
}

/**
 * Envía una plantilla aprobada a un cliente mediante Meta Cloud API
 *
 * ESTRATEGIA: Intentar primero CON parámetros, si falla con 132000 intentar SIN parámetros
 */
export async function enviarPlantillaMeta(
  config: { phoneNumberId: string; accessToken: string; mockMode?: boolean },
  telefono: string,
  plantilla: PlantillaMeta,
  cliente?: RutaCliente,
  deliveryNumber?: number,
  totalDeliveries?: number
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

  // 🎯 Construir parámetros del cliente SIEMPRE
  // Aunque no tengamos datos del cliente, enviamos valores por defecto
  console.log('👤 Cliente recibido en enviarPlantillaMeta:', cliente ? {
    nombre: cliente.nombre,
    prod: cliente.prod,
    cobrar: cliente.cobrar,
    dir: cliente.dir,
    dist: cliente.dist
  } : 'NO HAY CLIENTE');

  const clienteData = cliente || {
    id: 0,
    nombre: 'Cliente',
    cel: telefono,
    celular: telefono,
    telefono: telefono,
    prod: 'Producto',
    cobrar: 0,
    dir: 'Dirección',
    dist: 'Distrito',
    st: 'pendiente'
  };

  const params = construirParametros(plantilla.name, clienteData, deliveryNumber, totalDeliveries);
  let componentes: any[] = [];

  // 🖼️ Agregar header de imagen si la plantilla lo requiere
  const headerImageUrl = PLANTILLAS_CON_HEADER_IMAGEN[plantilla.name];
  if (headerImageUrl) {
    componentes.push({
      type: 'header',
      parameters: [{
        type: 'image',
        image: {
          link: headerImageUrl
        }
      }]
    });
  }

  // 📝 Agregar body con los parámetros del cliente
  if (params.length > 0) {
    componentes.push({
      type: 'body',
      parameters: params.map(p => ({
        type: 'text',
        text: p.value,
        parameter_name: p.name  // ← OBLIGATORIO: Meta lo requiere
      }))
    });
  }

  console.log('📦 Componentes a enviar:', JSON.stringify(componentes, null, 2));

  const url = `https://graph.facebook.com/v22.0/${config.phoneNumberId}/messages`;

  const enviarRequest = async (comps: any[]) => {
    const body: any = {
      messaging_product: 'whatsapp',
      to: telNormalizado,
      type: 'template',
      template: {
        name: plantilla.name,
        language: { code: plantilla.language },
        components: comps,
      },
    };

    console.log('📡 Enviando plantilla:', {
      name: plantilla.name,
      language: plantilla.language,
      to: telNormalizado,
      componentes: comps
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    return { response, data: await response.json() };
  };

  try {
    // Enviar CON parámetros del cliente
    if (componentes.length > 0) {
      console.log('🔄 Enviando con parámetros:', JSON.stringify(componentes, null, 2));
      const { response, data } = await enviarRequest(componentes);

      console.log('📡 Respuesta Meta:', {
        status: response.status,
        ok: response.ok,
        data: data
      });

      if (response.ok && data.messages?.[0]?.id) {
        return { success: true, messageId: data.messages[0].id };
      }

      // 🎯 Mostrar el error COMPLETO de Meta en la UI
      const errorMsg = data.error?.message || '';
      const errorCode = data.error?.code || '';
      const errorSubcode = data.error?.error_subcode || '';
      const errorDetails = data.error?.error_data?.details || '';

      const fullError = `[${errorCode}] ${errorMsg}${errorSubcode ? ' (sub:' + errorSubcode + ')' : ''}${errorDetails ? ' | ' + errorDetails : ''}`;

      console.log('❌ Error completo de Meta:', JSON.stringify(data.error, null, 2));

      return { success: false, error: fullError };
    }

    // Si no hay parámetros (plantilla sin variables), enviar sin componentes
    console.log('🔄 Enviando sin parámetros (plantilla sin variables)');
    const { response: resp2, data: data2 } = await enviarRequest([]);

    if (resp2.ok && data2.messages?.[0]?.id) {
      return { success: true, messageId: data2.messages[0].id };
    }

    const errorMsg2 = data2.error?.message || '';
    const errorCode2 = data2.error?.code || '';
    const errorDetails2 = data2.error?.error_data?.details || '';
    const fullError2 = `[${errorCode2}] ${errorMsg2}${errorDetails2 ? ' | ' + errorDetails2 : ''}`;

    return {
      success: false,
      error: fullError2 || `HTTP ${resp2.status}`,
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

    console.log(`📡 Broadcast: mensaje enviado a ${telLimpio}`);
  } catch (e) {
    console.warn('Error guardando broadcast en Firestore:', e);
  }
}
