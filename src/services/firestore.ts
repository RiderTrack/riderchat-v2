import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { Chat, FirestoreErrorInfo, Message, MessageStatus } from '../types/chat';
import { localCache } from './local-cache';

// Firebase config del proyecto REAL de Rudy (ridertrack-93c8a)
// Mismo proyecto que RiderTrack Modular y TrackVerse Panel
const firebaseConfig = {
  apiKey: "AIzaSyAzDl7gaS40JoXt9OoCPzG9FyaVPz_O34I",
  authDomain: "ridertrack-93c8a.firebaseapp.com",
  projectId: "ridertrack-93c8a",
  storageBucket: "ridertrack-93c8a.firebasestorage.app",
  messagingSenderId: "851606828420",
  appId: "1:851606828420:web:873a892a091394693e59d1"
};

let app;
let db: ReturnType<typeof getFirestore> | null = null;
let isFirestoreAvailable = false;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
  isFirestoreAvailable = true;
} catch (e) {
  console.warn('Firestore initialization fallback to local mock store mode:', e);
  isFirestoreAvailable = false;
}

export { db, isFirestoreAvailable };

function handleFirestoreError(
  error: unknown,
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write',
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
}

// -------------------------------------------------------------
// In-Memory Mock Store with Listeners for Fallback / Offline
// -------------------------------------------------------------
let mockChats: Chat[] = localCache.getOfflineChats();
let mockMessages: Record<string, Message[]> = {};

// Load offline messages for existing chats
mockChats.forEach((chat) => {
  mockMessages[chat.clientPhone] = localCache.getOfflineMessages(chat.clientPhone);
});

const chatListeners = new Set<(chats: Chat[]) => void>();
const messageListeners: Record<string, Set<(msgs: Message[]) => void>> = {};

function notifyChatListeners() {
  localCache.saveOfflineChats(mockChats);
  chatListeners.forEach((fn) => fn([...mockChats]));
}

function notifyMessageListeners(phone: string) {
  if (mockMessages[phone]) {
    localCache.saveOfflineMessages(phone, mockMessages[phone]);
    messageListeners[phone]?.forEach((fn) => fn([...mockMessages[phone]]));
  }
}

// Initial seed mock data generator
export function seedInitialData() {
  if (mockChats.length > 0) return;

  const now = Date.now();
  const initialChats: Chat[] = [
    {
      clientPhone: '51987654321',
      clientName: 'Carlos Mendoza (Miraflores)',
      lastMessage: '🛵 ¿En cuántos minutos llega el pedido de la hamburguesa?',
      lastMessageTime: now - 5 * 60 * 1000,
      lastMessageType: 'text',
      unreadCount: 2,
      status: 'active',
      createdAt: now - 2 * 3600 * 1000,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      tags: ['Prioritario', 'Miraflores', 'Yape'],
      notes: 'Edificio Residencial Las Flores, Dpto 402. Tocar timbre 4B.',
    },
    {
      clientPhone: '51912345678',
      clientName: 'María Fernanda Ruiz',
      lastMessage: 'Te acabo de enviar la captura del Yape por S/ 45.50. ¡Gracias!',
      lastMessageTime: now - 25 * 60 * 1000,
      lastMessageType: 'image',
      unreadCount: 0,
      status: 'active',
      createdAt: now - 5 * 3600 * 1000,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      tags: ['San Isidro', 'Pagado Yape'],
      notes: 'Dejar en recepción con el vigilante Don Pedro.',
    },
    {
      clientPhone: '51998877665',
      clientName: 'Jorge ' + 'López' + ' (Restaurante Pollería)',
      lastMessage: 'Hola Rider, el pedido ya está empaquetado en barra. Puedes retirarlo.',
      lastMessageTime: now - 2 * 3600 * 1000,
      lastMessageType: 'text',
      unreadCount: 0,
      status: 'active',
      createdAt: now - 24 * 3600 * 1000,
      tags: ['Local Comida', 'Surco'],
    },
    {
      clientPhone: '51955443322',
      clientName: 'Lucía Benavides',
      lastMessage: 'Confirmado, recibido sin problemas. Muchas gracias por la rapidez. ⭐',
      lastMessageTime: now - 18 * 3600 * 1000,
      lastMessageType: 'text',
      unreadCount: 0,
      status: 'closed',
      createdAt: now - 48 * 3600 * 1000,
      tags: ['Entregado', 'San Borja'],
    },
  ];

  mockChats = initialChats;

  mockMessages['51987654321'] = [
    {
      id: 'm1',
      direction: 'received',
      text: '¡Hola Rider! Buenas tardes. Quisiera saber si ya saliste del local.',
      status: 'read',
      timestamp: now - 12 * 60 * 1000,
      senderId: 'client',
    },
    {
      id: 'm2',
      direction: 'sent',
      text: '¡Hola Carlos! Sí, justamente acabo de retirar tu pedido del restaurante.',
      status: 'read',
      timestamp: now - 10 * 60 * 1000,
      senderId: 'rider-meta',
    },
    {
      id: 'm3',
      direction: 'received',
      text: '🛵 ¿En cuántos minutos llega el pedido de la hamburguesa?',
      status: 'delivered',
      timestamp: now - 5 * 60 * 1000,
      senderId: 'client',
    },
  ];

  mockMessages['51912345678'] = [
    {
      id: 'm10',
      direction: 'sent',
      text: 'Hola María Fernanda, el monto final con delivery es S/ 45.50. Me indicas si abonas por Yape o Plin.',
      status: 'read',
      timestamp: now - 35 * 60 * 1000,
      senderId: 'rider-meta',
    },
    {
      id: 'm11',
      direction: 'received',
      text: 'Te acabo de enviar la captura del Yape por S/ 45.50. ¡Gracias!',
      media: {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1556742049-0a67d9f783cb?w=600&auto=format&fit=crop&q=80',
        caption: 'Comprobante Yape S/ 45.50',
      },
      status: 'read',
      timestamp: now - 25 * 60 * 1000,
      senderId: 'client',
    },
    {
      id: 'm12',
      direction: 'sent',
      text: '¡Conforme! Comprobante verificado. Voy rumbo a San Isidro.',
      status: 'read',
      timestamp: now - 20 * 60 * 1000,
      senderId: 'rider-meta',
    },
  ];

  notifyChatListeners();
}

