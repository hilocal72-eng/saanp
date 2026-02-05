
export const LADDERS: Record<number, number> = {
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
  62: 19,
  87: 24,
  95: 75
};

export const GRID_SIZE = 10;
export const BOARD_CELLS = 100;

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

// Added Sticker interface and constant data for Marketplace
export interface Sticker {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
}

export const STICKERS: Sticker[] = [
  { id: 's1', name: 'Cool Cat', price: 50, category: 'Emotes', image: 'https://cdn-icons-png.flaticon.com/512/2358/2358580.png' },
  { id: 's2', name: 'Angry Snake', price: 100, category: 'Enemies', image: 'https://cdn-icons-png.flaticon.com/512/2413/2413155.png' },
  { id: 's3', name: 'Golden Trophy', price: 500, category: 'Victory', image: 'https://cdn-icons-png.flaticon.com/512/3112/3112946.png' },
  { id: 's4', name: 'Rocket Ship', price: 200, category: 'Power-ups', image: 'https://cdn-icons-png.flaticon.com/512/1043/1043444.png' },
  { id: 's5', name: 'Party Popper', price: 75, category: 'Emotes', image: 'https://cdn-icons-png.flaticon.com/512/5110/5110996.png' },
  { id: 's6', name: 'Crying Face', price: 30, category: 'Emotes', image: 'https://cdn-icons-png.flaticon.com/512/1791/1791330.png' }
];
