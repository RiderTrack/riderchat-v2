import React, { useState } from 'react';
import { X, Settings, ShieldCheck, Database, Zap, Key, Phone, RefreshCw, CheckCircle } from 'lucide-react';
import { WhatsAppConfig } from '../types/chat';
import { seedInitialData, isFirestoreAvailable } from '../services/firestore';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: WhatsAppConfig;
  onSaveConfig: (config: WhatsAppConfig) => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [phoneNumberId, setPhoneNumberId] = useState<string>(config.phoneNumberId || '');
  const [accessToken, setAccessToken] = useState<string>(config.accessToken || '');
  const [businessAccountId, setBusinessAccountId] = useState<string>(config.businessAccountId || '');
  const [mockMode, setMockMode] = useState<boolean>(config.mockMode);

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      phoneNumberId: phoneNumberId.trim(),
      accessToken: accessToken.trim(),
      businessAccountId: businessAccountId.trim(),
      mockMode,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleResetDemoData = () => {
    seedInitialData();
    alert('¡Datos de prueba restablecidos correctamente!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 relative overflow-hidden max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Configuración de RiderChat V2
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Credenciales Meta WhatsApp Cloud API y Firebase Firestore
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span>Configuración guardada correctamente.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Mock mode toggle */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Zap className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Modo Simulación / Demostración
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Simula envíos de WhatsApp y respuestas automáticas
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={mockMode}
                onChange={(e) => setMockMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Meta API Fields */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Phone Number ID (ID del número de WhatsApp Meta)
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                placeholder="Ej. 109876543210987"
                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Meta System User Permanent Access Token
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="EAAG..."
                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              WhatsApp Business Account ID (Opcional)
            </label>
            <input
              type="text"
              value={businessAccountId}
              onChange={(e) => setBusinessAccountId(e.target.value)}
              placeholder="Ej. 100987654321000"
              className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-emerald-500 outline-none"
            />
          </div>

          {/* Database Status Card */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-500" /> Firebase Firestore
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isFirestoreAvailable
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
              }`}>
                {isFirestoreAvailable ? 'Conectado Live' : 'Modo Offline Sync'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Las conversaciones y mensajes se sincronizan automáticamente con las colecciones{' '}
              <code className="text-emerald-600 dark:text-emerald-400">chats</code> y{' '}
              <code className="text-emerald-600 dark:text-emerald-400">chats/&#123;phone&#125;/messages</code>.
            </p>
          </div>

          {/* Seed Data Button */}
          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={handleResetDemoData}
              className="text-xs text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restablecer chats de prueba</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all active:scale-95"
              >
                Guardar Configuración
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
