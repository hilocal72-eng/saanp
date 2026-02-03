
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, UserProfile } from '../types';
import { dbService } from '../services/dbService';
import { LADDERS, SNAKES, BOARD_CELLS } from '../constants';
import { 
  Trophy, Sword, Frown, Star, Clock, Sparkles, Smile, Flame, LogOut, AlertCircle, CheckCircle2, User
} from 'lucide-react';

interface GameTabProps {
  myProfile: UserProfile | null;
  game: GameState | null;
  setGame: (g: GameState | null) => void;
  onProfileUpdate: (p: UserProfile | null) => void;
}

const TURN_TIMEOUT_SECONDS = 60;
const ECHO_DURATION = 4000;
const SYNC_INTERVAL = 1500;
const WALK_SPEED_MS = 200;

const REACTIONS = [
  { icon: '😂', label: 'LOL', color: '#fbbf24' },
  { icon: '😭', label: 'NOOO', color: '#60a5fa' },
  { icon: '🤬', label: 'RAGE', color: '#f87171' },
  { icon: '🐍', label: 'BIG SNAKE!', color: '#4ade80' },
  { icon: '😎', label: 'COOL', color: '#0ea5e9' },
  { icon: '❤️', label: 'LOVE', color: '#f43f5e' }
];

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const FirecrackerBlast = ({ delay, colorSet, xOffset = "50%", yOffset = "50%" }: { delay: string, colorSet: string[], xOffset?: string, yOffset?: string }) => {
  const sparkCount = 32;
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div 
        className="absolute w-12 h-12 rounded-full bg-white blur-md animate-flash z-10"
        style={{ left: xOffset, top: yOffset, transform: 'translate(-50%, -50%)', animationDelay: delay }}
      />
      <div className="absolute" style={{ left: xOffset, top: yOffset }}>
        {[...Array(sparkCount)].map((_, i) => {
          const angle = (i * 360) / sparkCount + (Math.random() * 20);
          const radian = (angle * Math.PI) / 180;
          const distance = 60 + Math.random() * 100;
          const dx = Math.cos(radian) * distance;
          const dy = Math.sin(radian) * distance;
          const size = 2 + Math.random() * 4;
          const color = colorSet[i % colorSet.length];
          return (
            <div 
              key={i}
              className="absolute rounded-full animate-spark"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: color,
                boxShadow: `0 0 8px ${color}, 0 0 16px ${color}`,
                animationDelay: delay,
                '--dx': `${dx}px`,
                '--dy': `${dy}px`,
              } as React.CSSProperties}
            />
          );
        })}
      </div>
    </div>
  );
};

const GoldenTrophy = ({ size = 64, className = "", isMuted = false }: { size?: number, className?: string, isMuted?: boolean }) => (
  <div className={`relative ${className} flex items-center justify-center`} style={{ width: size, height: size }}>
    <img 
      src="https://cdn-icons-png.flaticon.com/512/3112/3112946.png" 
      className={`w-full h-full object-contain transition-all duration-700 ${isMuted ? 'grayscale opacity-30 brightness-50' : 'drop-shadow-[0_0_25px_rgba(251,191,36,0.7)]'}`}
      alt="Trophy"
    />
    {!isMuted && <div className="absolute inset-0 rounded-full shine-effect pointer-events-none mix-blend-overlay opacity-50" />}
  </div>
);

