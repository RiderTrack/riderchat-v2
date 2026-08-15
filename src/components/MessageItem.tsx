import React, { useState } from 'react';
import {
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Copy,
  ExternalLink,
  FileText,
  Play,
  Pause,
  MapPin,
  Maximize2,
  X,
  SmilePlus,
} from 'lucide-react';
import { Message } from '../types/chat';
import { formatMessageTime } from '../utils/formatters';

interface MessageItemProps {
  message: Message;
  clientPhone: string;
  onRetry?: (msg: Message) => void;
}

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🤬'];

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onRetry,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Local state for interactive reactions
  const [reactions, setReactions] = useState<{ [emoji: string]: number }>({});
  const [userSelectedEmoji, setUserSelectedEmoji] = useState<string | null>(null);

  const isSent = message.direction === 'sent';

  const handleCopy = () => {
    if (message.text) {
      navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleToggleReaction = (emoji: string) => {
    setReactions((prev) => {
      const next = { ...prev };
      if (userSelectedEmoji === emoji) {
        // Toggle off
        next[emoji] = (next[emoji] || 1) - 1;
        if (next[emoji] <= 0) delete next[emoji];
        setUserSelectedEmoji(null);
      } else {
        // Toggle on or switch
        if (userSelectedEmoji && next[userSelectedEmoji]) {
          next[userSelectedEmoji] -= 1;
          if (next[userSelectedEmoji] <= 0) delete next[userSelectedEmoji];
        }
        next[emoji] = (next[emoji] || 0) + 1;
        setUserSelectedEmoji(emoji);
      }
      return next;
    });
  };

  const renderStatusTicks = () => {
    if (!isSent) return null;

    switch (message.status) {
      case 'pending':
        return (
          <span className="flex items-center gap-0.5" title="⏳ Enviando...">
            <Clock className="w-3.5 h-3.5 text-emerald-200 animate-pulse" />
          </span>
        );
      case 'sent':
        return (
          <span className="flex items-center gap-0.5" title="✓ Enviado a WhatsApp">
            <Check className="w-3.5 h-3.5 text-emerald-200 stroke-[2.5]" />
          </span>
        );
      case 'delivered':
        return (
          <span className="flex items-center gap-0.5" title="✓✓ Entregado al cliente">
            <CheckCheck className="w-4 h-4 text-emerald-200 stroke-[2.5]" />
          </span>
        );
      case 'read':
        return (
          <span className="flex items-center gap-0.5" title="✓✓ Leído por el cliente 👀">
            <CheckCheck className="w-4 h-4 text-sky-300 stroke-[3]" />
          </span>
        );
      case 'failed':
        return (
          <button
            onClick={() => onRetry && onRetry(message)}
            className="inline-flex items-center gap-1 text-red-200 hover:text-white bg-red-800/40 px-1.5 py-0.5 rounded text-xs transition-colors"
            title="❌ Falló - Toca para reintentar"
          >
            <AlertCircle className="w-3.5 h-3.5 text-red-300" />
            <span className="text-[10px]">❌ Falló - Reintentar 🔄</span>
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`group relative flex w-full my-1.5 ${
        isSent ? 'justify-end' : 'justify-start'
      }`}
    >
      {/* Main Message Container with Hover Floating Reaction Bar */}
      <div className="relative max-w-[85%] sm:max-w-[75%] md:max-w-[65%]">
        {/* Floating Hover Emoji Reactions Picker (Req #6) */}
        <div
          className={`absolute -top-7 ${
            isSent ? 'right-2' : 'left-2'
          } opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 backdrop-blur-md`}
        >
          {EMOJI_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleToggleReaction(emoji)}
              className={`text-base hover:scale-130 active:scale-95 transition-transform duration-150 p-0.5 rounded-full ${
                userSelectedEmoji === emoji ? 'bg-emerald-100 dark:bg-emerald-950/80 scale-110' : ''
              }`}
              title={`Reaccionar con ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Bubble Body */}
        <div
          className={`relative rounded-2xl px-3.5 py-2.5 shadow-xs transition-all ${
            isSent
              ? 'bg-emerald-700 text-white rounded-tr-none'
              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-tl-none'
          }`}
        >
          {/* Quick Copy Button */}
          <button
            onClick={handleCopy}
            className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md ${
              isSent
                ? 'bg-emerald-800/80 hover:bg-emerald-900 text-white'
                : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300'
            }`}
            title={copied ? '¡Copiado!' : 'Copiar mensaje'}
          >
            {copied ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
          </button>

          {/* Media Attachments */}
          {message.media && (
            <div className="mb-2 overflow-hidden rounded-xl">
              {/* Image */}
              {message.media.type === 'image' && (
                <div className="relative group/media cursor-pointer">
                  <img
                    src={message.media.url}
                    alt={message.media.caption || 'Imagen adjunta'}
                    className="w-full max-h-64 object-cover rounded-xl border border-black/10"
                    onClick={() => setIsLightboxOpen(true)}
                    loading="lazy"
                  />
                  <button
                    onClick={() => setIsLightboxOpen(true)}
                    className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full backdrop-blur-xs transition-colors"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Audio / Voice Note */}
              {message.media.type === 'audio' && (
                <div
                  className={`flex items-center gap-3 p-2.5 rounded-xl ${
                    isSent ? 'bg-emerald-800/50' : 'bg-slate-100 dark:bg-slate-700/60'
                  }`}
                >
                  <button
                    onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                    className={`p-2.5 rounded-full shadow-xs transition-transform active:scale-95 ${
                      isSent ? 'bg-white text-emerald-800' : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {isPlayingAudio ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>
                  <div className="flex-1 min-w-36">
                    <div className="flex items-center gap-1 h-5">
                      {[40, 70, 30, 90, 50, 80, 20, 60, 100, 40, 75, 30, 85, 45, 95].map((h, idx) => (
                        <span
                          key={idx}
                          className={`w-1 rounded-full transition-all ${
                            isPlayingAudio && idx < 8
                              ? isSent
                                ? 'bg-sky-300'
                                : 'bg-emerald-500'
                              : isSent
                              ? 'bg-emerald-200/60'
                              : 'bg-slate-300 dark:bg-slate-500'
                          }`}
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between items-center text-[10px] opacity-80 mt-1">
                      <span>Nota de voz WhatsApp</span>
                      <span>0:14</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Document PDF */}
              {message.media.type === 'document' && (
                <a
                  href={message.media.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${
                    isSent
                      ? 'bg-emerald-800/40 border-emerald-500/30 hover:bg-emerald-800/70'
                      : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-red-500/20 text-red-500">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {message.media.fileName || 'Documento adjunto.pdf'}
                    </p>
                    <p className="text-[10px] opacity-75">PDF • Tap para abrir</p>
                  </div>
                  <ExternalLink className="w-4 h-4 opacity-70" />
                </a>
              )}

              {/* Location GPS */}
              {message.media.type === 'location' && (
                <a
                  href={`https://maps.google.com/?q=${message.media.latitude},${message.media.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${
                    isSent
                      ? 'bg-emerald-800/50 border-emerald-500/30 hover:bg-emerald-800/80'
                      : 'bg-slate-50 dark:bg-slate-700/60 border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="p-2 rounded-full bg-emerald-500 text-white shadow-xs">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-xs">
                    <p className="font-semibold">Ubicación GPS en tiempo real</p>
                    <p className="text-[10px] opacity-80 truncate">
                      {message.media.locationName || `${message.media.latitude}, ${message.media.longitude}`}
                    </p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </a>
              )}
            </div>
          )}

          {/* Text Content */}
          {message.text && (
            <p className="text-[13.5px] sm:text-sm leading-relaxed whitespace-pre-wrap break-words select-text">
              {message.text}
            </p>
          )}

          {/* Error notice */}
          {message.status === 'failed' && message.errorMessage && (
            <p className="mt-1 text-[11px] text-red-200 bg-red-900/40 p-1.5 rounded border border-red-500/30">
              {message.errorMessage}
            </p>
          )}

          {/* Timestamp & Read Tick */}
          <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] opacity-80 select-none">
            <span>{formatMessageTime(message.timestamp)}</span>
            {renderStatusTicks()}
          </div>
        </div>

        {/* Active Reactions Small Badges (Req #6) */}
        {Object.keys(reactions).length > 0 && (
          <div
            className={`flex items-center gap-1 mt-1 ${
              isSent ? 'justify-end' : 'justify-start'
            }`}
          >
            {Object.entries(reactions).map(([emoji, count]) => {
              const countNum = Number(count);
              return (
                <span
                  key={emoji}
                  onClick={() => handleToggleReaction(emoji)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs rounded-full border border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <span>{emoji}</span>
                  {countNum > 1 && <span className="text-[10px] font-bold text-emerald-600">{countNum}</span>}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && message.media?.url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 p-2 text-white bg-slate-800/80 hover:bg-slate-700 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={message.media.url}
            alt="Vista completa"
            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
