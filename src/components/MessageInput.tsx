import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  FileText,
  MapPin,
  Sparkles,
  Zap,
  Mic,
  X,
  Smile,
  Loader2,
} from 'lucide-react';
import { QuickTemplate, MessageMedia } from '../types/chat';

interface MessageInputProps {
  draft: string;
  onDraftChange: (text: string) => void;
  onSendMessage: (text: string) => Promise<boolean>;
  onSendMedia?: (media: MessageMedia, caption?: string) => Promise<boolean>;
  quickTemplates: QuickTemplate[];
  clientName?: string;
  isSending?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  draft,
  onDraftChange,
  onSendMessage,
  onSendMedia,
  quickTemplates,
  clientName = 'Cliente',
  isSending = false,
}) => {
  const [showAttachmentMenu, setShowAttachmentMenu] = useState<boolean>(false);
  const [showTemplatesMenu, setShowTemplatesMenu] = useState<boolean>(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto resize textarea height based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        140
      )}px`;
    }
  }, [draft]);

  // Handle voice recording timer
  useEffect(() => {
    let interval: any = null;
    if (isRecordingVoice) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecordingVoice]);

  const handleSend = async () => {
    if (!draft.trim() || isSending) return;
    const textToSend = draft;
    onDraftChange('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    await onSendMessage(textToSend);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const applyTemplate = (template: QuickTemplate) => {
    let content = template.content;
    content = content.replace(/{{cliente}}/g, clientName);
    content = content.replace(/{{monto}}/g, '35.00');
    content = content.replace(/{{rider}}/g, 'Rudy');

    onDraftChange(draft ? `${draft}\n${content}` : content);
    setShowTemplatesMenu(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onSendMedia) return;

    const isImage = file.type.startsWith('image/');
    const isAudio = file.type.startsWith('audio/');
    const fileUrl = URL.createObjectURL(file);

    onSendMedia(
      {
        type: isImage ? 'image' : isAudio ? 'audio' : 'document',
        url: fileUrl,
        fileName: file.name,
        fileSize: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      },
      file.name
    );

    setShowAttachmentMenu(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendGPSLocation = async () => {
    if (!onSendMedia) return;

    // Default Lima Peru coordinates or browser GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          onSendMedia(
            {
              type: 'location',
              url: `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              locationName: 'Ubicación GPS Rider en Vivo',
            },
            '📍 Mi ubicación actual'
          );
        },
        () => {
          // Fallback Lima center
          onSendMedia(
            {
              type: 'location',
              url: 'https://maps.google.com/?q=-12.046374,-77.042793',
              latitude: -12.046374,
              longitude: -77.042793,
              locationName: 'Ubicación Lima Centro',
            },
            '📍 Ubicación GPS'
          );
        }
      );
    }
    setShowAttachmentMenu(false);
  };

  const finishVoiceRecording = () => {
    if (!onSendMedia) return;
    setIsRecordingVoice(false);
    onSendMedia({
      type: 'audio',
      url: 'https://actions.google.com/sounds/v1/human_voices/human_groan.ogg', // Sample voice note
      caption: 'Nota de voz de WhatsApp',
    });
  };

  return (
    <div className="sticky bottom-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 p-2 sm:p-3">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept="image/*,application/pdf,audio/*"
      />

      {/* Quick Templates Popover */}
      {showTemplatesMenu && (
        <div className="absolute bottom-full left-2 sm:left-4 right-2 sm:right-auto mb-2 w-full sm:w-96 max-h-72 overflow-y-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-3 z-30 animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-700">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 fill-current" /> Plantillas Rápidas WhatsApp
            </span>
            <button
              onClick={() => setShowTemplatesMenu(false)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1.5">
            {quickTemplates.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => applyTemplate(tmpl)}
                className="w-full text-left p-2 rounded-xl bg-slate-50 dark:bg-slate-700/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200/60 dark:border-slate-700 transition-colors group"
              >
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                  {tmpl.title}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                  {tmpl.content}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Attachment Options Drawer */}
      {showAttachmentMenu && (
        <div className="absolute bottom-full left-3 mb-2 flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-30 animate-in slide-in-from-bottom-2 duration-150">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-1 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-700 dark:text-slate-300"
            title="Enviar Imagen"
          >
            <div className="p-2.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium">Foto</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-1 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-700 dark:text-slate-300"
            title="Enviar Documento PDF"
          >
            <div className="p-2.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium">Documento</span>
          </button>

          <button
            onClick={sendGPSLocation}
            className="flex flex-col items-center gap-1 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-700 dark:text-slate-300"
            title="Enviar Ubicación GPS"
          >
            <div className="p-2.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
              <MapPin className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium">Ubicación</span>
          </button>
        </div>
      )}

      {/* Voice Note Recording Bar */}
      {isRecordingVoice ? (
        <div className="flex items-center justify-between bg-red-50 dark:bg-red-950/40 p-2.5 rounded-2xl border border-red-200 dark:border-red-900/60 animate-in fade-in duration-200">
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="text-xs font-semibold">Grabando nota de voz... ({recordingSeconds}s)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRecordingVoice(false)}
              className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              title="Cancelar"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              onClick={finishVoiceRecording}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar audio</span>
            </button>
          </div>
        </div>
      ) : (
        /* Main Text Input Bar */
        <div className="flex items-end gap-1.5 sm:gap-2">
          {/* Attachment button */}
          <button
            type="button"
            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
            className="p-2.5 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            title="Adjuntar multimedia"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Quick templates trigger */}
          <button
            type="button"
            onClick={() => setShowTemplatesMenu(!showTemplatesMenu)}
            className="p-2.5 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-full transition-colors hidden sm:flex"
            title="Plantillas de respuesta rápida"
          >
            <Zap className="w-5 h-5" />
          </button>

          {/* Text Area Input */}
          <div className="flex-1 min-w-0 bg-slate-100 dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all flex items-center px-3 py-1">
            <textarea
              ref={textareaRef}
              rows={1}
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje de WhatsApp..."
              className="w-full bg-transparent text-slate-800 dark:text-slate-100 text-xs sm:text-sm resize-none outline-none py-1.5 max-h-32 scrollbar-none"
            />
          </div>

          {/* Voice Record or Send Button */}
          {draft.trim() ? (
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending}
              className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-md transition-all active:scale-95 disabled:opacity-50 shrink-0"
              title="Enviar mensaje"
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsRecordingVoice(true)}
              className="p-3 bg-slate-200 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white text-slate-600 dark:text-slate-300 rounded-2xl transition-colors shrink-0"
              title="Grabar nota de voz"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
