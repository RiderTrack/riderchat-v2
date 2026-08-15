import React, { useRef, useEffect, useState } from 'react';
import { Chat, Message, MessageMedia, QuickTemplate } from '../types/chat';
import { ClientHeader } from './ClientHeader';
import { MessageItem } from './MessageItem';
import { MessageInput } from './MessageInput';
import { Sparkles, MessageSquare, Tag, FileText, X, Copy, Tag as TagIcon } from 'lucide-react';
import { formatPhoneNumber } from '../utils/formatters';
import { groupMessagesByDate } from '../utils/dateGrouper';
import { getAvatarPalette } from '../utils/colorHash';

interface ChatWindowProps {
  chat: Chat | null;
  messages: Message[];
  draft: string;
  onDraftChange: (text: string) => void;
  onSendMessage: (text: string) => Promise<boolean>;
  onSendMedia?: (media: MessageMedia, caption?: string) => Promise<boolean>;
  onRetryMessage?: (msg: Message) => void;
  onBack?: () => void;
  onUpdateStatus?: (status: Chat['status']) => void;
  quickTemplates: QuickTemplate[];
  isSending?: boolean;
  isLoadingMessages?: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  chat,
  messages,
  draft,
  onDraftChange,
  onSendMessage,
  onSendMedia,
  onRetryMessage,
  onBack,
  onUpdateStatus,
  quickTemplates,
  isSending = false,
  isLoadingMessages = false,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showInfoPanel, setShowInfoPanel] = useState<boolean>(false);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chat?.isTyping]);

  if (!chat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-500 select-none">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 shadow-sm">
          <MessageSquare className="w-10 h-10" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
          RiderChat V2 WhatsApp
        </h3>
        <p className="text-xs text-center max-w-sm mt-1 leading-relaxed">
          Selecciona una conversación de la lista para ver el historial de mensajes y responder en tiempo real.
        </p>
      </div>
    );
  }

  // Group messages chronologically by date for date dividers (Req #4)
  const groupedMessages = groupMessagesByDate(messages);

  // Generate smart AI suggested responses based on last received message
  const lastReceived = [...messages].reverse().find((m) => m.direction === 'received');
  const smartSuggestions = lastReceived
    ? [
        `¡Hola ${chat.clientName.split(' ')[0]}! Ya voy en camino con tu pedido. 🛵`,
        `Entendido. Por favor avísame si hay alguna referencia en la fachada. 🏠`,
        `¡Conforme! Comprobante recibido correctamente. 👍`,
      ]
    : [
        `¡Hola ${chat.clientName.split(' ')[0]}! ¿En qué puedo ayudarte hoy?`,
        `Por favor confírmame si el pago será en efectivo o Yape/Plin. 📲`,
      ];

  const avatarPalette = getAvatarPalette(chat.clientName);

  return (
    <div
      key={chat.clientPhone}
      className="flex-1 flex flex-col h-full bg-slate-100/70 dark:bg-slate-950 relative overflow-hidden animate-in fade-in slide-in-from-right duration-200"
    >
      {/* Header */}
      <ClientHeader
        chat={chat}
        onBack={onBack}
        onUpdateStatus={onUpdateStatus}
        onToggleInfoPanel={() => setShowInfoPanel(!showInfoPanel)}
      />

      {/* Main Messages Viewport */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
        {isLoadingMessages ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full inline-block shadow-xs border border-slate-200 dark:border-slate-700 font-medium">
              Inicio de conversación con WhatsApp Cloud API
            </p>
          </div>
        ) : (
          /* Render Grouped Messages with Date Dividers (Req #4) */
          groupedMessages.map((group) => (
            <div key={group.dateLabel} className="space-y-3">
              {/* Date Separator Line */}
              <div className="flex items-center justify-center my-3">
                <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                <span className="px-3 py-1 bg-white/90 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400 text-[11px] font-bold rounded-full border border-slate-200/80 dark:border-slate-700/80 shadow-2xs backdrop-blur-xs mx-2">
                  {group.dateLabel}
                </span>
                <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
              </div>

              {/* Messages in this Date Group */}
              {group.messages.map((msg) => (
                <MessageItem
                  key={msg.id}
                  message={msg}
                  clientPhone={chat.clientPhone}
                  onRetry={onRetryMessage}
                />
              ))}
            </div>
          ))
        )}

        {/* Typing Indicator Animado (Req #2) */}
        {chat.isTyping && (
          <div className="flex items-center gap-2 my-2 animate-in fade-in duration-200">
            <div className="flex items-center gap-1 px-3.5 py-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" />
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium italic">
              {chat.clientName} está escribiendo...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* AI Smart Suggestions Bar */}
      <div className="px-3 py-1.5 bg-white/80 dark:bg-slate-900/80 border-t border-slate-200/60 dark:border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 shrink-0">
          <Sparkles className="w-3.5 h-3.5 fill-current" /> Sugerencias IA:
        </span>
        {smartSuggestions.map((sug, idx) => (
          <button
            key={idx}
            onClick={() => onDraftChange(sug)}
            className="text-[11px] text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full shrink-0 transition-colors font-medium"
          >
            {sug}
          </button>
        ))}
      </div>

      {/* Input */}
      <MessageInput
        draft={draft}
        onDraftChange={onDraftChange}
        onSendMessage={onSendMessage}
        onSendMedia={onSendMedia}
        quickTemplates={quickTemplates}
        clientName={chat.clientName}
        clientPhone={chat.clientPhone}
        isSending={isSending}
      />

      {/* Client Detail Info Slide Panel */}
      {showInfoPanel && (
        <div className="absolute top-0 right-0 bottom-0 w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl p-5 z-30 overflow-y-auto animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              Detalles del Cliente
            </h3>
            <button
              onClick={() => setShowInfoPanel(false)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="py-4 space-y-5">
            {/* Avatar Size w-16 h-16 in details panel (Req #1) */}
            <div className="text-center">
              {chat.avatar ? (
                <img
                  src={chat.avatar}
                  alt={chat.clientName}
                  className="w-16 h-16 rounded-full object-cover mx-auto mb-2 border-2 border-emerald-500 shadow-md"
                />
              ) : (
                <div
                  className={`w-16 h-16 rounded-full ${avatarPalette.bg} ${avatarPalette.text} font-black text-xl flex items-center justify-center mx-auto mb-2 border-2 ${avatarPalette.border} shadow-md`}
                >
                  {chat.clientName.substring(0, 2).toUpperCase()}
                </div>
              )}
              <h4 className="font-bold text-slate-900 dark:text-white text-base">{chat.clientName}</h4>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{formatPhoneNumber(chat.clientPhone)}</p>
            </div>

            {/* Tags */}
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <TagIcon className="w-3.5 h-3.5 text-emerald-500" /> Etiquetas
              </label>
              <div className="flex flex-wrap gap-1.5">
                {chat.tags && chat.tags.length > 0 ? (
                  chat.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 px-2.5 py-1 rounded-full font-semibold"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">Sin etiquetas asignadas</span>
                )}
              </div>
            </div>

            {/* Delivery Notes */}
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-500" /> Notas de Entrega
              </label>
              <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 leading-relaxed font-medium">
                {chat.notes || 'Sin notas registradas para este cliente.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