seedInitialData();

// -------------------------------------------------------------
// Real-Time Firestore / Mock Hybrid Services
// -------------------------------------------------------------

/**
 * Subscribes to real-time chat updates (Collection: chats)
 */
export function subscribeToChats(
  onUpdate: (chats: Chat[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (db) {
    try {
      const chatsRef = collection(db, 'chats');
      const q = query(chatsRef, orderBy('lastMessageTime', 'desc'), limit(100));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const chats: Chat[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              clientPhone: d.id,
              clientName: data.clientName || 'Cliente WhatsApp',
              lastMessage: data.lastMessage || '',
              lastMessageTime: data.lastMessageTime?.toMillis ? data.lastMessageTime.toMillis() : (data.lastMessageTime || Date.now()),
              lastMessageType: data.lastMessageType || 'text',
              unreadCount: data.unreadCount || 0,
              status: data.status || 'active',
              createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now()),
              avatar: data.avatar,
              tags: data.tags || [],
              notes: data.notes || '',
            };
          });
          onUpdate(chats);
          localCache.saveOfflineChats(chats);
        },
        (error) => {
          handleFirestoreError(error, 'list', 'chats');
          if (onError) onError(error);
          // Fall back to mock listeners on error
          chatListeners.add(onUpdate);
          onUpdate(mockChats);
        }
      );

      return unsubscribe;
    } catch (e: any) {
      console.warn('Using mock chat store for sub:', e);
    }
  }

  // Fallback in-memory subscription
  chatListeners.add(onUpdate);
  onUpdate([...mockChats]);

  return () => {
    chatListeners.delete(onUpdate);
  };
}

/**
 * Subscribes to real-time messages for a specific client (Collection: chats/{clientPhone}/messages)
 */
export function subscribeToMessages(
  clientPhone: string,
  onUpdate: (messages: Message[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!clientPhone) {
    onUpdate([]);
    return () => {};
  }

  if (db) {
    try {
      const messagesRef = collection(db, 'chats', clientPhone, 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(200));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const msgs: Message[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              direction: data.direction || 'sent',
              text: data.text || '',
              media: data.media,
              status: data.status || 'sent',
              timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : (data.timestamp || Date.now()),
              senderId: data.senderId || 'meta-api',
              errorMessage: data.errorMessage,
              templateName: data.templateName,
            };
          });
          onUpdate(msgs);
          localCache.saveOfflineMessages(clientPhone, msgs);
        },
        (error) => {
          handleFirestoreError(error, 'list', `chats/${clientPhone}/messages`);
          if (onError) onError(error);
          // Fallback to mock message store
          if (!messageListeners[clientPhone]) {
            messageListeners[clientPhone] = new Set();
          }
          messageListeners[clientPhone].add(onUpdate);
          onUpdate(mockMessages[clientPhone] || []);
        }
      );

      return unsubscribe;
    } catch (e) {
      console.warn('Using mock messages for sub:', e);
    }
  }

  // Fallback in-memory subscription
  if (!messageListeners[clientPhone]) {
    messageListeners[clientPhone] = new Set();
  }
  messageListeners[clientPhone].add(onUpdate);
  onUpdate(mockMessages[clientPhone] || []);

  return () => {
    messageListeners[clientPhone]?.delete(onUpdate);
  };
}

/**
 * Adds a new message into Firestore or mock state
 */
