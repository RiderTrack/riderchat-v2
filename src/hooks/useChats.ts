import { useState, useEffect, useMemo, useCallback } from 'react';
import { Chat, ChatFilterOptions, ChatStatus } from '../types/chat';
import {
  subscribeToChats,
  createOrUpdateChat,
  markChatAsRead,
} from '../services/firestore';
import { localCache } from '../services/local-cache';
import { sanitizePhone } from '../utils/validators';

export function useChats() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activePhone, setActivePhone] = useState<string | null>(() => localCache.getActiveChatPhone());

  const [filter, setFilter] = useState<ChatFilterOptions>({
    search: '',
    status: 'all',
    sortBy: 'recent',
  });

  // Subscribe to real-time Firestore chat stream
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToChats(
      (updatedChats) => {
        setChats(updatedChats);
        setIsLoading(false);

        // If no active chat selected yet, default to first chat on large screens
        if (!activePhone && updatedChats.length > 0 && window.innerWidth >= 768) {
          const firstPhone = updatedChats[0].clientPhone;
          setActivePhone(firstPhone);
          localCache.setActiveChatPhone(firstPhone);
        }
      },
      (err) => {
        console.warn('useChats real-time error:', err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filtered chats list
  const filteredChats = useMemo(() => {
    return chats.filter((chat) => {
      // Status filter
      if (filter.status !== 'all' && chat.status !== filter.status) {
        return false;
      }

      // Search filter
      if (filter.search.trim()) {
        const query = filter.search.toLowerCase().trim();
        const matchesName = chat.clientName.toLowerCase().includes(query);
        const matchesPhone = chat.clientPhone.includes(query);
        const matchesTags = chat.tags?.some((t) => t.toLowerCase().includes(query));
        return matchesName || matchesPhone || matchesTags;
      }

      return true;
    });
  }, [chats, filter]);

  // Active selected Chat object
  const activeChat = useMemo(() => {
    if (!activePhone) return null;
    return chats.find((c) => c.clientPhone === activePhone) || null;
  }, [chats, activePhone]);

  // Total unread count across all chats
  const totalUnread = useMemo(() => {
    return chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  }, [chats]);

  // Handler to select a chat
  const selectChat = useCallback((phone: string | null) => {
    setActivePhone(phone);
    localCache.setActiveChatPhone(phone);
    if (phone) {
      markChatAsRead(phone);
    }
  }, []);

  // Handler to create or start new chat
  const createNewChat = useCallback(
    async (phone: string, name: string, tags?: string[], notes?: string) => {
      const cleanPhone = sanitizePhone(phone);
      if (!cleanPhone) return;

      await createOrUpdateChat({
        clientPhone: cleanPhone,
        clientName: name || `Cliente ${cleanPhone.slice(-4)}`,
        status: 'active',
        tags: tags || ['Nuevo'],
        notes: notes || '',
      });

      selectChat(cleanPhone);
    },
    [selectChat]
  );

  // Handler to update chat status
  const updateChatStatus = useCallback(async (phone: string, status: ChatStatus) => {
    const existing = chats.find((c) => c.clientPhone === phone);
    if (existing) {
      await createOrUpdateChat({
        clientPhone: phone,
        clientName: existing.clientName,
        status,
        tags: existing.tags,
        notes: existing.notes,
      });
    }
  }, [chats]);

  return {
    chats: filteredChats,
    allChats: chats,
    activeChat,
    activePhone,
    isLoading,
    totalUnread,
    filter,
    setFilter,
    selectChat,
    createNewChat,
    updateChatStatus,
    markAsRead: markChatAsRead,
  };
}
