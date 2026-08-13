# RiderChat V2 - Panel WhatsApp API

Panel profesional para enviar y recibir mensajes de WhatsApp mediante la API oficial de Meta Cloud API.

## 🚀 Características

- ✅ Conexión a Meta WhatsApp Cloud API (oficial)
- ✅ Sincronización en tiempo real con Firestore
- ✅ Modo offline (funciona sin conexión)
- ✅ Plantillas rápidas personalizadas
- ✅ Soporte multimedia (imagen, audio, documento, ubicación)
- ✅ Indicadores de estado (enviado, entregado, leído)
- ✅ Modo simulación para pruebas

## 🔧 Configuración

### 1. Despliegue automático (GitHub Pages)

Al hacer push al repo, GitHub Actions compila y publica automáticamente la app en:
```
https://TU-USUARIO.github.io/riderchat-v2/
```

### 2. Configuración de Meta API

Una vez abierta la app, ir al botón ⚙️ Configuración e ingresar:

- **Phone Number ID**: `1272517762604297` (precargado)
- **Access Token**: El token de Meta (empieza con `EAAZ...`)
- **Modo simulación**: Apagar cuando tengas el token real

### 3. Webhook (para recibir mensajes)

Configurar en Meta Developers:
- **URL del webhook**: `https://bot.trackverse.cloud/webhook` (cuando se levante el baneo del VPS)
- **Verify Token**: `trackverse2026`

## 📋 Colecciones de Firestore

- `chats` - Lista de conversaciones
  - `{clientPhone}` - Documento por cliente
    - `messages` - Subcolección de mensajes
      - `{messageId}` - Cada mensaje

## 🛠 Desarrollo local

```bash
npm install --legacy-peer-deps
npm run dev
```

Abre `http://localhost:3000`

## 📦 Build

```bash
npm run build
```

Genera la carpeta `dist/` lista para deploy.
