
import { UserProfile, Friend, ChatMessage, GameState } from '../types';
import { AIRTABLE_CONFIG } from '../constants';

const STORAGE_KEY = 'snake_quest_db';

/**
 * Helper to communicate with Airtable API with improved error reporting
 */
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
    console.error(`Airtable Fetch Error [${url}]:`, e.message);
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

export const dbService = {
  /**
   * Find a player by their Username (name field)
   */
  findPlayerGlobal: async (username: string): Promise<UserProfile | null> => {
    if (!username) return null;
    try {
      const cleanName = username.trim();
      // Escape single quotes for Airtable formula: ' becomes \'
      const escapedName = cleanName.replace(/'/g, "\\'");
      const formula = `{name}='${escapedName}'`;
      const encodedFormula = encodeURIComponent(formula);
      
      const data = await airtableFetch(`${AIRTABLE_CONFIG.TABLES.USERS}?filterByFormula=${encodedFormula}`);
      
      if (data.records && data.records.length > 0) {
        return {
          id: data.records[0].id,
          ...data.records[0].fields
        } as UserProfile;
      }
      return null;
    } catch (e: any) {
      console.error("Global search failed:", e.message);
      // Fallback to local
      const db = getLocalDB();
      return db.users.find((u: UserProfile) => u.name === username) || null;
    }
  },

  /**
   * Save or Update user profile with uniqueness check
   */
  saveProfile: async (profile: UserProfile, oldName?: string): Promise<UserProfile> => {
    const trimmedName = profile.name.trim();

    // 1. UNIQUE USERNAME CHECK
    // If it's a new profile or name changed, check availability
    if (!oldName || trimmedName !== oldName) {
      const existing = await dbService.findPlayerGlobal(trimmedName);
      if (existing) {
        throw new Error("USERNAME_TAKEN");
      }
    }

    // 2. Local Update
    const db = getLocalDB();
    const profileToSave = { 
      ...profile, 
      name: trimmedName,
      uniqueId: trimmedName 
    }; 
    db.users = [profileToSave]; // Only store current user locally
    saveLocalDB(db);

    // 3. Airtable Sync
    try {
      const fields = {
        name: profileToSave.name,
        age: profileToSave.age,
        gender: profileToSave.gender
      };

      if (oldName) {
        const existingAirtable = await dbService.findPlayerGlobal(oldName);
        if (existingAirtable && existingAirtable.id) {
          await airtableFetch(`${AIRTABLE_CONFIG.TABLES.USERS}/${existingAirtable.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ fields })
          });
          return { ...profileToSave, id: existingAirtable.id };
        }
      }
      
      const result = await airtableFetch(AIRTABLE_CONFIG.TABLES.USERS, {
        method: 'POST',
        body: JSON.stringify({ records: [{ fields }] })
      });
      return { ...profileToSave, id: result.records[0].id };
    } catch (e: any) {
      console.warn("Airtable sync failed:", e.message);
      return profileToSave;
    }
  },

  sendFriendRequest: async (myUsername: string, targetUsername: string): Promise<boolean> => {
    const target = await dbService.findPlayerGlobal(targetUsername);
    if (!target) return false;

    try {
      await airtableFetch(AIRTABLE_CONFIG.TABLES.FRIENDS, {
        method: 'POST',
        body: JSON.stringify({
          records: [{
            fields: {
              user1Id: myUsername,
              user2Id: target.name,
              status: 'pending'
            }
          }]
        })
      });

      const db = getLocalDB();
      db.friends.push({ user1Id: myUsername, user2Id: target.name, status: 'pending' });
      saveLocalDB(db);
      return true;
    } catch (e) {
      console.error("Friend request failed:", e);
      return false;
    }
  },

  getFriends: async (myUsername: string): Promise<any[]> => {
    try {
      const formula = `OR({user1Id}='${myUsername.replace(/'/g, "\\'")}', {user2Id}='${myUsername.replace(/'/g, "\\'")}')`;
      const data = await airtableFetch(`${AIRTABLE_CONFIG.TABLES.FRIENDS}?filterByFormula=${encodeURIComponent(formula)}`);
      const records = data.records.map((r: any) => ({ ...r.fields, airtableId: r.id }));
      
      const friendsList = [];
      for (const f of records) {
        const isRequester = f.user1Id === myUsername;
        const friendUid = isRequester ? f.user2Id : f.user1Id;
        const friendProfile = await dbService.findPlayerGlobal(friendUid);
        
        friendsList.push({
          id: friendUid,
          name: friendProfile?.name || friendUid,
          uniqueId: friendUid,
          status: f.status,
          isIncoming: !isRequester && f.status === 'pending',
          airtableId: f.airtableId
        });
      }
      return friendsList;
    } catch (e) {
      const db = getLocalDB();
      return db.friends
        .filter((f: any) => f.user1Id === myUsername || f.user2Id === myUsername)
        .map((f: any) => {
          const isRequester = f.user1Id === myUsername;
          const friendUid = isRequester ? f.user2Id : f.user1Id;
          return {
            id: friendUid,
            name: friendUid,
            uniqueId: friendUid,
            status: f.status,
            isIncoming: !isRequester && f.status === 'pending'
          };
        });
    }
  },

  getPendingRequestCount: async (myUsername: string): Promise<number> => {
    try {
      const formula = `AND({user2Id}='${myUsername.replace(/'/g, "\\'")}', {status}='pending')`;
      const data = await airtableFetch(`${AIRTABLE_CONFIG.TABLES.FRIENDS}?filterByFormula=${encodeURIComponent(formula)}`);
      return data.records?.length || 0;
    } catch (e) {
      return 0;
    }
  },

  acceptFriend: async (myUsername: string, friendUsername: string) => {
    try {
      const formula = `AND({user1Id}='${friendUsername.replace(/'/g, "\\'")}', {user2Id}='${myUsername.replace(/'/g, "\\'")}', {status}='pending')`;
      const data = await airtableFetch(`${AIRTABLE_CONFIG.TABLES.FRIENDS}?filterByFormula=${encodeURIComponent(formula)}`);
      if (data.records && data.records.length > 0) {
        await airtableFetch(`${AIRTABLE_CONFIG.TABLES.FRIENDS}/${data.records[0].id}`, {
          method: 'PATCH',
          body: JSON.stringify({ fields: { status: 'accepted' } })
        });
      }
    } catch (e) {
      console.error("Accept friend failed:", e);
    }
  },

  sendMessage: async (msg: ChatMessage) => {
    const db = getLocalDB();
    db.chats.push(msg);
    saveLocalDB(db);

    try {
      await airtableFetch(AIRTABLE_CONFIG.TABLES.MESSAGES, {
        method: 'POST',
        body: JSON.stringify({ records: [{ fields: msg }] })
      });
    } catch (e) {
      console.warn("Message sync failed");
    }
  },

  getMessages: async (userA: string, userB: string): Promise<ChatMessage[]> => {
    try {
      const filter = `OR(AND({senderId}='${userA.replace(/'/g, "\\'")}',{receiverId}='${userB.replace(/'/g, "\\'")}') , AND({senderId}='${userB.replace(/'/g, "\\'")}',{receiverId}='${userA.replace(/'/g, "\\'")}'))`;
      const urlParams = `?filterByFormula=${encodeURIComponent(filter)}&sort[0][field]=timestamp&sort[0][direction]=asc`;
      const data = await airtableFetch(`${AIRTABLE_CONFIG.TABLES.MESSAGES}${urlParams}`);
      return data.records.map((r: any) => r.fields);
    } catch (e) {
      const db = getLocalDB();
      return db.chats.filter((m: any) => 
        (m.senderId === userA && m.receiverId === userB) || (m.senderId === userB && m.receiverId === userA)
      );
    }
  },

  hostGame: (hostName: string, code: string): GameState => {
    const db = getLocalDB();
    const newGame: GameState = {
      code, hostId: hostName, hostPos: 1, guestPos: 1, turn: 'host', lastDice: 0
    };
    db.games = db.games.filter((g: any) => g.hostId !== hostName);
    db.games.push(newGame);
    saveLocalDB(db);
    return newGame;
  },

  joinGame: (guestName: string, code: string): GameState | null => {
    const db = getLocalDB();
    const game = db.games.find((g: any) => g.code === code && !g.guestId);
    if (game) {
      game.guestId = guestName;
      saveLocalDB(db);
      return game;
    }
    return null;
  },

  updateGame: (game: GameState) => {
    const db = getLocalDB();
    const idx = db.games.findIndex((g: any) => g.code === game.code);
    if (idx > -1) {
      db.games[idx] = game;
      saveLocalDB(db);
    }
  },

  getGameByCode: (code: string): GameState | undefined => {
    const db = getLocalDB();
    return db.games.find((g: any) => g.code === code);
  }
};
