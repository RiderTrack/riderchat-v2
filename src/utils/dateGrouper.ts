import { Message } from '../types/chat';

export interface DateGroupedMessages {
  dateLabel: string;
  messages: Message[];
}

/**
 * Groups messages chronologically by human-readable dates ('Hoy', 'Ayer', '12 ago', etc.)
 */
export function groupMessagesByDate(messages: Message[]): DateGroupedMessages[] {
  if (!messages || messages.length === 0) return [];

  const groups: { [key: string]: Message[] } = {};

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  messages.forEach((msg) => {
    const msgDate = new Date(msg.timestamp);
    msgDate.setHours(0, 0, 0, 0);

    let dateLabel = '';

    if (msgDate.getTime() === today.getTime()) {
      dateLabel = 'Hoy';
    } else if (msgDate.getTime() === yesterday.getTime()) {
      dateLabel = 'Ayer';
    } else {
      const isSameYear = msgDate.getFullYear() === today.getFullYear();
      const options: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'short',
        ...(isSameYear ? {} : { year: 'numeric' }),
      };
      dateLabel = msgDate.toLocaleDateString('es-PE', options);
    }

    if (!groups[dateLabel]) {
      groups[dateLabel] = [];
    }
    groups[dateLabel].push(msg);
  });

  return Object.keys(groups).map((dateLabel) => ({
    dateLabel,
    messages: groups[dateLabel],
  }));
}
