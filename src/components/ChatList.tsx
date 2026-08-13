import React, { useState } from 'react';
import {
  Search,
  X,
  Plus,
  MessageSquare,
  Image as ImageIcon,
  FileText,
  Mic,
  MapPin,
  Archive,
  Trash2,
  Tag,
} from 'lucide-react';
import { Chat, ChatFilterOptions } from '../types/chat';
import { formatMessageTime, getInitials, truncateText } from '../utils/formatters';
import { getAvatarPalette } from '../utils/colorHash';

interface ChatListProps {
  chats: Chat[];
  activePhone: string | null;
  onSelectChat: (phone: string) => void;
  onNewChat: () => void;
  filter: ChatFilterOptions;
  onFilterChange: (newFilter: ChatFilterOptions) => void;
  isLoading?: boolean;
}

export const ChatList: React.FC<ChatListProps> = ({
  chats,
  activePhone,
  onSelectChat,
  onNewChat,
  filter,
  onFilterChange,
  isLoading = false,
}) => {
  // Mobile swipe actions state tracking
  const [swipedPhone, setSwipedPhone] = useState<string | null>(null);
  const [touchStartX, setTouchStartX] = useState<number>(0);
  const [touchCurrentX, setTouchCurrentX] = useState<number>(0);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filter, search: e.target.value });
  };

  const handleStatusTab = (status: ChatFilterOptions['status']) => {
    onFilterChange({ ...filter, status });
  };

  // Touch handlers for mobile swipe-to-reveal action buttons
  const handleTouchStart = (phone: string, e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchCurrentX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchCurrentX(e.touches[0].clientX);
  };

  const handleTouchEnd = (phone: string) => {
    const deltaX = touchStartX - touchCurrentX;
    if (deltaX > 50) {
      // Swiped Left -> Reveal actions
      setSwipedPhone(phone);
    } else if (deltaX < -30) {
      // Swiped Right -> Reset
      if (swipedPhone === phone) setSwipedPhone(null);
    }
  };

  const renderLastMessageTypeIcon = (type?: string) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 inline mr-1 shrink-0" />;
      case 'audio':
        return <Mic className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 inline mr-1 shrink-0" />;
      case 'document':
        return <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 inline mr-1 shrink-0" />;
      case 'location':
        return <MapPin className="w-3.5 h-3.5 text-red-600 dark:text-red-400 inline mr-1 shrink-0" />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full md:w-80 lg:w-96 flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 shrink-0 select-none">
      {/* Header Bar */}
      <div className="p-3.5 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-emerald-600 text-white shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                RiderChat V2
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Panel WhatsApp Cloud API
              </p>
            </div>
          </div>

          <button
            onClick={onNewChat}
            className="p-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl shadow-xs transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="Nuevo chat de WhatsApp"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo Chat</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={filter.search}
            onChange={handleSearchChange}
            placeholder="Buscar por cliente o teléfono..."
            className="w-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs rounded-xl pl-9 pr-8 py-2.5 border border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all"
          />
          {filter.search && (
            <button
              onClick={() => onFilterChange({ ...filter, search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 mt-2.5 overflow-x-auto scrollbar-none pb-1">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'active', label: 'Activos' },
            { id: 'closed', label: 'Cerrados' },
            { id: 'blocked', label: 'Bloqueados' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleStatusTab(tab.id as any)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all shrink-0 ${
                filter.status === tab.id
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin w-7 h-7 border-3 border-emerald-500 border-t-transparent rounded-full" />
          </div>
        ) : chats.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500">
            <p className="text-sm font-medium">No se encontraron conversaciones</p>
            <p className="text-xs mt-1">Prueba cambiando el filtro o inicia un nuevo chat.</p>
          </div>
        ) : (
          chats.map((chat) => {
            const isSelected = activePhone === chat.clientPhone;
            const isSwiped = swipedPhone === chat.clientPhone;
            const avatarPalette = getAvatarPalette(chat.clientName);
            const displayUnread = chat.unreadCount > 99 ? '99+' : chat.unreadCount;

            return (
              <div
                key={chat.clientPhone}
                className="relative overflow-hidden group touch-pan-y"
                onTouchStart={(e) => handleTouchStart(chat.clientPhone, e)}
                onTouchMove={handleTouchMove}
                onTouchEnd={() => handleTouchEnd(chat.clientPhone)}
              >
                {/* Background Swipe Actions (Mobile) */}
                <div className="absolute inset-y-0 right-0 flex items-center justify-end z-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      alert(`Conversación de ${chat.clientName} archivada`);
                      setSwipedPhone(null);
                    }}
                    className="h-full px-4 bg-blue-600 text-white flex items-center justify-center gap-1 text-xs font-semibold transition-all active:bg-blue-700"
                    title="Archivar"
                  >
                    <Archive className="w-4 h-4" />
                    <span>Archivar</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      alert(`Conversación de ${chat.clientName} eliminada`);
                      setSwipedPhone(null);
                    }}
                    className="h-full px-4 bg-red-600 text-white flex items-center justify-center gap-1 text-xs font-semibold transition-all active:bg-red-700"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar</span>
                  </button>
                </div>

                {/* Foreground Chat Item Row */}
                <div
                  onClick={() => {
                    if (isSwiped) {
                      setSwipedPhone(null);
                    } else {
                      onSelectChat(chat.clientPhone);
                    }
                  }}
                  className={`flex items-start gap-3 p-3.5 cursor-pointer transition-transform duration-200 ease-out relative z-10 bg-white dark:bg-slate-900 ${
                    isSwiped ? '-translate-x-36' : 'translate-x-0'
                  } ${
                    isSelected
                      ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-l-4 border-emerald-600'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  {/* Avatar Container with Real Photo / Dynamic Color Hash Initials & Unread Ping Badge */}
                  <div className="relative shrink-0">
                    {chat.avatar ? (
                      <img
                        src={chat.avatar}
                        alt={chat.clientName}
                        className="w-12 h-12 rounded-full object-cover shadow-2xs border-2 border-emerald-500"
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className={`w-12 h-12 rounded-full ${avatarPalette.bg} ${avatarPalette.text} font-bold text-sm flex items-center justify-center shadow-2xs border-2 ${avatarPalette.border}`}
                      >
                        {getInitials(chat.clientName)}
                      </div>
                    )}

                    {/* Online / Active Status Dot */}
                    {chat.status === 'active' && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
                    )}

                    {/* Badge "No leídos" con Ping Pulsante (Req #3) */}
                    {chat.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 z-20 flex items-center justify-center">
                        {/* Ping Pulse Backing */}
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        {/* Solid Badge */}
                        <span className="relative inline-flex items-center justify-center bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 min-w-[20px] h-[20px] rounded-full shadow-md border-2 border-white dark:border-slate-900">
                          {displayUnread}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Chat Content & Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        {chat.clientName}
                      </h3>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 font-medium ml-1">
                        {formatMessageTime(chat.lastMessageTime)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center">
                      {renderLastMessageTypeIcon(chat.lastMessageType)}
                      <span>{truncateText(chat.lastMessage, 34)}</span>
                    </p>

                    {/* Tags */}
                    {chat.tags && chat.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Tag className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-medium truncate max-w-32 border border-slate-200/60 dark:border-slate-700/60">
                          {chat.tags[0]}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
