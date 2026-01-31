
export const LADDERS: Record<number, number> = {
  2: 38,
  7: 14,
  8: 31,
  15: 26,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  78: 98,
  87: 94
};

export const SNAKES: Record<number, number> = {
  16: 6,
  46: 25,
  49: 11,
  62: 19,
  64: 60,
  74: 53,
  89: 68,
  92: 88,
  95: 75,
  99: 80
};

export const GRID_SIZE = 10;
export const BOARD_CELLS = 100;

/**
 * AIRTABLE CONFIGURATION
 * 
 * REQUIRED SCHEMA (Create these tables in your Airtable base):
 * 
 * Users Table:
 * - name (Single line text)
 * - age (Number)
 * - gender (Single line text)
 * - lastSeen (Number)
 * - wins (Number)    <-- ADD THIS
 * - losses (Number)  <-- ADD THIS
 * 
 * Friends Table:
 * - user1Id (Single line text)
 * - user2Id (Single line text)
 * - status (Single line text)
 * 
 * Messages Table:
 * - senderId (Single line text)
 * - receiverId (Single line text)
 * - text (Long text)
 * - timestamp (Number)
 * 
 * Games Table:
 * - code (Single line text)
 * - hostId (Single line text)
 * - guestId (Single line text)
 * - hostPos (Number)
 * - guestPos (Number)
 * - turn (Single line text)
 * - winner (Single line text)
 * - lastDice (Number)
 * - lastUpdated (Number)
 */
export const AIRTABLE_CONFIG = {
  API_KEY: "pat9zUDjx4nzVLsG8.6b1c84f72870eab1f2c3f5dacc26103ab6c96f1a8c3981bc2b181948cdc6e6c1",
  BASE_ID: "appYYxC9Aeb0DIodj",
  TABLES: {
    USERS: "Users",
    FRIENDS: "Friends",
    MESSAGES: "Messages",
    GAMES: "Games"
  }
};
