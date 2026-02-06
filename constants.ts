
// BOARD_CELLS defines the maximum number of spaces on the board.
export const BOARD_CELLS = 100;

// LADDERS defines jumps from a starting cell to a higher ending cell.
export const LADDERS: Record<number, number> = {
  4: 25,
  13: 46,
  33: 49,
  50: 69,
};

// SNAKES defines drops from a starting cell to a lower ending cell.
export const SNAKES: Record<number, number> = {
  27: 5,
  40: 3,
  76: 41,
  99: 10,
};

// Sound Assets - Optimized for clean "tap" movement and game outcomes.
export const SOUNDS = {
  MOVE: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', // Clean "tap" sound
  LADDER: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
  SNAKE: 'https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3',
  WIN: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  LOSS: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
};

// Sticker interface for store items.
export interface Sticker {
  id: string;
  name: string;
  price: number;
  image: string;
}

// STICKERS provides a collection of purchaseable items for the MarketTab.
export const STICKERS: Sticker[] = [
  {
    id: 'Hi',
    name: 'Hi',
    price: 100,
    image: 'https://cdn-icons-png.flaticon.com/256/7075/7075106.png'
  },
  {
    id: 'No',
    name: 'No',
    price: 200,
    image: 'https://cdn-icons-png.flaticon.com/256/7075/7075109.png'
  },
  {
    id: 'Break',
    name: 'Need Break !',
    price: 250,
    image: 'https://cdn-icons-png.flaticon.com/256/7418/7418828.png'
  },
  {
    id: 'Suprise ',
    name: 'Suprise ',
    price: 500,
    image: 'https://cdn-icons-png.flaticon.com/256/9217/9217826.png'
  },
  {
    id: 'Hello',
    name: 'Hello',
    price: 300,
    image: 'https://cdn-icons-png.flaticon.com/256/6143/6143312.png'
  },
  {
    id: 'Angry ',
    name: 'Angry ',
    price: 200,
    image: 'https://cdn-icons-png.flaticon.com/256/7075/7075100.png'
  },
  {
    id: 'Miss You',
    name: 'Miss You',
    price: 100,
    image: 'https://cdn-icons-png.flaticon.com/256/8771/8771565.png'
  },
  {
    id: 'Bandage sticker',
    name: 'Bandage sticker',
    price: 100,
    image: 'https://cdn-icons-png.flaticon.com/256/8771/8771678.png'
  },
  {
    id: 'Break up ',
    name: 'Break up ',
    price: 150,
    image: 'https://cdn-icons-png.flaticon.com/256/6084/6084739.png'
  },
  {
    id: 'Flowers',
    name: 'Flowers',
    price: 150,
    image: 'https://cdn-icons-png.flaticon.com/256/6843/6843610.png'
  },
  {
    id: 'In love ',
    name: 'In love ',
    price: 300,
    image: 'https://cdn-icons-png.flaticon.com/256/10443/10443856.png'
  },
  {
    id: 'Girl ',
    name: 'Girl ',
    price: 200,
    image: 'https://cdn-icons-png.flaticon.com/256/7409/7409945.png'
  },
  {
    id: 'Lets_Dance',
    name: "Let's Dance",
    price: 100,
    image: 'https://cdn-icons-png.flaticon.com/256/7592/7592472.png'
  },
  {
    id: 'Thinking ',
    name: 'Thinking ',
    price: 200,
    image: 'https://cdn-icons-png.flaticon.com/256/6437/6437442.png'
  },
  {
    id: 'Yes !',
    name: 'Yes !',
    price: 250,
    image: 'https://cdn-icons-png.flaticon.com/256/6431/6431343.png'
  },
  {
    id: 'No_alt',
    name: 'No',
    price: 150,
    image: 'https://cdn-icons-png.flaticon.com/256/7075/7075109.png'
  },
  {
    id: 'Happy birthday ',
    name: 'Happy birthday ',
    price: 200,
    image: 'https://cdn-icons-png.flaticon.com/256/10943/10943968.png'
  },
  {
    id: 'Shock ',
    name: 'Shock ',
    price: 200,
    image: 'https://cdn-icons-png.flaticon.com/256/7641/7641912.png'
  },
  {
    id: 'Sleep ',
    name: 'Sleep ',
    price: 100,
    image: 'https://cdn-icons-png.flaticon.com/256/9754/9754991.png'
  },
  {
    id: 'WTF ?',
    name: 'WTF ?',
    price: 200,
    image: 'https://cdn-icons-png.flaticon.com/256/4524/4524559.png'
  }
];

// AIRTABLE_CONFIG holds the keys and table names for database interactions.
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
