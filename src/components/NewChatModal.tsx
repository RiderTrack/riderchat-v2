import React, { useState } from 'react';
import { X, User, Phone, Tag, FileText, Send, Check } from 'lucide-react';
import { isValidWhatsAppPhone, sanitizePhone } from '../utils/validators';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChat: (phone: string, name: string, tags?: string[], notes?: string) => Promise<void>;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  onCreateChat,
}) => {
  const [phone, setPhone] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [tagsInput, setTagsInput] = useState<string>('Pedido Delivery');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const clean = sanitizePhone(phone);
    if (!isValidWhatsAppPhone(clean)) {
      setError('Número de WhatsApp inválido. Ingresa 9 dígitos (ej. 987654321) o con código país (51987654321).');
      return;
    }

    if (!name.trim()) {
      setError('Por favor ingresa el nombre del cliente.');
      return;
    }

    setIsSubmitting(true);
    const tagsArray = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    await onCreateChat(clean, name.trim(), tagsArray, notes.trim());
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <Phone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Nuevo Chat de WhatsApp
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Inicia una conversación directa vía Meta Cloud API
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Teléfono WhatsApp (Perú +51 o Internacional) *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej. 987 654 321 ó 51987654321"
                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-emerald-500 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Nombre del Cliente / Destinatario *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Carlos Mendoza (San Isidro)"
                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-emerald-500 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Etiquetas (separadas por coma)
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Ej. Miraflores, Yape, Urgente"
                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Notas iniciales o dirección de entrega
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Dejar en recepción con el vigilante Don Pedro."
              className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-emerald-500 outline-none resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Abrir Conversación</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
