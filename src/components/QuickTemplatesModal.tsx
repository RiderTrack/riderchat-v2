import React, { useState } from 'react';
import { X, Zap, Plus, Trash2, Edit3, Check, RotateCcw } from 'lucide-react';
import { QuickTemplate } from '../types/chat';
import { DEFAULT_QUICK_TEMPLATES } from '../services/local-cache';

interface QuickTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: QuickTemplate[];
  onSaveTemplates: (templates: QuickTemplate[]) => void;
}

export const QuickTemplatesModal: React.FC<QuickTemplatesModalProps> = ({
  isOpen,
  onClose,
  templates,
  onSaveTemplates,
}) => {
  const [items, setItems] = useState<QuickTemplate[]>(templates);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newContent, setNewContent] = useState<string>('');
  const [newCategory, setNewCategory] = useState<QuickTemplate['category']>('delivery');
  const [isAdding, setIsAdding] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const newTmpl: QuickTemplate = {
      id: `tmpl_${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      content: newContent.trim(),
    };

    const updated = [newTmpl, ...items];
    setItems(updated);
    onSaveTemplates(updated);

    setNewTitle('');
    setNewContent('');
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    const updated = items.filter((t) => t.id !== id);
    setItems(updated);
    onSaveTemplates(updated);
  };

  const handleResetDefaults = () => {
    setItems(DEFAULT_QUICK_TEMPLATES);
    onSaveTemplates(DEFAULT_QUICK_TEMPLATES);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 relative overflow-hidden max-h-[85vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Plantillas de Respuestas Rápidas
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Usa variables como <code className="text-emerald-600">&#123;&#123;cliente&#125;&#125;</code> o{' '}
              <code className="text-emerald-600">&#123;&#123;monto&#125;&#125;</code>
            </p>
          </div>
        </div>

        {/* Add Template Form */}
        {isAdding ? (
          <form onSubmit={handleAdd} className="mb-4 p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 shrink-0">
            <div>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Título de la plantilla (ej. 🛵 Llegando)"
                className="w-full bg-white dark:bg-slate-900 text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 outline-none"
                required
              />
            </div>
            <div>
              <textarea
                rows={2}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Texto del mensaje (ej. ¡Hola {{cliente}}! Ya estoy en la puerta.)"
                className="w-full bg-white dark:bg-slate-900 text-xs sm:text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none resize-none"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold"
              >
                Guardar Plantilla
              </button>
            </div>
          </form>
        ) : (
          <div className="mb-3 flex justify-between items-center shrink-0">
            <button
              onClick={() => setIsAdding(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" /> Nueva Plantilla
            </button>

            <button
              onClick={handleResetDefaults}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Restablecer
            </button>
          </div>
        )}

        {/* Templates List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {items.map((tmpl) => (
            <div
              key={tmpl.id}
              className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex items-start justify-between gap-3 group"
            >
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {tmpl.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {tmpl.content}
                </p>
              </div>
              <button
                onClick={() => handleDelete(tmpl.id)}
                className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shrink-0"
                title="Eliminar plantilla"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
