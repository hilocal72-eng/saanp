
export type Gender = 'male' | 'female' | 'other';

export interface UserProfile {
  id?: string;
  uniqueId: string;
  name: string;
  age: number;
  gender: Gender;
}

export interface Friend {
  id: string;
  name: string;
  uniqueId: string;
  status: 'pending' | 'accepted';
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
}

export interface GameState {
  code: string;
  hostId: string;
  guestId?: string;
  hostPos: number;
  guestPos: number;
  turn: 'host' | 'guest';
  winner?: string;
  lastDice: number;
}

export enum Tab {
  PROFILE = 'profile',
  FRIENDS = 'friends',
  GAME = 'game'
}
