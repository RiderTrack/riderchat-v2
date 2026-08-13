export type MessageDirection = 'sent' | 'received';

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export type ChatStatus = 'active' | 'closed' | 'blocked';

export type MediaType = 'image' | 'video' | 'audio' | 'document' | 'location';

export interface MessageMedia {
  type: MediaType;
  url: string;
  caption?: string;
  fileName?: string;
  fileSize?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
}

export interface Message {
  id: string;
  direction: MessageDirection;
  text: string;
  media?: MessageMedia;
  status: MessageStatus;
  timestamp: number; // Unix timestamp in ms
  senderId: string; // rider ID or 'meta-api' or client name
  errorMessage?: string;
  templateName?: string;
  replyToId?: string;
}

export interface Chat {
  clientPhone: string; // Unique ID (e.g., '51987654321')
  clientName: string;
  lastMessage: string;
  lastMessageTime: number; // Unix timestamp in ms
  lastMessageType?: MediaType | 'text';
  unreadCount: number;
  status: ChatStatus;
  createdAt: number;
  avatar?: string;
  tags?: string[];
  notes?: string;
  isTyping?: boolean;
}

export interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  businessAccountId?: string;
  webhookVerifyToken?: string;
  mockMode: boolean;
}

export interface QuickTemplate {
  id: string;
  title: string;
  category: 'delivery' | 'greeting' | 'issue' | 'payment' | 'location';
  content: string;
  variables?: string[];
}

export interface ChatFilterOptions {
  search: string;
  status: 'all' | 'active' | 'closed' | 'blocked';
  sortBy: 'recent' | 'unread';
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo?: {
    userId?: string | null;
    email?: string | null;
  };
}
