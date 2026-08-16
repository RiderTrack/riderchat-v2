import { useState, useCallback, useEffect } from 'react';
import { Message, MessageMedia, WhatsAppConfig } from '../types/chat';
import { sendWhatsAppMessage } from '../services/whatsapp';
import {
  sendMessageToFirestore,
  updateMessageStatus,
  simulateIncomingCustomerMessage,
  updateMessageMetaId,
} from '../services/firestore';
import { localCache, waitForLoad } from '../services/local-cache';

export function useWhatsAppAPI() {
  const [config, setConfig] = useState<WhatsAppConfig>(() => localCache.getWhatsAppConfig());
  const [isSending, setIsSending] = useState<boolean>(false);

  // 🔄 Recargar config cuando memoryCache esté listo (APK)
  useEffect(() => {
    waitForLoad().then(() => {
      const stored = localCache.getWhatsAppConfig();
      setConfig(stored);
    });
  }, []);

  const saveConfig = useCallback(async (newConfig: WhatsAppConfig) => {
    setConfig(newConfig);
    await localCache.saveWhatsAppConfig(newConfig);
  }, []);

  const sendTextMessage = useCallback(
    async (clientPhone: string, text: string, replyToId?: string): Promise<boolean> => {
      if (!clientPhone || !text.trim()) return false;

      setIsSending(true);

      const timestamp = Date.now();

      const newMsg: Omit<Message, 'id'> = {
        direction: 'sent',
        text: text.trim(),
        status: 'pending',
        timestamp,
        senderId: 'rider-meta',
        replyToId,
      };

      const firestoreMsgId = await sendMessageToFirestore(clientPhone, newMsg);

      const res = await sendWhatsAppMessage(config, {
        toPhone: clientPhone,
        type: 'text',
        text: text.trim(),
      });

      if (res.success) {
        await updateMessageStatus(clientPhone, firestoreMsgId, 'sent');
        await updateMessageMetaId(clientPhone, firestoreMsgId, res.messageId || '');

        if (config.mockMode || !config.phoneNumberId) {
          setTimeout(() => {
            updateMessageStatus(clientPhone, firestoreMsgId, 'delivered');
          }, 1500);

          setTimeout(() => {
            updateMessageStatus(clientPhone, firestoreMsgId, 'read');
          }, 3500);

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
        await updateMessageStatus(clientPhone, firestoreMsgId, 'failed', res.error || 'Falló el envío de WhatsApp');
        setIsSending(false);
        return false;
      }
    },
    [config]
  );

  const sendMediaMessage = useCallback(
    async (
      clientPhone: string,
      media: MessageMedia,
      caption?: string
    ): Promise<boolean> => {
      if (!clientPhone) return false;

      setIsSending(true);
      const timestamp = Date.now();

      let mediaText = caption || '';
      if (!mediaText) {
        if (media.type === 'image') mediaText = '📷 Imagen';
        else if (media.type === 'audio') mediaText = '🎵 Nota de voz';
        else if (media.type === 'document') mediaText = `📄 ${media.fileName || 'Archivo PDF'}`;
        else if (media.type === 'location') mediaText = `📍 Ubicación: ${media.locationName || 'GPS'}`;
      }

      const firestoreMsgId = await sendMessageToFirestore(clientPhone, {
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
        await updateMessageStatus(clientPhone, firestoreMsgId, 'sent');
        await updateMessageMetaId(clientPhone, firestoreMsgId, res.messageId || '');
        setTimeout(() => updateMessageStatus(clientPhone, firestoreMsgId, 'delivered'), 1200);
        setTimeout(() => updateMessageStatus(clientPhone, firestoreMsgId, 'read'), 3000);
        setIsSending(false);
        return true;
      } else {
        await updateMessageStatus(clientPhone, firestoreMsgId, 'failed', res.error);
        setIsSending(false);
        return false;
      }
    },
    [config]
  );

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
        await updateMessageMetaId(clientPhone, msg.id, res.messageId || '');
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
