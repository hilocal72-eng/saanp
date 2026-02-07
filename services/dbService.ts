
import { UserProfile, Friend, ChatMessage, GameState } from '../types';
import { AIRTABLE_CONFIG } from '../constants';

const STORAGE_KEY = 'snake_quest_db';

const clean = (str: string) => str.replace(/'/g, "\\'");

const airtableFetch = async (tableName: string, options: RequestInit = {}) => {
  const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.BASE_ID}/${tableName}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${AIRTABLE_CONFIG.API_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const message = err.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(message);
    }
    return response.json();
  } catch (e: any) {
    if (e.name === 'TypeError' && e.message === 'Failed to fetch') {
      console.warn(`Network error fetching ${tableName}. Backend may be unreachable.`);
      return { records: [] };
    }
    console.error(`Airtable Error [${url}]:`, e.message);
    throw e;
  }
};

const getLocalDB = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : { users: [], friends: [], chats: [], games: [] };
};

const saveLocalDB = (db: any) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
};

const parseGame = (record: any): GameState => {
  const f = record.fields;
  const guestId = f.guestId ? String(f.guestId) : undefined;
  return {
    id: record.id,
    code: String(f.code || ''),
    hostId: String(f.hostId || ''),
    guestId: guestId,
    hostPos: Number(f.hostPos) || 1,
    guestPos: Number(f.guestPos) || 1,
    hostLandingPos: f.hostLandingPos !== undefined ? Number(f.hostLandingPos) : undefined,
    guestLandingPos: f.guestLandingPos !== undefined ? Number(f.guestLandingPos) : undefined,
    turn: (f.turn === 'guest' ? 'guest' : 'host') as 'host' | 'guest',
    winner: f.winner ? String(f.winner) : undefined,
    lastDice: Number(f.lastDice) || 0,
    hostLastDice: Number(f.hostLastDice) || 0,
    guestLastDice: Number(f.guestLastDice) || 0,
    hostReaction: f.hostReaction ? String(f.hostReaction) : undefined,
    guestReaction: f.guestReaction ? String(f.guestReaction) : undefined,
    lastUpdated: f.lastUpdated ? Number(f.lastUpdated) : undefined,
    isBotGame: guestId === "FoxyBot"
  };
};

