import React, { useState, useEffect } from 'react';
import {
  Settings,
  Zap,
  Moon,
  Sun,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import { Chat, ChatFilterOptions, Message, MessageMedia, QuickTemplate, WhatsAppConfig } from '../types/chat';
import { ChatList } from './ChatList';
import { ChatWindow } from './ChatWindow';
import { ConfigModal } from './ConfigModal';
import { NewChatModal } from './NewChatModal';
import { QuickTemplatesModal } from './QuickTemplatesModal';
import { BroadcastModal } from './BroadcastModal';

interface LayoutProps {
  chats: Chat[];
  activeChat: Chat | null;
  activePhone: string | null;
  messages: Message[];
  draft: string;
  onDraftChange: (text: string) => void;
  onSendMessage: (text: string) => Promise<boolean>;
  onSendMedia?: (media: MessageMedia, caption?: string) => Promise<boolean>;
  onRetryMessage?: (msg: Message) => void;
  onSelectChat: (phone: string | null) => void;
  onCreateNewChat: (phone: string, name: string, tags?: string[], notes?: string) => Promise<void>;
  onUpdateStatus: (status: Chat['status']) => void;
  filter: ChatFilterOptions;
  onFilterChange: (newFilter: ChatFilterOptions) => void;
  totalUnread: number;
  config: WhatsAppConfig;
  onSaveConfig: (config: WhatsAppConfig) => void;
  quickTemplates: QuickTemplate[];
  onSaveTemplates: (templates: QuickTemplate[]) => void;
  isLoadingChats?: boolean;
  isLoadingMessages?: boolean;
  isSending?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({
  chats,
  activeChat,
  activePhone,
  messages,
  draft,
  onDraftChange,
  onSendMessage,
  onSendMedia,
  onRetryMessage,
  onSelectChat,
  onCreateNewChat,
  onUpdateStatus,
  filter,
  onFilterChange,
  totalUnread,
  config,
  onSaveConfig,
  quickTemplates,
  onSaveTemplates,
  isLoadingChats = false,
  isLoadingMessages = false,
  isSending = false,
}) => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    return (
      localStorage.getItem('riderchat_theme') === 'dark' ||
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  });

  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [showNewChatModal, setShowNewChatModal] = useState<boolean>(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState<boolean>(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState<boolean>(false);

  // Simulated connection status for header (Req #10)
  const [isConnected, setIsConnected] = useState<boolean>(true);

  // Sync theme class on document element
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('riderchat_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('riderchat_theme', 'light');
    }
  }, [isDark]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased select-none">
      {/* Top Main Navigation Bar */}
      <header className="h-14 bg-slate-900 text-white px-3 sm:px-5 flex items-center justify-between shadow-md shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-linear-to-r from-emerald-500 to-teal-600 text-white shadow-xs">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-sm sm:text-base tracking-wide bg-linear-to-r from-white to-slate-200 bg-clip-text text-transparent">
                RiderChat V2
              </h1>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                WhatsApp Panel
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              Capacitor & Firestore Cloud Ready
            </p>
          </div>
        </div>

        {/* Header Center / Right Controls with Enhanced Online Connection Status (Req #10) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Online Connection Status Indicator (Req #10) */}
          <button
            onClick={() => setIsConnected(!isConnected)}
            className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700/80 text-xs transition-colors hover:bg-slate-800"
            title="Estado de conexión con Meta Cloud API"
          >
            {isConnected ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-300 text-[11px] font-bold">
                  {config.mockMode ? 'Meta API (Simulación)' : 'Meta WhatsApp Cloud API - Conectado'}
                </span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                <span className="text-amber-300 text-[11px] font-medium opacity-90">
                  Intentando reconectar...
                </span>
              </>
            )}
          </button>

          {/* Quick Templates Trigger */}
          <button
            onClick={() => setShowTemplatesModal(true)}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-2xl transition-colors relative"
            title="Plantillas de respuesta"
          >
            <Zap className="w-4 h-4 text-amber-400" />
          </button>

          {/* Settings Modal Trigger */}
          <button
            onClick={() => setShowConfigModal(true)}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-2xl transition-colors"
            title="Configuración API Meta & Firebase"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Dark/Light mode toggle */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-2xl transition-colors"
            title="Cambiar tema"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Workspace (Split View) */}
      <main className="flex-1 flex overflow-hidden relative">
        <div
          className={`w-full md:w-auto h-full ${
            activePhone ? 'hidden md:flex' : 'flex'
          }`}
        >
          <ChatList
            chats={chats}
            activePhone={activePhone}
            onSelectChat={(p) => onSelectChat(p)}
            onNewChat={() => setShowNewChatModal(true)}
            onOpenBroadcast={() => setShowBroadcastModal(true)}
            filter={filter}
            onFilterChange={onFilterChange}
            isLoading={isLoadingChats}
          />
        </div>

        <div
          className={`flex-1 h-full ${
            !activePhone ? 'hidden md:flex' : 'flex'
          }`}
        >
          <ChatWindow
            chat={activeChat}
            messages={messages}
            draft={draft}
            onDraftChange={onDraftChange}
            onSendMessage={onSendMessage}
            onSendMedia={onSendMedia}
            onRetryMessage={onRetryMessage}
            onBack={() => onSelectChat(null)}
            onUpdateStatus={(st) => activePhone && onUpdateStatus(st)}
            quickTemplates={quickTemplates}
            isSending={isSending}
            isLoadingMessages={isLoadingMessages}
            config={config}
          />
        </div>
      </main>

      {/* Modals */}
      <ConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        config={config}
        onSaveConfig={onSaveConfig}
      />

      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onCreateChat={onCreateNewChat}
      />

      <QuickTemplatesModal
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        templates={quickTemplates}
        onSaveTemplates={onSaveTemplates}
      />

      <BroadcastModal
        isOpen={showBroadcastModal}
        onClose={() => setShowBroadcastModal(false)}
        config={config}
      />
    </div>
  );
};
