import { useState, useEffect, useCallback } from 'react';
import { Message } from '../types/chat';
import {
  subscribeToMessages,
  sendMessageToFirestore,
  updateMessageStatus,
} from '../services/firestore';
import { localCache, waitForLoad } from '../services/local-cache';

export function useMessages(clientPhone: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [draft, setDraft] = useState<string>('');

  // Load draft text whenever active chat changes
  useEffect(() => {
    if (clientPhone) {
      // Cargar inmediatamente
      setDraft(localCache.getDraft(clientPhone));

      // Recargar cuando memoryCache esté listo (APK)
      waitForLoad().then(() => {
        setDraft(localCache.getDraft(clientPhone));
      });
    } else {
      setDraft('');
    }
  }, [clientPhone]);

  // Handle draft update and auto-save
  const updateDraft = useCallback(
    (text: string) => {
      setDraft(text);
      if (clientPhone) {
        // Guardar async sin bloquear UI
        localCache.saveDraft(clientPhone, text).catch(e =>
          console.warn('Error saving draft:', e)
        );
      }
    },
    [clientPhone]
  );

  // Subscribe to real-time messages for active chat
  useEffect(() => {
    if (!clientPhone) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeToMessages(
      clientPhone,
      (updatedMessages) => {
        setMessages(updatedMessages);
        setIsLoading(false);
      },
      (err) => {
        console.warn('useMessages real-time error:', err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [clientPhone]);

  // Optimistic local add message
  const appendMessage = useCallback(
    async (msg: Omit<Message, 'id'>): Promise<string> => {
      if (!clientPhone) throw new Error('No active client selected');
      const msgId = await sendMessageToFirestore(clientPhone, msg);
      return msgId;
    },
    [clientPhone]
  );

  // Mark message status
  const setStatus = useCallback(
    async (messageId: string, status: Message['status'], errorMessage?: string) => {
      if (!clientPhone) return;
      await updateMessageStatus(clientPhone, messageId, status, errorMessage);
    },
    [clientPhone]
  );

  return {
    messages,
    isLoading,
    draft,
    updateDraft,
    appendMessage,
    setStatus,
  };
}
