import React, { useState, useRef, useEffect } from 'react';
import {
  Phone,
  ChevronLeft,
  MoreVertical,
  ExternalLink,
  Copy,
  Tag,
  CheckCircle2,
  XCircle,
  Ban,
  Pencil,
  Zap,
  Archive,
  Info,
  Check,
} from 'lucide-react';
import { Chat, ChatStatus } from '../types/chat';
import { formatPhoneNumber, getInitials } from '../utils/formatters';
import { getAvatarPalette } from '../utils/colorHash';

interface ClientHeaderProps {
  chat: Chat;
  onBack?: () => void;
  onUpdateStatus?: (status: ChatStatus) => void;
  onToggleInfoPanel?: () => void;
  onOpenTemplates?: () => void;
}

export const ClientHeader: React.FC<ClientHeaderProps> = ({
  chat,
  onBack,
  onUpdateStatus,
  onToggleInfoPanel,
  onOpenTemplates,
}) => {
  const [showStatusMenu, setShowStatusMenu] = useState<boolean>(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState<boolean>(false);
  const [copiedPhone, setCopiedPhone] = useState<boolean>(false);

  const optionsMenuRef = useRef<HTMLDivElement>(null);

  const formattedPhone = formatPhoneNumber(chat.clientPhone);
  const whatsappUrl = `https://wa.me/${chat.clientPhone}`;
  const avatarPalette = getAvatarPalette(chat.clientName);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) {
        setShowOptionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(chat.clientPhone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const isOnline = chat.status === 'active';

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between px-3.5 py-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-2xs">
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Mobile Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors active:scale-95"
            title="Volver a la lista"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Client Avatar (Req #1) */}
        <div className="relative shrink-0">
          {chat.avatar ? (
            <img
              src={chat.avatar}
              alt={chat.clientName}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/30 shadow-2xs"
            />
          ) : (
            <div
              className={`w-10 h-10 rounded-full ${avatarPalette.bg} ${avatarPalette.text} font-bold text-sm flex items-center justify-center ring-2 ring-emerald-500/30 shadow-2xs`}
            >
              {getInitials(chat.clientName)}
            </div>
          )}
          {/* Status Dot */}
          <span
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white dark:ring-slate-900 ${
              isOnline ? 'bg-emerald-500' : 'bg-slate-400'
            }`}
          />
        </div>

        {/* Name, Status Indicator & Phone (Req #5) */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate leading-tight">
              {chat.clientName}
            </h2>

            {/* Status Pill Badge */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                  chat.status === 'active'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : chat.status === 'closed'
                    ? 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30'
                    : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                }`}
              >
                {chat.status === 'active' ? 'Activo' : chat.status === 'closed' ? 'Cerrado' : 'Bloqueado'}
              </button>

              {/* Status Change Popover */}
              {showStatusMenu && (
                <div className="absolute top-full left-0 mt-1 w-36 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={() => {
                      onUpdateStatus && onUpdateStatus('active');
                      setShowStatusMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-700/50 font-medium"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Activo</span>
                  </button>
                  <button
                    onClick={() => {
                      onUpdateStatus && onUpdateStatus('closed');
                      setShowStatusMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 font-medium"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cerrado</span>
                  </button>
                  <button
                    onClick={() => {
                      onUpdateStatus && onUpdateStatus('blocked');
                      setShowStatusMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-slate-700/50 font-medium"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Bloqueado</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Client Online Status Subtext (Req #5) */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            <div className="flex items-center gap-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
              />
              <span className={isOnline ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}>
                {isOnline ? 'En línea' : 'Activo hace poco'}
              </span>
            </div>
            <span>•</span>
            <span className="font-mono">{formattedPhone}</span>
            <button
              onClick={handleCopyPhone}
              className="p-0.5 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              title={copiedPhone ? '¡Copiado!' : 'Copiar número'}
            >
              {copiedPhone ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* Header Actions & Dropdown Menu (Req #9) */}
      <div className="flex items-center gap-1 relative" ref={optionsMenuRef}>
        {/* Open Direct WhatsApp Link */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-full transition-colors"
          title="Abrir WhatsApp Web / App"
        >
          <ExternalLink className="w-4 h-4" />
        </a>

        {/* Direct Call Icon */}
        <a
          href={`tel:+${chat.clientPhone}`}
          className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          title="Llamar teléfono"
        >
          <Phone className="w-4 h-4" />
        </a>

        {/* Toggle Info Drawer */}
        {onToggleInfoPanel && (
          <button
            onClick={onToggleInfoPanel}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            title="Ver detalles del cliente"
          >
            <Info className="w-4 h-4" />
          </button>
        )}

        {/* More Options Trigger (Req #9) */}
        <button
          onClick={() => setShowOptionsMenu(!showOptionsMenu)}
          className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          title="Más opciones de cliente"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {/* Dropdown Menu of Client Actions (Req #9) */}
        {showOptionsMenu && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-1.5 z-40 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => {
                setShowOptionsMenu(false);
                onToggleInfoPanel && onToggleInfoPanel();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <Pencil className="w-4 h-4 text-emerald-500" />
              <span>Editar datos cliente</span>
            </button>

            <button
              onClick={() => {
                setShowOptionsMenu(false);
                onToggleInfoPanel && onToggleInfoPanel();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <Tag className="w-4 h-4 text-amber-500" />
              <span>Cambiar etiqueta</span>
            </button>

            <button
              onClick={() => {
                setShowOptionsMenu(false);
                onOpenTemplates && onOpenTemplates();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Enviar plantilla rápida</span>
            </button>

            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

            <button
              onClick={() => {
                setShowOptionsMenu(false);
                onUpdateStatus && onUpdateStatus('closed');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-colors"
            >
              <Archive className="w-4 h-4 text-blue-500" />
              <span>Archivar conversación</span>
            </button>

            <button
              onClick={() => {
                setShowOptionsMenu(false);
                onUpdateStatus && onUpdateStatus('blocked');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
            >
              <Ban className="w-4 h-4 text-red-500" />
              <span>Bloquear cliente</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
