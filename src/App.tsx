import React, { useState } from 'react';
import { useChats } from './hooks/useChats';
import { useMessages } from './hooks/useMessages';
import { useWhatsAppAPI } from './hooks/useWhatsAppAPI';
import { Layout } from './components/Layout';
import { localCache } from './services/local-cache';
import { QuickTemplate } from './types/chat';

export default function App() {
  const {
    chats,
    activeChat,
    activePhone,
    isLoading: isLoadingChats,
    totalUnread,
    filter,
    setFilter,
    selectChat,
    createNewChat,
    updateChatStatus,
  } = useChats();

  const {
    messages,
    isLoading: isLoadingMessages,
    draft,
    updateDraft,
  } = useMessages(activePhone);

  const {
    config,
    saveConfig,
    isSending,
    sendTextMessage,
    sendMediaMessage,
    retryFailedMessage,
  } = useWhatsAppAPI();

  const [quickTemplates, setQuickTemplates] = useState<QuickTemplate[]>(() =>
    localCache.getQuickTemplates()
  );

  const handleSaveTemplates = (templates: QuickTemplate[]) => {
    setQuickTemplates(templates);
    localCache.saveQuickTemplates(templates);
  };

  const handleSendMessage = async (text: string): Promise<boolean> => {
    if (!activePhone) return false;
    return await sendTextMessage(activePhone, text);
  };

  const handleSendMedia = async (media: any, caption?: string): Promise<boolean> => {
    if (!activePhone) return false;
    return await sendMediaMessage(activePhone, media, caption);
  };

  const handleRetryMessage = async (msg: any) => {
    if (!activePhone) return;
    await retryFailedMessage(activePhone, msg);
  };

  return (
    <Layout
      chats={chats}
      activeChat={activeChat}
      activePhone={activePhone}
      messages={messages}
      draft={draft}
      onDraftChange={updateDraft}
      onSendMessage={handleSendMessage}
      onSendMedia={handleSendMedia}
      onRetryMessage={handleRetryMessage}
      onSelectChat={selectChat}
      onCreateNewChat={createNewChat}
      onUpdateStatus={(st) => activePhone && updateChatStatus(activePhone, st)}
      filter={filter}
      onFilterChange={setFilter}
      totalUnread={totalUnread}
      config={config}
      onSaveConfig={saveConfig}
      quickTemplates={quickTemplates}
      onSaveTemplates={handleSaveTemplates}
      isLoadingChats={isLoadingChats}
      isLoadingMessages={isLoadingMessages}
      isSending={isSending}
    />
  );
}