const SadFaceIcon = ({ size = 60 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className="drop-shadow-[0_15px_30px_rgba(0,0,0,0.5)]">
    <defs>
      <linearGradient id="sad-face-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#e5e7eb" />
        <stop offset="100%" stopColor="#9ca3af" />
      </linearGradient>
    </defs>
    {/* Body */}
    <circle cx="50" cy="50" r="48" fill="url(#sad-face-gradient)" />
    {/* Eyes */}
    <circle cx="32" cy="45" r="7" fill="#4b5563" />
    <circle cx="68" cy="45" r="7" fill="#4b5563" />
    {/* Sad Mouth */}
    <path 
      d="M 28 80 Q 50 55 72 80" 
      fill="none" 
      stroke="#4b5563" 
      strokeWidth="11" 
      strokeLinecap="round" 
    />
  </svg>
);

const WinnerBannerDisplay = ({ isMe = true }: { isMe?: boolean }) => {
  const isMuted = !isMe;
  const color = isMuted ? "#475569" : "#BF953F";
  const lightColor = isMuted ? "#94a3b8" : "#FCF6BA";

  return (
    <div className="relative flex flex-col items-center justify-center scale-110 sm:scale-125">
      <svg width="240" height="240" viewBox="0 0 200 200" className="overflow-visible">
        <defs>
          <linearGradient id="banner-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="25%" stopColor={lightColor} />
            <stop offset="50%" stopColor={color} />
            <stop offset="100%" stopColor={isMuted ? "#1e293b" : "#805a00"} />
          </linearGradient>
          <path id="curve" d="M 40,80 A 60,60 0 0,1 160,80" />
        </defs>

        {/* TOP ICON */}
        {isMe ? (
          <path 
            d="M 100,5 L 103,14 L 112,14 L 105,20 L 108,29 L 100,23 L 92,29 L 95,20 L 88,14 L 97,14 Z" 
            fill="url(#banner-gold)" 
            className="animate-pulse"
          />
        ) : (
           <text x="100" y="25" textAnchor="middle" fill="url(#banner-gold)" fontSize="14" fontWeight="900" className="opacity-40">✕</text>
        )}

        {/* CURVED TEXT */}
        <text fill="url(#banner-gold)" fontSize="10" fontWeight="900" className="uppercase tracking-tighter">
          <textPath href="#curve" startOffset="50%" textAnchor="middle">
            {isMe ? 'CONGRATULATIONS' : 'GAME OVER'}
          </textPath>
        </text>

        {/* LAURELS */}
        <g stroke="url(#banner-gold)" fill="none" strokeWidth="1.5">
          <path d="M 75,130 C 50,120 45,80 65,50" opacity="0.8" />
          <path d="M 125,130 C 150,120 155,80 135,50" opacity="0.8" />
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map(t => (
            <React.Fragment key={t}>
               <circle cx={65 - t*15} cy={50 + t*70} r="2" fill="url(#banner-gold)" />
               <circle cx={135 + t*15} cy={50 + t*70} r="2" fill="url(#banner-gold)" />
            </React.Fragment>
          ))}
        </g>

        {/* RIBBON BACKGROUND FOLDS */}
        <path d="M 30,155 L 50,140 L 50,170 L 30,175 Z" fill={isMuted ? "#1e293b" : "#805a00"} opacity="0.6" />
        <path d="M 170,155 L 150,140 L 150,170 L 170,175 Z" fill={isMuted ? "#1e293b" : "#805a00"} opacity="0.6" />

        {/* MAIN RIBBON FRONT */}
        <path 
          d="M 40,145 C 70,135 130,135 160,145 L 165,175 C 130,165 70,165 35,175 Z" 
          fill="url(#banner-gold)" 
          stroke={isMuted ? "#1e293b" : "#4d3300"}
          strokeWidth="0.5"
        />

        {/* RIBBON TEXT: WINNER or Loser */}
        <text 
          x="100" 
          y="160" 
          textAnchor="middle" 
          fill={isMuted ? "#f1f5f9" : "#4d3300"} 
          fontSize={isMe ? "18" : "16"} 
          fontWeight="900" 
          className="italic tracking-tighter select-none"
        >
          {isMe ? 'WINNER' : 'Loser'}
        </text>
      </svg>
      
      {/* CENTRAL OVERLAY */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] flex items-center justify-center">
        {isMe ? (
          <GoldenTrophy size={110} isMuted={false} />
        ) : (
          <div className="animate-bounce">
            <SadFaceIcon size={60} />
          </div>
        )}
      </div>
    </div>
  );
};

