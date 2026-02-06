
export type Gender = 'male' | 'female';

export interface UserProfile {
  id?: string;
  uniqueId: string;
  name: string;
  pin: string;
  gender: Gender;
  avatarUrl?: string;
  lastSeen?: number;
  wins?: number;
  losses?: number;
  coins?: number;
  ownedStickers?: string[];
  favouriteStickers?: string[];
}

export interface Friend {
  id: string;
  name: string;
  uniqueId: string;
  status: 'accepted' | 'pending';
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
  hostReaction?: string;
  guestReaction?: string;
  lastUpdated?: number;
  turnAt?: number; 
  isBotGame?: boolean;
}

export enum Tab {
  PROFILE = 'profile',
  FRIENDS = 'friends',
  GAME = 'game',
  SHOP = 'shop'
}
