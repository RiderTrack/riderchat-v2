import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  CheckCircle2,
  Circle,
  Loader2,
  AlertCircle,
  RefreshCw,
  Rocket,
  Clock,
  Users,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { WhatsAppConfig } from '../types/chat';
import {
  RutaActiva,
  RutaCliente,
  PLANTILLAS_BROADCAST,
  PlantillaMeta,
  subscribeToRutaActiva,
  getClientesDeRuta,
  normalizarTelefono,
  enviarPlantillaMeta,
} from '../services/broadcast';
import { sendMessageToFirestore, updateMessageMetaId } from '../services/firestore';

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: WhatsAppConfig;
  userId?: string;
}

interface EnvioEstado {
  telefono: string;
  estado: 'pendiente' | 'enviando' | 'enviado' | 'fallido';
  error?: string;
}

export const BroadcastModal: React.FC<BroadcastModalProps> = ({
  isOpen,
  onClose,
  config,
  userId = 'K8wx9X5GGOfindI1RGtIIQN3UGr1',
}) => {
  const [ruta, setRuta] = useState<RutaActiva | null>(null);
  const [cargandoRuta, setCargandoRuta] = useState(true);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<PlantillaMeta>(PLANTILLAS_BROADCAST[0]);
  const [delay, setDelay] = useState<number>(30);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [mostrarClientes, setMostrarClientes] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [estadosEnvio, setEstadosEnvio] = useState<Record<string, EnvioEstado>>({});
  const [progreso, setProgreso] = useState({ enviados: 0, fallidos: 0, total: 0 });
  const cancelarRef = useRef(false);

  // Suscribirse a ruta_activa cuando se abre el modal
  useEffect(() => {
    if (!isOpen) return;
    setCargandoRuta(true);
    const unsubscribe = subscribeToRutaActiva(
      userId,
      (rutaData) => {
        setRuta(rutaData);
        setCargandoRuta(false);
        // Seleccionar todos por defecto
        if (rutaData && rutaData.clientes) {
          const clientes = getClientesDeRuta(rutaData);
          const nuevosSeleccionados = new Set<string>();
          clientes.forEach((c) => {
            const tel = normalizarTelefono(c.cel || c.celular || c.telefono || '');
            if (tel) nuevosSeleccionados.add(tel);
          });
          setSeleccionados(nuevosSeleccionados);
        }
      },
      () => setCargandoRuta(false)
    );
    return () => unsubscribe();
  }, [isOpen, userId]);

  // Reset cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setEstadosEnvio({});
      setProgreso({ enviados: 0, fallidos: 0, total: 0 });
      setEnviando(false);
      cancelarRef.current = false;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const clientes = getClientesDeRuta(ruta);

  const toggleSeleccion = (tel: string) => {
    if (enviando) return;
    setSeleccionados((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(tel)) nuevo.delete(tel);
      else nuevo.add(tel);
      return nuevo;
    });
  };

  const seleccionarTodos = () => {
    if (enviando) return;
    const todos = new Set<string>();
    clientes.forEach((c) => {
      const tel = normalizarTelefono(c.cel || c.celular || c.telefono || '');
      if (tel) todos.add(tel);
    });
    setSeleccionados(todos);
  };

  const deseleccionarTodos = () => {
    if (enviando) return;
    setSeleccionados(new Set());
  };

  const iniciarBroadcast = async () => {
    if (seleccionados.size === 0 || enviando) return;
    setEnviando(true);
    cancelarRef.current = false;
    const total = seleccionados.size;
    setProgreso({ enviados: 0, fallidos: 0, total });

    // Inicializar estados
    const estadosIniciales: Record<string, EnvioEstado> = {};
    seleccionados.forEach((tel) => {
      estadosIniciales[tel] = { telefono: tel, estado: 'pendiente' };
    });
    setEstadosEnvio(estadosIniciales);

    let enviados = 0;
    let fallidos = 0;

    // Enviar secuencialmente con delay
    for (const tel of Array.from(seleccionados)) {
      if (cancelarRef.current) break;

      // Marcar como enviando
      setEstadosEnvio((prev) => ({
        ...prev,
        [tel]: { telefono: tel, estado: 'enviando' },
      }));

      // 🎯 Buscar los datos del cliente para enviar parámetros
      // Normalizar ambos teléfonos para que coincidan (con o sin prefijo 51)
      const telSeleccionado = normalizarTelefono(tel);

      console.log('🔍 Buscando cliente para teléfono normalizado:', telSeleccionado);
      console.log('📋 Clientes disponibles:', clientes.map(c => ({
        nombre: c.nombre,
        telOriginal: c.cel || c.celular || c.telefono,
        telNormalizado: normalizarTelefono(c.cel || c.celular || c.telefono || '')
      })));

      const clienteActual = clientes.find((c) => {
        const telCliente = normalizarTelefono(c.cel || c.celular || c.telefono || '');
        return telCliente === telSeleccionado;
      });

      console.log('👤 Cliente encontrado:', clienteActual ? {
        nombre: clienteActual.nombre,
        prod: clienteActual.prod,
        cobrar: clienteActual.cobrar,
        dir: clienteActual.dir,
        dist: clienteActual.dist
      } : 'NO ENCONTRADO - usando valores por defecto');

      // 🎯 Calcular posición del cliente en la ruta (ej: posición 13 de 15)
      const totalClientes = clientes.length;
      const posicionCliente = clienteActual
        ? clientes.findIndex(c =>
            normalizarTelefono(c.cel || c.celular || c.telefono || '') === telSeleccionado
          ) + 1
        : 0;

      console.log('📊 Posición del cliente:', posicionCliente, 'de', totalClientes);

      const resultado = await enviarPlantillaMeta(
        config, tel, plantillaSeleccionada, clienteActual,
        posicionCliente, totalClientes
      );

      if (resultado.success) {
        enviados++;

        // 💾 Guardar mensaje en Firestore para que aparezca en el panel
        if (resultado.messageId) {
          try {
            const firestoreMsgId = await sendMessageToFirestore(tel, {
              direction: 'sent',
              text: `📋 ${plantillaSeleccionada.emoji} ${plantillaSeleccionada.label} (broadcast)`,
              status: 'sent',
              timestamp: Date.now(),
              senderId: 'broadcast',
            });
            await updateMessageMetaId(tel, firestoreMsgId, resultado.messageId);
            console.log(`💾 Broadcast guardado en Firestore: ${tel}`);
          } catch (e) {
            console.warn('⚠️ Error guardando broadcast en Firestore:', e);
          }
        }

        setEstadosEnvio((prev) => ({
          ...prev,
          [tel]: { telefono: tel, estado: 'enviado' },
        }));
      } else {
        fallidos++;
        setEstadosEnvio((prev) => ({
          ...prev,
          [tel]: { telefono: tel, estado: 'fallido', error: resultado.error },
        }));
      }

      setProgreso({ enviados, fallidos, total });

      // Delay antes del siguiente (excepto el último)
      if (!cancelarRef.current && enviados + fallidos < total) {
        await new Promise((r) => setTimeout(r, delay * 1000));
      }
    }

    setEnviando(false);
  };

  const cancelarBroadcast = () => {
    cancelarRef.current = true;
    setEnviando(false);
  };

  const progresoPorcentaje = progreso.total > 0
    ? Math.round(((progreso.enviados + progreso.fallidos) / progreso.total) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Rocket className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">📢 Broadcast con Plantillas</h2>
              <p className="text-xs text-white/80">
                Envío masivo anti-baneo con Meta Cloud API
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            disabled={enviando}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Estado de ruta activa */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  Ruta activa de hoy
                </span>
              </div>
              {cargandoRuta ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              ) : (
                <span className="text-xs font-bold px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full">
                  {clientes.length} clientes
                </span>
              )}
            </div>
            {ruta?.ruta_activa?.hora_inicio && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                🕐 Hora de inicio: {ruta.ruta_activa.hora_inicio}
              </p>
            )}
            {clientes.length === 0 && !cargandoRuta && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                ⚠️ No hay clientes en la ruta activa. Carga tu Excel en RiderTrack primero.
              </p>
            )}
          </div>

          {/* Selector de plantilla */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block uppercase tracking-wide">
              📋 Plantilla aprobada
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PLANTILLAS_BROADCAST.map((p) => (
                <button
                  key={p.name}
                  onClick={() => setPlantillaSeleccionada(p)}
                  disabled={enviando}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    plantillaSeleccionada.name === p.name
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  } ${enviando ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{p.emoji}</span>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                      {p.label}
                    </span>
                    {plantillaSeleccionada.name === p.name && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {p.descripcion}
                  </p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                    {p.name} ✅
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Delay anti-baneo */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block uppercase tracking-wide">
              ⏱️ Delay entre mensajes (anti-baneo)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[10, 30, 60, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setDelay(d)}
                  disabled={enviando}
                  className={`p-2.5 rounded-xl border-2 font-bold text-sm transition-all ${
                    delay === d
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                  } ${enviando ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {d}s
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Recomendado: 30s para evitar bloqueos de Meta
            </p>
          </div>

          {/* Selección de clientes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setMostrarClientes(!mostrarClientes)}
                className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide"
              >
                {mostrarClientes ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                👥 Clientes ({seleccionados.size}/{clientes.length} seleccionados)
              </button>
              <div className="flex gap-1.5">
                <button
                  onClick={seleccionarTodos}
                  disabled={enviando || clientes.length === 0}
                  className="text-[11px] px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg font-semibold hover:bg-emerald-200 disabled:opacity-50"
                >
                  ✅ Todos
                </button>
                <button
                  onClick={deseleccionarTodos}
                  disabled={enviando}
                  className="text-[11px] px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg font-semibold hover:bg-slate-200 disabled:opacity-50"
                >
                  ❌ Ninguno
                </button>
              </div>
            </div>

            {mostrarClientes && (
              <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
                {clientes.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    {cargandoRuta ? 'Cargando clientes...' : 'No hay clientes en la ruta'}
                  </div>
                ) : (
                  clientes.map((c, i) => {
                    const tel = normalizarTelefono(c.cel || c.celular || c.telefono || '');
                    const isSelected = seleccionados.has(tel);
                    const estado = estadosEnvio[tel];
                    return (
                      <div
                        key={`${c.id || i}-${tel}`}
                        className={`flex items-center gap-3 p-2.5 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-emerald-50/50 dark:bg-emerald-900/10'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        } ${enviando ? 'cursor-not-allowed' : ''}`}
                        onClick={() => toggleSeleccion(tel)}
                      >
                        <div className="shrink-0">
                          {estado?.estado === 'enviado' ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : estado?.estado === 'enviando' ? (
                            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                          ) : estado?.estado === 'fallido' ? (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          ) : isSelected ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-400">
                              {i + 1}.
                            </span>
                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                              {c.nombre || 'Cliente'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            <span>📱 {tel}</span>
                            {c.dir && (
                              <span className="truncate">· 📍 {c.dir.substring(0, 30)}</span>
                            )}
                          </div>
                          {estado?.estado === 'fallido' && estado.error && (
                            <div className="text-[11px] text-red-600 dark:text-red-400 mt-1 p-2 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-800 break-all">
                              ❌ {estado.error}
                            </div>
                          )}
                        </div>
                        {c.cobrar !== undefined && c.cobrar > 0 && (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                            S/ {c.cobrar.toFixed(2)}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Progreso durante el envío */}
          {enviando || progreso.total > 0 ? (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                  📊 Progreso del broadcast
                </span>
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                  {progreso.enviados + progreso.fallidos}/{progreso.total}
                </span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progresoPorcentaje}%` }}
                />
              </div>
              <div className="flex items-center gap-4 mt-2 text-[11px]">
                <span className="text-emerald-600 dark:text-emerald-400">
                  ✅ {progreso.enviados} enviados
                </span>
                <span className="text-red-600 dark:text-red-400">
                  ❌ {progreso.fallidos} fallidos
                </span>
                <span className="text-blue-600 dark:text-blue-400">
                  {progresoPorcentaje}%
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer con botón de envío */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {seleccionados.size > 0 ? (
              <>
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {seleccionados.size} clientes
                </span>{' '}
                seleccionados · ~{Math.ceil((seleccionados.size * delay) / 60)} min total
              </>
            ) : (
              'Selecciona al menos 1 cliente'
            )}
          </div>
          <div className="flex gap-2">
            {enviando ? (
              <button
                onClick={cancelarBroadcast}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-md transition-all active:scale-95 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Detener
              </button>
            ) : (
              <button
                onClick={iniciarBroadcast}
                disabled={seleccionados.size === 0 || clientes.length === 0}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                <Send className="w-4 h-4" />
                🚀 Iniciar Broadcast
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
