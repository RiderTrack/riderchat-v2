import { useState, useCallback } from 'react';
import { Message, MessageMedia, WhatsAppConfig } from '../types/chat';
import { sendWhatsAppMessage } from '../services/whatsapp';
import {
  sendMessageToFirestore,
  updateMessageStatus,
  simulateIncomingCustomerMessage,
} from '../services/firestore';
import { localCache } from '../services/local-cache';

export function useWhatsAppAPI() {
  const [config, setConfig] = useState<WhatsAppConfig>(() => localCache.getWhatsAppConfig());
  const [isSending, setIsSending] = useState<boolean>(false);

  // Update WhatsApp API configuration
  const saveConfig = useCallback((newConfig: WhatsAppConfig) => {
    setConfig(newConfig);
    localCache.saveWhatsAppConfig(newConfig);
  }, []);

  /**
   * Main function to send text or media messages to a WhatsApp client
   */
  const sendTextMessage = useCallback(
    async (clientPhone: string, text: string, replyToId?: string): Promise<boolean> => {
      if (!clientPhone || !text.trim()) return false;

      setIsSending(true);

      const timestamp = Date.now();
      const tempId = `sent_${timestamp}_${Math.random().toString(36).substring(2, 6)}`;

      // 1. Save pending message to Firestore & local state
      const newMsg: Omit<Message, 'id'> = {
        direction: 'sent',
        text: text.trim(),
        status: 'pending',
        timestamp,
        senderId: 'rider-meta',
        replyToId,
      };

      await sendMessageToFirestore(clientPhone, newMsg);

      // 2. Dispatch via Meta Cloud API
      const res = await sendWhatsAppMessage(config, {
        toPhone: clientPhone,
        type: 'text',
        text: text.trim(),
      });

      if (res.success) {
        // Update to sent
        await updateMessageStatus(clientPhone, tempId, 'sent');

        // Simulate delivery ticks sequence in mock mode for Rudy
        if (config.mockMode || !config.phoneNumberId) {
          setTimeout(() => {
            updateMessageStatus(clientPhone, tempId, 'delivered');
          }, 1500);

          setTimeout(() => {
            updateMessageStatus(clientPhone, tempId, 'read');
          }, 3500);

          // Simulated customer automatic response in demo mode
          if (text.toLowerCase().includes('llegue') || text.toLowerCase().includes('puerta') || text.toLowerCase().includes('camino')) {
            setTimeout(() => {
              simulateIncomingCustomerMessage(
                clientPhone,
                '¡Genial! Gracias por avisar. Ya estoy bajando a recibir el pedido. 👍'
              );
            }, 6000);
          }
        }
        setIsSending(false);
        return true;
      } else {
        // Mark as failed with error
        await updateMessageStatus(clientPhone, tempId, 'failed', res.error || 'Falló el envío de WhatsApp');
        setIsSending(false);
        return false;
      }
    },
    [config]
  );

  /**
   * Sends media attachment (image, audio voice note, document, location)
   */
  const sendMediaMessage = useCallback(
    async (
      clientPhone: string,
      media: MessageMedia,
      caption?: string
    ): Promise<boolean> => {
      if (!clientPhone) return false;

      setIsSending(true);
      const timestamp = Date.now();
      const tempId = `sent_media_${timestamp}`;

      let mediaText = caption || '';
      if (!mediaText) {
        if (media.type === 'image') mediaText = '📷 Imagen';
        else if (media.type === 'audio') mediaText = '🎵 Nota de voz';
        else if (media.type === 'document') mediaText = `📄 ${media.fileName || 'Archivo PDF'}`;
        else if (media.type === 'location') mediaText = `📍 Ubicación: ${media.locationName || 'GPS'}`;
      }

      await sendMessageToFirestore(clientPhone, {
        direction: 'sent',
        text: mediaText,
        media,
        status: 'pending',
        timestamp,
        senderId: 'rider-meta',
      });

      const res = await sendWhatsAppMessage(config, {
        toPhone: clientPhone,
        type: media.type === 'location' ? 'text' : (media.type as any),
        mediaUrl: media.url,
        caption: media.caption || caption,
        filename: media.fileName,
        text: media.type === 'location' ? `📍 Ubicación GPS: https://maps.google.com/?q=${media.latitude},${media.longitude}` : undefined,
      });

      if (res.success) {
        await updateMessageStatus(clientPhone, tempId, 'sent');
        setTimeout(() => updateMessageStatus(clientPhone, tempId, 'delivered'), 1200);
        setTimeout(() => updateMessageStatus(clientPhone, tempId, 'read'), 3000);
        setIsSending(false);
        return true;
      } else {
        await updateMessageStatus(clientPhone, tempId, 'failed', res.error);
        setIsSending(false);
        return false;
      }
    },
    [config]
  );

  /**
   * Retry sending a failed message
   */
  const retryFailedMessage = useCallback(
    async (clientPhone: string, msg: Message): Promise<boolean> => {
      await updateMessageStatus(clientPhone, msg.id, 'pending');

      const res = await sendWhatsAppMessage(config, {
        toPhone: clientPhone,
        type: msg.media ? (msg.media.type as any) : 'text',
        text: msg.text,
        mediaUrl: msg.media?.url,
      });

      if (res.success) {
        await updateMessageStatus(clientPhone, msg.id, 'sent');
        setTimeout(() => updateMessageStatus(clientPhone, msg.id, 'delivered'), 1000);
        setTimeout(() => updateMessageStatus(clientPhone, msg.id, 'read'), 2500);
        return true;
      } else {
        await updateMessageStatus(clientPhone, msg.id, 'failed', res.error);
        return false;
      }
    },
    [config]
  );

  return {
    config,
    saveConfig,
    isSending,
    sendTextMessage,
    sendMediaMessage,
    retryFailedMessage,
  };
}
