
export const LADDERS: Record<number, number> = {
  1: 38,
  4: 14,
  9: 31,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  80: 100
};

export const SNAKES: Record<number, number> = {
  16: 6,
  47: 26,
  49: 11,
  56: 53,
  62: 19,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  98: 78
};

export const GRID_SIZE = 10;
export const BOARD_CELLS = 100;

/**
 * AIRTABLE CONFIGURATION
 * 
 * Users Table: name, age, gender, lastSeen, wins, losses
 * Friends Table: user1Id, user2Id, status
 * Messages Table: senderId, receiverId, text, timestamp
 * Games Table: code, hostId, guestId, hostPos, guestPos, turn, winner, lastDice, lastUpdated
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
