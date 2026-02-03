
export type Gender = 'male' | 'female';

export interface UserProfile {
  id?: string;
  uniqueId: string;
  name: string;
  pin: string;
  gender: Gender;
  avatarUrl?: string; // Base64 encoded compressed image
  lastSeen?: number; // Timestamp
  wins?: number;
  losses?: number;
}

export interface Friend {
  id: string;
  name: string;
  uniqueId: string;
  status: 'pending' | 'accepted';
  lastSeen?: number;
  unreadCount?: number;
  lastMessageTimestamp?: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
}

export interface GameState {
  id?: string;
  code: string;
  hostId: string;
  guestId?: string;
  hostPos: number;
  guestPos: number;
  turn: 'host' | 'guest';
  winner?: string;
  lastDice: number;
  hostLastDice?: number;
  guestLastDice?: number;
  hostReaction?: string; // e.g., "🤣|timestamp"
  guestReaction?: string; // e.g., "🐍|timestamp"
  lastUpdated?: number;
}

export enum Tab {
  PROFILE = 'profile',
  FRIENDS = 'friends',
  GAME = 'game'
}