export const dbService = {
  findPlayerGlobal: async (username: string): Promise<UserProfile | null> => {
    if (!username) return null;
    try {
      const formula = `{name}='${clean(username)}'`;
      const data = await airtableFetch(`${AIRTABLE_CONFIG.TABLES.USERS}?filterByFormula=${encodeURIComponent(formula)}`);
      if (data.records && data.records.length > 0) {
        const f = data.records[0].fields;
        return { 
          id: data.records[0].id, 
          uniqueId: String(f.name),
          name: String(f.name),
          pin: f.pin !== undefined && f.pin !== null ? String(f.pin) : '',
          gender: f.gender,
          avatarUrl: f.avatarUrl ? String(f.avatarUrl) : undefined,
          lastSeen: f.lastSeen,
          wins: Number(f.wins || 0),
          losses: Number(f.losses || 0),
          coins: Number(f.coins || 0),
          ownedStickers: f.ownedStickers ? String(f.ownedStickers).split(',').filter(Boolean) : [],
          favouriteStickers: f.favouriteStickers ? String(f.favouriteStickers).split(',').filter(Boolean) : []
        } as UserProfile;
      }
      return null;
    } catch (e) { return null; }
  },

  updateLastSeen: async (username: string) => {
    try {
      const user = await dbService.findPlayerGlobal(username);
      if (user && user.id) {
        await airtableFetch(`${AIRTABLE_CONFIG.TABLES.USERS}/${user.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ fields: { lastSeen: Date.now() } })
        });
      }
    } catch (e) {}
  },

  updateAvatar: async (userId: string, avatarUrl: string) => {
    await airtableFetch(`${AIRTABLE_CONFIG.TABLES.USERS}/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ fields: { avatarUrl } })
    });
  },

  incrementStats: async (username: string, isWin: boolean, isBotGame: boolean = false) => {
    try {
      const user = await dbService.findPlayerGlobal(username);
      if (user && user.id) {
        let coinBonus = 0;
        if (isWin) {
          coinBonus = isBotGame ? 5 : 10;
        }

        const fields: any = {
          wins: isWin ? (user.wins || 0) + 1 : (user.wins || 0),
          losses: !isWin ? (user.losses || 0) + 1 : (user.losses || 0),
          coins: (user.coins || 0) + coinBonus
        };
        
        await airtableFetch(`${AIRTABLE_CONFIG.TABLES.USERS}/${user.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ fields })
        });
      }
    } catch (e) {}
  },

  saveProfile: async (profile: UserProfile): Promise<UserProfile> => {
    const existing = await dbService.findPlayerGlobal(profile.name);
    if (existing) throw new Error("USERNAME_TAKEN");

    const fields = { 
      name: profile.name, 
      pin: String(profile.pin),
      gender: profile.gender, 
      lastSeen: Date.now(),
      wins: 0,
      losses: 0,
      coins: 100, // Welcome Bonus of 100 coins
      ownedStickers: "",
      favouriteStickers: ""
    };
    
    const result = await airtableFetch(AIRTABLE_CONFIG.TABLES.USERS, {
      method: 'POST',
      body: JSON.stringify({ records: [{ fields }] })
    });
    
    const saved = { ...profile, id: result.records[0].id, wins: 0, losses: 0, coins: 100, ownedStickers: [], favouriteStickers: [] };
    const db = getLocalDB();
    db.users = [saved];
    saveLocalDB(db);
    return saved;
  },

  purchaseSticker: async (username: string, stickerId: string, price: number): Promise<boolean> => {
    try {
      const user = await dbService.findPlayerGlobal(username);
      if (!user || !user.id || (user.coins || 0) < price) return false;
      
      const currentOwned = user.ownedStickers || [];
      if (currentOwned.includes(stickerId)) return true;
      
      const newOwned = [...currentOwned, stickerId];
      const newCoins = (user.coins || 0) - price;
      
      await airtableFetch(`${AIRTABLE_CONFIG.TABLES.USERS}/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          fields: { 
            coins: newCoins,
            ownedStickers: newOwned.join(',')
          } 
        })
      });
      return true;
    } catch (e) { return false; }
  },

  updateFavourites: async (userId: string, stickerIds: string[]): Promise<boolean> => {
    try {
      await airtableFetch(`${AIRTABLE_CONFIG.TABLES.USERS}/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          fields: { 
            favouriteStickers: stickerIds.join(',')
          } 
        })
      });
      return true;
    } catch (e) { return false; }
  },

  getFriends: async (myUsername: string): Promise<any[]> => {
    try {
      const formula = `OR({user1Id}='${clean(myUsername)}', {user2Id}='${clean(myUsername)}')`;
      const data = await airtableFetch(`${AIRTABLE_CONFIG.TABLES.FRIENDS}?filterByFormula=${encodeURIComponent(formula)}`);
      if (!data.records || data.records.length === 0) return [];
      const friendItems = data.records.map((r: any) => {
        const f = r.fields;
        const friendUid = f.user1Id === myUsername ? f.user2Id : f.user1Id;
        return { id: r.id, name: friendUid, uniqueId: friendUid, status: f.status, isIncoming: f.user2Id === myUsername && f.status === 'pending' };
      });
      const friendNames = friendItems.map(f => f.name);
      if (friendNames.length === 0) return [];
      const profileFormula = `OR(${friendNames.map(n => `{name}='${clean(n)}'`).join(',')})`;
      const profileData = await airtableFetch(`${AIRTABLE_CONFIG.TABLES.USERS}?filterByFormula=${encodeURIComponent(profileFormula)}`);
      const profilesByUid = profileData.records.reduce((acc: any, r: any) => { acc[r.fields.name] = r.fields; return acc; }, {});
      return friendItems.map(f => ({ ...f, lastSeen: profilesByUid[f.name]?.lastSeen || 0, avatarUrl: profilesByUid[f.name]?.avatarUrl }));
    } catch (e) { return []; }
  },

  sendFriendRequest: async (myUsername: string, targetUsername: string): Promise<boolean> => {
    try {
      const target = await dbService.findPlayerGlobal(targetUsername);
      if (!target) return false;
      const formula = `OR(AND({user1Id}='${clean(myUsername)}', {user2Id}='${clean(targetUsername)}'), AND({user1Id}='${clean(targetUsername)}', {user2Id}='${clean(myUsername)}'))`;
      const existing = await airtableFetch(`${AIRTABLE_CONFIG.TABLES.FRIENDS}?filterByFormula=${encodeURIComponent(formula)}`);
      if (existing.records && existing.records.length > 0) return true;
      await airtableFetch(AIRTABLE_CONFIG.TABLES.FRIENDS, { method: 'POST', body: JSON.stringify({ records: [{ fields: { user1Id: myUsername, user2Id: targetUsername, status: 'pending' } }] }) });
      return true;
    } catch (e) { return false; }
  },

  acceptFriend: async (myUsername: string, friendUsername: string) => {
    const formula = `AND({user1Id}='${clean(friendUsername)}', {user2Id}='${clean(myUsername)}', {status}='pending')`;
    const data = await airtableFetch(`${AIRTABLE_CONFIG.TABLES.FRIENDS}?filterByFormula=${encodeURIComponent(formula)}`);
    if (data.records.length > 0) {
      await airtableFetch(`${AIRTABLE_CONFIG.TABLES.FRIENDS}/${data.records[0].id}`, { method: 'PATCH', body: JSON.stringify({ fields: { status: 'accepted' } }) });
    }
  },

  removeFriend: async (friendshipId: string) => {
    await airtableFetch(`${AIRTABLE_CONFIG.TABLES.FRIENDS}/${friendshipId}`, { method: 'DELETE' });
  },

  sendMessage: async (msg: ChatMessage) => {
    const { id, ...fields } = msg;
    await airtableFetch(AIRTABLE_CONFIG.TABLES.MESSAGES, { method: 'POST', body: JSON.stringify({ records: [{ fields }] }) });
  },

  getMessages: async (userA: string, userB: string): Promise<ChatMessage[]> => {
    const filter = `OR(AND({senderId}='${clean(userA)}',{receiverId}='${clean(userB)}'), AND({senderId}='${clean(userB)}',{receiverId}='${clean(userA)}'))`;
    const data = await airtableFetch(`${AIRTABLE_CONFIG.TABLES.MESSAGES}?filterByFormula=${encodeURIComponent(filter)}&sort[0][field]=timestamp&sort[0][direction]=asc`);
    return data.records.map((r: any) => ({ id: r.id, ...r.fields }));
  },

  getPendingRequestCount: async (myUsername: string) => {
    try {
      const formula = `AND({user2Id}='${clean(myUsername)}', {status}='pending')`;
      const data = await airtableFetch(`${AIRTABLE_CONFIG.TABLES.FRIENDS}?filterByFormula=${encodeURIComponent(formula)}`);
      return data.records?.length || 0;
    } catch (e) { return 0; }
  },

  getNewMessageCount: async (myUsername: string, since: number) => {
    try {
      const filter = `AND({receiverId}='${clean(myUsername)}', {timestamp} > ${since})`;
      const data = await airtableFetch(`${AIRTABLE_CONFIG.TABLES.MESSAGES}?filterByFormula=${encodeURIComponent(filter)}`);
      return data.records?.length || 0;
    } catch (e) { return 0; }
  },

  hostGame: async (hostName: string, hostAvatar: string | undefined, code: string, isBotGame: boolean = false): Promise<GameState> => {
    const fields = { 
      code: String(code), 
      hostId: hostName, 
      guestId: isBotGame ? "FoxyBot" : "",
      hostPos: 1, 
      guestPos: 1, 
      hostLandingPos: 1,
      guestLandingPos: 1,
      turn: 'host', 
      lastDice: 0, 
      hostLastDice: 0, 
      guestLastDice: 0, 
      hostReaction: "", 
      guestReaction: "", 
      lastUpdated: Date.now()
    };
    const result = await airtableFetch(AIRTABLE_CONFIG.TABLES.GAMES, { method: 'POST', body: JSON.stringify({ records: [{ fields }] }) });
    return parseGame(result.records[0]);
  },

  joinGame: async (guestName: string, guestAvatar: string | undefined, code: string): Promise<{ game?: GameState, error?: string }> => {
    try {
      const formula = `{code}='${clean(code)}'`;
      const data = await airtableFetch(`${AIRTABLE_CONFIG.TABLES.GAMES}?filterByFormula=${encodeURIComponent(formula)}`);
      if (!data.records || data.records.length === 0) return { error: 'ROOM_NOT_FOUND' };
      const record = data.records[0];
      const f = record.fields;
      if (f.guestId && f.guestId !== guestName) return { error: 'ROOM_FULL' };
      const result = await airtableFetch(`${AIRTABLE_CONFIG.TABLES.GAMES}/${record.id}`, { method: 'PATCH', body: JSON.stringify({ fields: { guestId: guestName, lastUpdated: Date.now() } }) });
      return { game: parseGame(result) };
    } catch (e) { return { error: 'NETWORK_ERROR' }; }
  },

  updateGame: async (game: GameState) => {
    if (!game.id) return;
    const fields = { 
      code: game.code, 
      hostId: game.hostId, 
      guestId: game.guestId || "", 
      hostPos: game.hostPos, 
      guestPos: game.guestPos, 
      hostLandingPos: game.hostLandingPos || 1,
      guestLandingPos: game.guestLandingPos || 1,
      turn: game.turn, 
      winner: game.winner || "", 
      lastDice: game.lastDice, 
      hostLastDice: game.hostLastDice || 0, 
      guestLastDice: game.guestLastDice || 0, 
      hostReaction: game.hostReaction || "", 
      guestReaction: game.guestReaction || "", 
      lastUpdated: Date.now()
    };
    await airtableFetch(`${AIRTABLE_CONFIG.TABLES.GAMES}/${game.id}`, { method: 'PATCH', body: JSON.stringify({ fields }) });
  },

  deleteGame: async (gameId: string) => {
    await airtableFetch(`${AIRTABLE_CONFIG.TABLES.GAMES}/${gameId}`, { method: 'DELETE' });
  },

  getGameByCode: async (code: string): Promise<GameState | undefined> => {
    try {
      const formula = `{code}='${clean(code)}'`;
      const data = await airtableFetch(`${AIRTABLE_CONFIG.TABLES.GAMES}?filterByFormula=${encodeURIComponent(formula)}`);
      if (data.records && data.records.length > 0) return parseGame(data.records[0]);
      return undefined;
    } catch (e) { return undefined; }
  }
};