export async function sendMessageToFirestore(
  clientPhone: string,
  message: Omit<Message, 'id'> & { id?: string }
): Promise<string> {
  const msgId = message.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const fullMsg: Message = {
    ...message,
    id: msgId,
  };

  // 1. Update Firestore if connected
  if (db) {
    try {
      const msgDocRef = doc(db, 'chats', clientPhone, 'messages', msgId);
      await setDoc(msgDocRef, {
        direction: message.direction,
        text: message.text,
        media: message.media || null,
        status: message.status,
        timestamp: serverTimestamp(),
        senderId: message.senderId,
        errorMessage: message.errorMessage || null,
      });

      // Update parent chat doc
      const chatDocRef = doc(db, 'chats', clientPhone);
      await setDoc(
        chatDocRef,
        {
          lastMessage: message.text || (message.media ? `[${message.media.type.toUpperCase()}]` : ''),
          lastMessageTime: serverTimestamp(),
          lastMessageType: message.media ? message.media.type : 'text',
        },
        { merge: true }
      );
    } catch (error) {
      handleFirestoreError(error, 'write', `chats/${clientPhone}/messages/${msgId}`);
    }
  }

  // 2. Always update local mock state for instant sync & offline backup
  if (!mockMessages[clientPhone]) {
    mockMessages[clientPhone] = [];
  }
  mockMessages[clientPhone].push(fullMsg);
  notifyMessageListeners(clientPhone);

  const existingChatIdx = mockChats.findIndex((c) => c.clientPhone === clientPhone);
  if (existingChatIdx !== -1) {
    mockChats[existingChatIdx].lastMessage = message.text || (message.media ? `[${message.media.type}]` : '');
    mockChats[existingChatIdx].lastMessageTime = message.timestamp;
    mockChats[existingChatIdx].lastMessageType = message.media ? message.media.type : 'text';
    if (message.direction === 'received') {
      mockChats[existingChatIdx].unreadCount += 1;
    }
    // Sort chats by recent
    mockChats.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
    notifyChatListeners();
  }

  return msgId;
}

/**
 * Updates a message status ('pending' | 'sent' | 'delivered' | 'read' | 'failed')
 */
export async function updateMessageStatus(
  clientPhone: string,
  messageId: string,
  status: MessageStatus,
  errorMessage?: string
): Promise<void> {
  if (db) {
    try {
      const msgRef = doc(db, 'chats', clientPhone, 'messages', messageId);
      await updateDoc(msgRef, {
        status,
        ...(errorMessage ? { errorMessage } : {}),
      });
    } catch (e) {
      handleFirestoreError(e, 'update', `chats/${clientPhone}/messages/${messageId}`);
    }
  }

  // Update local mock
  const msgs = mockMessages[clientPhone];
  if (msgs) {
    const target = msgs.find((m) => m.id === messageId);
    if (target) {
      target.status = status;
      if (errorMessage) target.errorMessage = errorMessage;
      notifyMessageListeners(clientPhone);
    }
  }
}

/**
 * Marks all messages in a chat as read & resets unread count
 */
export async function markChatAsRead(clientPhone: string): Promise<void> {
  if (db) {
    try {
      const chatRef = doc(db, 'chats', clientPhone);
      await updateDoc(chatRef, { unreadCount: 0 });
    } catch (e) {
      handleFirestoreError(e, 'update', `chats/${clientPhone}`);
    }
  }

  const chat = mockChats.find((c) => c.clientPhone === clientPhone);
  if (chat && chat.unreadCount > 0) {
    chat.unreadCount = 0;
    notifyChatListeners();
  }
}

/**
 * Creates a new chat or updates metadata
 */
export async function createOrUpdateChat(chatData: Partial<Chat> & { clientPhone: string; clientName: string }): Promise<void> {
  const { clientPhone, clientName, status = 'active', tags = [], notes = '' } = chatData;

  const now = Date.now();

  if (db) {
    try {
      const chatRef = doc(db, 'chats', clientPhone);
      await setDoc(
        chatRef,
        {
          clientName,
          clientPhone,
          status,
          tags,
          notes,
          unreadCount: 0,
          createdAt: serverTimestamp(),
          lastMessage: 'Chat creado',
          lastMessageTime: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (e) {
      handleFirestoreError(e, 'write', `chats/${clientPhone}`);
    }
  }

  const existingIdx = mockChats.findIndex((c) => c.clientPhone === clientPhone);
  if (existingIdx !== -1) {
    mockChats[existingIdx] = {
      ...mockChats[existingIdx],
      clientName,
      status,
      tags,
      notes,
    };
  } else {
    const newChat: Chat = {
      clientPhone,
      clientName,
      lastMessage: 'Chat creado',
      lastMessageTime: now,
      unreadCount: 0,
      status,
      createdAt: now,
      tags,
      notes,
    };
    mockChats.unshift(newChat);
    mockMessages[clientPhone] = [];
  }

  notifyChatListeners();
}

/**
 * Simulates receiving a WhatsApp customer reply (for interactive demo / webhook testing)
 */
export function simulateIncomingCustomerMessage(
  clientPhone: string,
  text: string,
  media?: Message['media']
) {
  const msg: Omit<Message, 'id'> = {
    direction: 'received',
    text,
    media,
    status: 'read',
    timestamp: Date.now(),
    senderId: 'client',
  };

  sendMessageToFirestore(clientPhone, msg);
}
