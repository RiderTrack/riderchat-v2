import { WhatsAppConfig } from '../types/chat';
import { CapacitorHttp } from '@capacitor/core';

// Detectar si estamos en APK (Capacitor nativo)
const isNativeAPK = typeof (window as any).Capacitor !== 'undefined' &&
                    (window as any).Capacitor?.isNative;

export interface SendMessagePayload {
  toPhone: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'template';
  text?: string;
  mediaUrl?: string;
  caption?: string;
  filename?: string;
  templateName?: string;
  templateLanguage?: string;
  templateComponents?: any[];
}

export interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  status: 'sent' | 'delivered' | 'failed';
}

/**
 * Sends WhatsApp message via Meta Cloud API or server proxy endpoint with retry logic.
 */
export async function sendWhatsAppMessage(
  config: WhatsAppConfig,
  payload: SendMessagePayload,
  retries = 2
): Promise<SendMessageResponse> {
  // If mock mode is enabled or credentials missing, simulate Meta Cloud API network call
  if (config.mockMode || !config.phoneNumberId || !config.accessToken) {
    console.log('[WhatsApp API - Mock Mode] Sending payload:', payload);
    await new Promise((res) => setTimeout(res, 800 + Math.random() * 600));

    // Simulated response ID from Meta
    const mockMessageId = `wamid.HBgM${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    // 95% simulated success rate
    if (Math.random() > 0.05) {
      return {
        success: true,
        messageId: mockMessageId,
        status: 'sent',
      };
    } else {
      return {
        success: false,
        error: 'Simulated Meta API Network Error: Phone number temporarily unreachable',
        status: 'failed',
      };
    }
  }

  // Real Meta Cloud API call
  const url = `https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`;

  let requestBody: any = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: payload.toPhone,
  };

  if (payload.type === 'text') {
    requestBody.type = 'text';
    requestBody.text = { preview_url: true, body: payload.text || '' };
  } else if (payload.type === 'image') {
    requestBody.type = 'image';
    requestBody.image = { link: payload.mediaUrl, caption: payload.caption || '' };
  } else if (payload.type === 'document') {
    requestBody.type = 'document';
    requestBody.document = {
      link: payload.mediaUrl,
      caption: payload.caption || '',
      filename: payload.filename || 'document.pdf',
    };
  } else if (payload.type === 'audio') {
    requestBody.type = 'audio';
    requestBody.audio = { link: payload.mediaUrl };
  } else if (payload.type === 'template') {
    requestBody.type = 'template';
    requestBody.template = {
      name: payload.templateName || 'hello_world',
      language: { code: payload.templateLanguage || 'es' },
      components: payload.templateComponents || [],
    };
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      let response: any;
      let data: any;

      if (isNativeAPK) {
        // 🚀 En APK: usar CapacitorHttp (native, sin CORS)
        console.log('📡 Enviando vía CapacitorHttp (APK nativo)...');
        response = await CapacitorHttp.post({
          url: url,
          headers: {
            'Authorization': `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json',
          },
          data: requestBody,
        });
        data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

        if (response.status >= 200 && response.status < 300 && data.messages?.[0]?.id) {
          return {
            success: true,
            messageId: data.messages[0].id,
            status: 'sent',
          };
        }
      } else {
        // 🌐 En Web: usar fetch normal
        const fetchResponse = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        data = await fetchResponse.json();

        if (fetchResponse.ok && data.messages?.[0]?.id) {
          return {
            success: true,
            messageId: data.messages[0].id,
            status: 'sent',
          };
        }
      }

      const errMsg = data.error?.message || `Meta API HTTP ${response.status || 'unknown'}`;
      console.warn(`WhatsApp Meta API attempt ${attempt + 1} failed: ${errMsg}`);

      if (attempt === retries) {
        return {
          success: false,
          error: errMsg,
          status: 'failed',
        };
      }
    } catch (err: any) {
      console.error(`WhatsApp Network error attempt ${attempt + 1}:`, err);
      if (attempt === retries) {
        return {
          success: false,
          error: err?.message || 'Error de conexión de red con Meta Cloud API',
          status: 'failed',
        };
      }
    }

    // Exponential backoff
    await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
  }

  return {
    success: false,
    error: 'Exceeded maximum retry attempts',
    status: 'failed',
  };
}