// Internal Board Overlay Component
const BoardCelebration = ({ winnerName, isMe }: { winnerName: string, isMe: boolean }) => {
  const fireworkColors = ['#ffffff', '#fef08a', '#fbbf24', '#facc15', '#ef4444', '#3b82f6'];

  return (
    <div className="absolute inset-0 pointer-events-none z-[120] flex items-center justify-center bg-[#020d1a]/85 backdrop-blur-[1.5px] overflow-hidden rounded-lg">
      {isMe && (
        <div className="absolute inset-0">
          <FirecrackerBlast delay="0s" colorSet={fireworkColors} xOffset="50%" yOffset="50%" />
          <FirecrackerBlast delay="0.4s" colorSet={fireworkColors} xOffset="25%" yOffset="30%" />
          <FirecrackerBlast delay="0.8s" colorSet={fireworkColors} xOffset="75%" yOffset="40%" />
          <FirecrackerBlast delay="1.2s" colorSet={fireworkColors} xOffset="40%" yOffset="75%" />
          <FirecrackerBlast delay="1.6s" colorSet={fireworkColors} xOffset="65%" yOffset="80%" />
        </div>
      )}

      <div className="relative flex flex-col items-center px-4 z-20">
        <div className="animate-winner-zoom flex flex-col items-center">
          
          <WinnerBannerDisplay isMe={isMe} />

          <div className={`mt-2 flex flex-col items-center gap-2 bg-black/80 px-6 py-3 rounded-2xl border border-white/20 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.5)]`}>
            {isMe ? (
              <div className="flex items-center gap-2">
                <Trophy size={18} className="text-yellow-400" />
                <p className="text-white font-black text-xs uppercase tracking-[0.2em]">
                  Victory!
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <p className="text-slate-100 font-black text-xs uppercase tracking-widest text-center italic">
                   Better Luck next time
                </p>
                <p className="text-slate-400 font-bold text-[8px] uppercase tracking-widest text-center mt-1">
                   {winnerName} conquered the arena
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {isMe && (
        <div className="absolute inset-0 overflow-hidden opacity-40">
          {[...Array(20)].map((_, i) => (
            <div 
              key={i}
              className="absolute w-1 h-1 rounded-full animate-confetti-fall"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-5%',
                backgroundColor: '#ffffff',
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ReactionBubble: React.FC<{ text: string, visible: boolean }> = ({ text, visible }) => {
  if (!visible || !text) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center z-[500] pointer-events-none overflow-visible">
      <div className="text-3xl animate-reaction-pop drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] select-none">
        {text}
      </div>
    </div>
  );
};

const Pawn = ({ color, className }: { color: string, className?: string }) => (
  <svg viewBox="0 0 40 60" className={`w-full h-full drop-shadow-[0_4px_4px_rgba(0,0,0,0.4)] ${className}`} style={{ color }}>
    <circle cx="20" cy="15" r="10" fill="currentColor" stroke="black" strokeWidth="3" />
    <path d="M20 25 C14 25 10 28 10 32 L6 50 C6 54 10 56 14 56 L26 56 C30 56 34 54 34 50 L30 32 C30 28 26 25 20 25 Z" fill="currentColor" stroke="black" strokeWidth="3" strokeLinejoin="round" />
  </svg>
);

const IsometricDie = ({ value, rolling }: { value: number, rolling: boolean }) => (
  <svg viewBox="0 0 100 100" className={`w-full h-full transition-all duration-150 ${rolling ? 'animate-dice-tumble scale-110' : 'animate-dice-settle'}`}>
    <g transform="translate(25, 20)">
      <path d="M25 0 L50 15 L25 30 L0 15 Z" fill="#ffdf5e" stroke="black" strokeWidth="2.5" />
      <path d="M0 15 L25 30 L25 60 L0 45 Z" fill="#ffce00" stroke="black" strokeWidth="2.5" />
      <path d="M25 30 L50 15 L50 45 L25 60 Z" fill="#ffe98a" stroke="black" strokeWidth="2.5" />
      <g className="pips">
         {value === 1 && <circle cx="25" cy="15" r="4" fill="#ff9100" />}
         {value === 2 && (<><circle cx="15" cy="10" r="3" fill="black" /><circle cx="35" cy="20" r="3" fill="black" /></>)}
         {value === 3 && (<><circle cx="15" cy="10" r="3" fill="black" /><circle cx="25" cy="15" r="3" fill="black" /><circle cx="35" cy="20" r="3" fill="black" /></>)}
         {value === 4 && (<><circle cx="15" cy="10" r="3" fill="black" /><circle cx="35" cy="10" r="3" fill="black" /><circle cx="15" cy="20" r="3" fill="black" /><circle cx="35" cy="20" r="3" fill="black" /></>)}
         {value === 5 && (<><circle cx="15" cy="10" r="3" fill="black" /><circle cx="35" cy="10" r="3" fill="black" /><circle cx="25" cy="15" r="3" fill="black" /><circle cx="15" cy="20" r="3" fill="black" /><circle cx="35" cy="20" r="3" fill="black" /></>)}
         {value === 6 && (<><circle cx="15" cy="8" r="2.5" fill="black" /><circle cx="25" cy="8" r="2.5" fill="black" /><circle cx="35" cy="8" r="2.5" fill="black" /><circle cx="15" cy="22" r="2.5" fill="black" /><circle cx="25" cy="22" r="2.5" fill="black" /><circle cx="35" cy="22" r="2.5" fill="black" /></>)}
      </g>
    </g>
  </svg>
);

const GameTab: React.FC<GameTabProps> = ({ myProfile, game, setGame, onProfileUpdate }) => {
  const [inputCode, setInputCode] = useState('');
  const [rolling, setRolling] = useState(false);
  const [rollingDiceValue, setRollingDiceValue] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [statsUpdatedForGame, setStatsUpdatedForGame] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(TURN_TIMEOUT_SECONDS);
  const [visualHostPos, setVisualHostPos] = useState(game?.hostPos || 1);
  const [visualGuestPos, setVisualGuestPos] = useState(game?.guestPos || 1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hostEcho, setHostEcho] = useState<{ text: string, time: number } | null>(null);
  const [guestEcho, setGuestEcho] = useState<{ text: string, time: number } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [avatars, setAvatars] = useState<Record<string, string>>({});
  const gameRef = useRef<GameState | null>(game);

  useEffect(() => { gameRef.current = game; }, [game]);

  // Resolve avatars for host and guest dynamically
  useEffect(() => {
    const hostId = game?.hostId;
    const guestId = game?.guestId;
    if (!hostId) return;

    const fetchAvatars = async () => {
      const needed = [];
      if (hostId && !avatars[hostId]) needed.push(hostId);
      if (guestId && !avatars[guestId]) needed.push(guestId);
      
      if (needed.length === 0) return;

      const fetched: Record<string, string> = {};
      for (const uid of needed) {
        const profile = await dbService.findPlayerGlobal(uid);
        if (profile?.avatarUrl) {
          fetched[uid] = profile.avatarUrl;
        }
      }

      if (Object.keys(fetched).length > 0) {
        setAvatars(prev => ({ ...prev, ...fetched }));
      }
    };
    fetchAvatars();
  }, [game?.hostId, game?.guestId]);

  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  useEffect(() => {
    setHostEcho(null);
    setGuestEcho(null);
  }, [game?.id]);

  useEffect(() => {
    if (game) {
      const checkReaction = (reactionStr: string | undefined, setter: (val: any) => void) => {
        if (!reactionStr) {
          setter(null);
          return;
        }
        const [text, timeStr] = reactionStr.split('|');
        const time = parseInt(timeStr);
        if (Date.now() - time < ECHO_DURATION) {
          setter({ text, time });
        } else {
          setter(null);
        }
      };
      checkReaction(game.hostReaction, setHostEcho);
      checkReaction(game.guestReaction, setGuestEcho);
    }
  }, [game?.id, game?.hostReaction, game?.guestReaction]);

  useEffect(() => {
    if (!game) return;
    const hostDone = visualHostPos === game.hostPos;
    const guestDone = visualGuestPos === game.guestPos;
    if (hostDone && guestDone) {
      setIsAnimating(false);
      return;
    }
    const timer = setTimeout(() => {
      setIsAnimating(true);
      const calculateNextPos = (current: number, target: number) => {
        if (current === target) return target;
        if (LADDERS[current] === target) return target;
        if (SNAKES[current] === target) return target;
        const ladderBottom = Object.keys(LADDERS).find(k => LADDERS[Number(k)] === target && Number(k) > current);
        if (ladderBottom) {
          const bottom = Number(ladderBottom);
          if (current < bottom) return current + 1;
          return target;
        }
        if (target < current) {
           const snakeHead = Object.keys(SNAKES).find(k => SNAKES[Number(k)] === target);
           if (snakeHead) {
             const head = Number(snakeHead);
             if (current < head) return current + 1;
             return target;
           }
        }
        if (current < target) return current + 1;
        return target;
      };
      if (!hostDone) setVisualHostPos(prev => calculateNextPos(prev, game.hostPos));
      if (!guestDone) setVisualGuestPos(prev => calculateNextPos(prev, game.guestPos));
    }, WALK_SPEED_MS);
    return () => clearTimeout(timer);
  }, [game?.hostPos, game?.guestPos, visualHostPos, visualGuestPos]);

  const isMyTurn = !!(game && myProfile && (
    (game.turn === 'host' && game.hostId === myProfile.uniqueId) ||
    (game.turn === 'guest' && game.guestId === myProfile.uniqueId)
  ));

  const syncMyStatsLocally = useCallback(async (iWon: boolean, gameId: string) => {
    if (statsUpdatedForGame === gameId || !myProfile) return;
    setStatsUpdatedForGame(gameId);
    await dbService.incrementStats(myProfile.uniqueId, iWon);
    const updated = await dbService.findPlayerGlobal(myProfile.uniqueId);
    if (updated) {
      const db = { users: [updated], friends: [], chats: [], games: [] };
      localStorage.setItem('snake_quest_db', JSON.stringify(db));
      onProfileUpdate(updated);
    }
  }, [myProfile, statsUpdatedForGame, onProfileUpdate]);

  useEffect(() => {
    if (!game || game.winner || !game.guestId) return;
    const timer = setInterval(() => {
      const lastUpdated = game.lastUpdated || Date.now();
      const elapsed = Math.floor((Date.now() - lastUpdated) / 1000);
      const remaining = Math.max(0, TURN_TIMEOUT_SECONDS - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        const opponentId = game.turn === 'host' ? game.guestId! : game.hostId;
        const forfeitGame = { ...game, winner: opponentId };
        dbService.updateGame(forfeitGame).then(() => {
           if (gameRef.current?.id === forfeitGame.id) {
             setGame(forfeitGame);
             if (myProfile) syncMyStatsLocally(opponentId === myProfile.uniqueId, game.id!);
           }
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [game?.turn, game?.lastUpdated, game?.winner, game?.guestId, myProfile?.uniqueId, setGame, syncMyStatsLocally]);

  useEffect(() => {
    let interval: any;
    let isActive = true;
    if (game && myProfile) {
      interval = setInterval(async () => {
        try {
          const remoteGame = await dbService.getGameByCode(game.code);
          if (!isActive) return;
          if (!remoteGame) { setGame(null); return; }
          const current = gameRef.current;
          if (!current || current.id !== remoteGame.id) return;
          if (remoteGame.winner && statsUpdatedForGame !== remoteGame.id) {
            const iWon = remoteGame.winner === myProfile.uniqueId;
            await syncMyStatsLocally(iWon, remoteGame.id!);
            setGame(remoteGame);
            return;
          }
          const hasChanged = remoteGame.hostPos !== current.hostPos || remoteGame.guestPos !== current.guestPos || remoteGame.turn !== current.turn || remoteGame.guestId !== current.guestId || remoteGame.winner !== current.winner || remoteGame.hostReaction !== current.hostReaction || remoteGame.guestReaction !== current.guestReaction || remoteGame.lastUpdated !== current.lastUpdated;
          if (hasChanged) setGame(remoteGame);
        } catch (e) { console.debug("Sync failed"); }
      }, SYNC_INTERVAL);
    }
    return () => { isActive = false; clearInterval(interval); };
  }, [game?.id, game?.winner, game?.code, myProfile?.uniqueId, statsUpdatedForGame, syncMyStatsLocally, setGame]);

  const sendEcho = async (icon: string) => {
    if (!game || !myProfile || !game.guestId) return;
    const isHost = game.hostId === myProfile.uniqueId;
    const timestamp = Date.now();
    const reactionString = `${icon}|${timestamp}`;
    if (isHost) setHostEcho({ text: icon, time: timestamp });
    else setGuestEcho({ text: icon, time: timestamp });
    const update = { ...game, [isHost ? 'hostReaction' : 'guestReaction']: reactionString, lastUpdated: Date.now() };
    await dbService.updateGame(update);
    setGame(update);
  };

  const createGame = async () => {
    if (!myProfile) return;
    setLoading(true);
    try {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      const newGame = await dbService.hostGame(myProfile.uniqueId, myProfile.avatarUrl, code);
      setGame(newGame);
      setVisualHostPos(1);
      setVisualGuestPos(1);
      setStatsUpdatedForGame(null);
    } catch (e) { 
      setFeedback({ type: 'error', message: 'Failed to create room.' });
    } finally { setLoading(false); }
  };

  const joinGame = async () => {
    if (!myProfile || inputCode.length !== 4) return;
    setLoading(true);
    try {
      const result = await dbService.joinGame(myProfile.uniqueId, myProfile.avatarUrl, inputCode);
      if (result.game) {
        setGame(result.game);
        setVisualHostPos(result.game.hostPos);
        setVisualGuestPos(result.game.guestPos);
        setStatsUpdatedForGame(null);
        setInputCode('');
      } else {
        setFeedback({ 
          type: 'error', 
          message: result.error === 'ROOM_FULL' ? 'Room is full' : 'Invalid Code' 
        });
      }
    } catch (e) { 
      setFeedback({ type: 'error', message: 'Network error.' });
    } finally { setLoading(false); }
  };

  const confirmLeave = async () => {
    if (!game || !myProfile) { setGame(null); return; }
    const isHost = game.hostId === myProfile.uniqueId;
    if (game.guestId && !game.winner) {
      const winnerId = isHost ? game.guestId : game.hostId;
      const finalGame = { ...game, winner: winnerId };
      await dbService.updateGame(finalGame);
      await syncMyStatsLocally(false, game.id!);
      setGame(finalGame);
    } else { setGame(null); }
    setShowQuitModal(false);
  };

  const rollDice = async () => {
    if (!game || rolling || isAnimating || game.winner || !myProfile || !isMyTurn || !game.guestId) return;
    setRolling(true);
    const diceValue = Math.floor(Math.random() * 6) + 1;
    for (let i = 0; i < 12; i++) {
      setRollingDiceValue(Math.floor(Math.random() * 6) + 1);
      await new Promise(r => setTimeout(r, 80));
    }
    setRollingDiceValue(diceValue);
    const isHost = game.hostId === myProfile.uniqueId;
    const currentPos = isHost ? game.hostPos : game.guestPos;
    let landingPos = currentPos + diceValue;
    if (landingPos > BOARD_CELLS) landingPos = currentPos;
    const finalPos = LADDERS[landingPos] || SNAKES[landingPos] || landingPos;
    const winnerId = finalPos === BOARD_CELLS ? (isHost ? game.hostId : game.guestId!) : undefined;
    const update = { ...game, hostPos: isHost ? finalPos : game.hostPos, guestPos: !isHost ? finalPos : game.guestPos, lastDice: diceValue, hostLastDice: isHost ? diceValue : (game.hostLastDice || 0), guestLastDice: !isHost ? diceValue : (game.guestLastDice || 0), turn: (game.turn === 'host' ? 'guest' : 'host') as any, winner: winnerId, lastUpdated: Date.now() };
    await dbService.updateGame(update);
    setGame(update);
    if (winnerId) await syncMyStatsLocally(winnerId === myProfile.uniqueId, game.id!);
    setRolling(false);
  };

  const getCellCoords = (cell: number) => {
    const row = Math.floor((cell - 1) / 10);
    const col = (cell - 1) % 10;
    const x = (row % 2 === 0 ? col : 9 - col) * 10 + 5;
    const y = (9 - row) * 10 + 5;
    return { x, y };
  };

  const getSnakeColor = (start: number) => {
    const snakeColors = ["#ef4444", "#a855f7", "#10b981", "#3b82f6", "#f59e0b"];
    return snakeColors[start % snakeColors.length];
  };

  const renderBoard = () => {
    const cells = [];
    for (let row = 9; row >= 0; row--) {
      const isReverseRow = row % 2 !== 0;
      for (let col = 0; col < 10; col++) {
        const actualCol = isReverseRow ? 9 - col : col;
        const cellNum = row * 10 + actualCol + 1;
        cells.push(
          <div key={cellNum} className="relative flex items-center justify-center border-[0.5px] border-black/10 bg-white" style={{ width: '10%', aspectRatio: '1/1' }}>
            <span className="absolute top-0.5 left-1 text-[9px] sm:text-[11px] font-black text-black select-none leading-none z-[50] pointer-events-none">{cellNum}</span>
            {cellNum === BOARD_CELLS && <div className="absolute top-1 right-1"><Star size={14} className="text-yellow-400 fill-yellow-400" /></div>}
          </div>
        );
      }
    }
    return cells;
  };

  const hostCoords = getCellCoords(visualHostPos);
  const guestCoords = getCellCoords(visualGuestPos);
  const iWon = game?.winner === myProfile?.uniqueId;
  const sameCell = visualHostPos === visualGuestPos;

  if (!game) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-slate-950 p-8 animate-in fade-in duration-700 relative overflow-hidden">
        {feedback && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[250] flex items-center gap-3 px-6 py-4 rounded-2xl bg-slate-900 border border-indigo-500/30 shadow-[0_0_30px_rgba(79,70,229,0.3)] animate-in slide-in-from-top-full duration-300">
            {feedback.type === 'success' ? <CheckCircle2 className="text-emerald-500" size={20} /> : <AlertCircle className="text-rose-500" size={20} />}
            <span className="text-xs font-black text-white uppercase tracking-widest">{feedback.message}</span>
          </div>
        )}
        <div className="absolute inset-0 z-0 opacity-30 mix-blend-screen" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=2070')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="relative z-10 flex-1 flex flex-col justify-center items-center gap-10">
          <div className="text-center flex flex-col items-center gap-4">
            <GoldenTrophy size={80} className="animate-bounce" />
            <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic text-center">Arena<br/><span className="text-indigo-400">Battle</span></h1>
          </div>
          <div className="w-full max-w-[260px] space-y-6 pb-48">
            <button disabled={loading} onClick={createGame} className="w-full bg-white text-black font-black py-4 rounded-2xl active:scale-95 text-xs uppercase tracking-widest shadow-xl">HOST NEW ROOM</button>
            <div className="flex flex-col gap-3 relative">
              <input type="text" maxLength={4} value={inputCode} onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))} placeholder="CODE" className="w-full text-center font-black text-xl py-3 rounded-2xl bg-slate-950 border border-slate-700 text-white outline-none focus:border-indigo-500 transition-all placeholder:opacity-60" />
              <button disabled={loading || inputCode.length < 4} onClick={joinGame} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase active:scale-95">JOIN ARENA</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hostAvatar = avatars[game.hostId];
  const guestAvatar = game.guestId ? avatars[game.guestId] : null;

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 text-white overflow-hidden relative pb-32">
      {feedback && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[250] flex items-center gap-3 px-6 py-4 rounded-2xl bg-slate-900 border border-indigo-500/30 shadow-[0_0_30px_rgba(79,70,229,0.3)] animate-in slide-in-from-top-full duration-300">
          {feedback.type === 'success' ? <CheckCircle2 className="text-emerald-500" size={20} /> : <AlertCircle className="text-rose-500" size={20} />}
          <span className="text-xs font-black text-white uppercase tracking-widest">{feedback.message}</span>
        </div>
      )}

      {showQuitModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-rose-500/30 p-8 rounded-[2rem] text-center max-w-xs w-full shadow-2xl">
            <h2 className="text-2xl font-black text-white uppercase mb-4">Exit Arena?</h2>
            <div className="grid grid-cols-2 gap-3 mt-8">
              <button onClick={() => setShowQuitModal(false)} className="bg-slate-800 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10">CANCEL</button>
              <button onClick={confirmLeave} className="bg-rose-600 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest">QUIT</button>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 py-4 flex items-center justify-between border-b border-white/10 bg-slate-900/50 backdrop-blur-md z-[50]">
        <div className="flex items-center gap-2"><Sword size={12} className="text-amber-400" /><span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Arena #{game.code}</span></div>
        <button onClick={() => setShowQuitModal(true)} className="px-3 py-1.5 bg-rose-500 text-white rounded-lg text-[9px] font-black border border-white/20 active:scale-90">QUIT</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col items-center">
        <div className="flex justify-center items-center gap-3 mb-6 mt-6 sticky top-0 z-[400] w-full">
           <div className={`px-2 py-1.5 rounded-xl border flex flex-col items-center min-w-[85px] relative transition-all duration-300 ${game.turn === 'host' ? 'bg-indigo-600 border-white scale-105 shadow-[0_0_15px_rgba(79,70,229,0.3)]' : 'bg-slate-800 border-white/10 opacity-80'}`}>
              <ReactionBubble key={`${game.hostReaction}`} text={hostEcho?.text || ''} visible={!!hostEcho} />
              <span className="text-base font-black text-white leading-none">{game.hostLastDice || '-'}</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-4 h-4 rounded-md overflow-hidden bg-slate-950 border border-white/10 shrink-0">
                  {hostAvatar ? <img src={hostAvatar} className="w-full h-full object-cover" /> : <User size={10} className="m-auto text-slate-500" />}
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest truncate max-w-[55px]">{game.hostId}</span>
              </div>
              {game.turn === 'host' && !game.winner && <div className="flex items-center gap-1 mt-1 text-white"><Clock size={8} /><span className="text-[7px] font-black">{formatTime(timeLeft)}</span></div>}
           </div>
           <div className={`px-2 py-1.5 rounded-xl border flex flex-col items-center min-w-[85px] relative transition-all duration-300 ${game.turn === 'guest' ? 'bg-emerald-600 border-white scale-105 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-slate-800 border-white/10 opacity-80'}`}>
              <ReactionBubble key={`${game.guestReaction}`} text={guestEcho?.text || ''} visible={!!guestEcho} />
              <span className="text-base font-black text-white leading-none">{game.guestLastDice || '-'}</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-4 h-4 rounded-md overflow-hidden bg-slate-950 border border-white/10 shrink-0">
                  {guestAvatar ? <img src={guestAvatar} className="w-full h-full object-cover" /> : <User size={10} className="m-auto text-slate-500" />}
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest truncate max-w-[55px]">{game.guestId || 'WAITING'}</span>
              </div>
              {game.turn === 'guest' && !game.winner && game.guestId && <div className="flex items-center gap-1 mt-1 text-white"><Clock size={8} /><span className="text-[7px] font-black">{formatTime(timeLeft)}</span></div>}
           </div>
        </div>

        <div className="w-full max-w-full mx-auto bg-white rounded-xl border-[4px] border-slate-900 shadow-2xl relative aspect-square mb-6 z-[60] overflow-hidden">
          <div className="absolute inset-0 flex flex-wrap z-10 rounded-lg">{renderBoard()}</div>
          {game.winner && <BoardCelebration winnerName={game.winner} isMe={iWon} />}
          <svg className="absolute inset-0 pointer-events-none z-[40] w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {Object.entries(LADDERS).map(([start, end]) => {
              const s = getCellCoords(parseInt(start));
              const e = getCellCoords(end);
              const dx = e.x - s.x, dy = e.y - s.y, dist = Math.sqrt(dx * dx + dy * dy);
              const px = -dy / dist, py = dx / dist;
              return (
                <g key={`ladder-${start}`} className="drop-shadow-sm">
                  <line x1={s.x + px} y1={s.y + py} x2={e.x + px} y2={e.y + py} stroke="#4b2c20" strokeWidth="0.8" strokeLinecap="round" />
                  <line x1={s.x - px} y1={s.y - py} x2={e.x - px} y2={e.y - py} stroke="#4b2c20" strokeWidth="0.8" strokeLinecap="round" />
                  {[0.2, 0.4, 0.6, 0.8].map(r => (<line key={r} x1={s.x + dx*r + px} y1={s.y + dy*r + py} x2={s.x + dx*r - px} y2={s.y + dy*r - py} stroke="#4b2c20" strokeWidth="0.5" />))}
                </g>
              );
            })}
            {Object.entries(SNAKES).map(([start, end]) => {
              const s = getCellCoords(parseInt(start));
              const e = getCellCoords(end);
              const color = getSnakeColor(parseInt(start));
              const path = `M ${s.x} ${s.y} C ${(s.x+e.x)/2 + 8} ${(s.y+e.y)/2 - 8}, ${(s.x+e.x)/2 - 8} ${(s.y+e.y)/2 + 8}, ${e.x} ${e.y}`;
              return (
                <g key={`snake-${start}`} className="drop-shadow-xl">
                  <path d={path} fill="none" stroke="black" strokeWidth="2.2" strokeLinecap="round" opacity="0.2" />
                  <path d={path} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
                  <path d={path} fill="none" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="0.5 2" opacity="0.4" />
                  <g transform={`translate(${s.x}, ${s.y})`}>
                    <circle r="2.5" fill={color} stroke="black" strokeWidth="0.3" />
                    <circle cx="-0.8" cy="-0.5" r="0.4" fill="white" />
                    <circle cx="0.8" cy="-0.5" r="0.4" fill="white" />
                  </g>
                </g>
              );
            })}
          </svg>
          <div className="absolute inset-0 z-[60] pointer-events-none">
            <div className="absolute w-8 h-8 transition-all duration-150 ease-out" style={{ left: `${sameCell ? hostCoords.x - 2.5 : hostCoords.x}%`, top: `${hostCoords.y}%`, transform: 'translate(-50%, -85%)' }}>
              <Pawn color="#4f46e5" />
            </div>
            <div className="absolute w-8 h-8 transition-all duration-150 ease-out" style={{ left: `${sameCell ? guestCoords.x + 2.5 : guestCoords.x}%`, top: `${guestCoords.y}%`, transform: 'translate(-50%, -85%)' }}>
              <Pawn color="#10b981" />
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-[110px] left-0 right-0 px-8 z-[150] flex flex-col items-center">
        {game.winner ? (
          <button onClick={confirmLeave} className="w-full max-w-[280px] bg-white text-black font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs animate-in slide-in-from-bottom-4 ring-2 ring-indigo-500/50">
            <LogOut size={18} /> Back to Lobby
          </button>
        ) : (
          <div className="flex flex-col items-center gap-4 w-full max-w-sm">
            {game.guestId && (
              <div className="flex justify-center gap-2 p-1.5 bg-slate-900/60 backdrop-blur-2xl border border-white/20 rounded-[2rem] ring-1 ring-white/5 shadow-2xl">
                {REACTIONS.map(r => (
                  <button key={r.label} onClick={() => sendEcho(r.icon)} className="w-10 h-10 flex flex-col items-center justify-center rounded-2xl bg-slate-800 border border-white/5 hover:bg-white/20 active:scale-90 transition-all group overflow-hidden">
                    <span className="text-lg grayscale group-hover:grayscale-0 transition-all">{r.icon}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-col items-center gap-0.5">
              <button disabled={!isMyTurn || rolling || isAnimating || !game.guestId} onClick={rollDice} className={`w-16 h-16 rounded-[1.25rem] transition-all active:scale-90 relative ${!isMyTurn || rolling || isAnimating || !game.guestId ? 'opacity-40 grayscale pointer-events-none' : 'hover:scale-110 shadow-[0_0_20px_rgba(79,70,229,0.2)]'}`}>
                <IsometricDie value={rolling ? rollingDiceValue : (game.lastDice || 1)} rolling={rolling} />
                {isMyTurn && game.guestId && !rolling && !isAnimating && (
                   <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center border-2 border-white animate-pulse"><Sparkles size={10} className="text-white" /></div>
                )}
              </button>
              <div className="text-center min-h-[12px] mt-1">
                {game.guestId && <p className={`text-[8px] font-black uppercase tracking-[0.2em] ${isMyTurn ? 'text-white' : 'text-slate-500'}`}>{isMyTurn ? "Roll Dice!" : "Opponent's Turn"}</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameTab;
