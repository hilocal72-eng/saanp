
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, UserProfile } from '../types';
import { dbService } from '../services/dbService';
import { LADDERS, SNAKES, BOARD_CELLS, STICKERS, SOUNDS } from '../constants';
import { 
  Trophy, Sword, Clock, Sparkles, LogOut, User, Bot, Hash, ArrowRight, Play, Zap, Loader2, Scissors, Pencil, Star, Image as ImageIcon, Volume2, VolumeX
} from 'lucide-react';

interface GameTabProps {
  myProfile: UserProfile | null;
  game: GameState | null;
  setGame: (g: GameState | null) => void;
  onProfileUpdate: (p: UserProfile | null) => void;
}

const TURN_TIMEOUT_SECONDS = 60;
const ECHO_DURATION = 4000;
const SYNC_INTERVAL = 2000;
const WALK_SPEED_MS = 250; 
const SLIDE_SPEED_MS = 700; 

const REACTIONS = [
  { icon: '😂', label: 'LOL' },
  { icon: '😭', label: 'NOOO' },
  { icon: '🐍', label: 'SNAKE!' },
];

const CARTOON_SNAKES = [
  { body: '#ec4899', stripe: '#a3e635' }, 
  { body: '#8b5cf6', stripe: '#3b82f6' }, 
  { body: '#22c55e', stripe: '#facc15' }, 
  { body: '#f97316', stripe: '#fde047' }, 
  { body: '#ef4444', stripe: '#ffffff' }, 
];

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
        <path d="M 100,5 L 103,14 L 112,14 L 105,20 L 108,29 L 100,23 L 92,29 L 95,20 L 88,14 L 97,14 Z" fill="url(#banner-gold)" className="animate-pulse" />
        <text fill="url(#banner-gold)" fontSize="10" fontWeight="900" className="uppercase tracking-tighter">
          <textPath href="#curve" startOffset="50%" textAnchor="middle">
            {isMe ? 'CONGRATULATIONS' : 'WELL PLAYED'}
          </textPath>
        </text>
        <g stroke="url(#banner-gold)" fill="none" strokeWidth="1.5">
          <path d="M 75,130 C 50,120 45,80 65,50" opacity="0.8" />
          <path d="M 125,130 C 150,120 155,80 135,50" opacity="0.8" />
        </g>
        <path d="M 40,145 C 70,135 130,135 160,145 L 165,175 C 130,165 70,165 35,175 Z" fill="url(#banner-gold)" stroke={isMuted ? "#1e293b" : "#4d3300"} strokeWidth="0.5" />
        <text x="100" y="160" textAnchor="middle" fill={isMuted ? "#f1f5f9" : "#4d3300"} fontSize={isMe ? "18" : "15"} fontWeight="900" className="italic tracking-tighter select-none">
          {isMe ? 'WINNER' : 'NICE TRY'}
        </text>
      </svg>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] flex items-center justify-center">
        {isMe ? (
          <GoldenTrophy size={110} isMuted={false} />
        ) : (
          <div className="text-7xl grayscale opacity-40 drop-shadow-xl animate-pulse select-none">
            😭
          </div>
        )}
      </div>
    </div>
  );
};

const BoardCelebration = ({ winnerName, isMe }: { winnerName: string, isMe: boolean }) => {
  const fireworkColors = ['#ffffff', '#fef08a', '#fbbf24', '#facc15', '#ef4444', '#3b82f6'];

  return (
    <div className="absolute inset-0 pointer-events-none z-[120] flex items-center justify-center bg-[#020d1a]/85 backdrop-blur-[1.5px] overflow-hidden rounded-lg">
      {isMe && (
        <div className="absolute inset-0">
          <FirecrackerBlast delay="0s" colorSet={fireworkColors} xOffset="50%" yOffset="50%" />
          <FirecrackerBlast delay="0.8s" colorSet={fireworkColors} xOffset="75%" yOffset="40%" />
        </div>
      )}
      <div className="relative flex flex-col items-center px-4 z-20">
        <div className="animate-winner-zoom flex flex-col items-center">
          <WinnerBannerDisplay isMe={isMe} />
          <div className="mt-2 flex flex-col items-center gap-2 bg-black/80 px-6 py-3 rounded-2xl border border-white/20 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-2">
              <Trophy size={18} className={isMe ? "text-yellow-400" : "text-indigo-400"} />
              <p className="text-white font-black text-xs uppercase tracking-[0.2em]">{isMe ? 'Victory!' : 'Better Luck Next Time!'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ReactionBubble: React.FC<{ text: string, visible: boolean }> = ({ text, visible }) => {
  if (!visible || !text) return null;
  const isImage = text.startsWith('http');
  
  return (
    <div className="absolute inset-0 flex items-center justify-center z-[500] pointer-events-none overflow-visible">
      <div className="animate-reaction-pop drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] select-none">
        {isImage ? (
          <img src={text} className="w-16 h-16 object-contain" alt="Reaction" />
        ) : (
          <span className="text-3xl">{text}</span>
        )}
      </div>
    </div>
  );
};

const Pawn = ({ color, className, isBitten, isHopping }: { color: string, className?: string, isBitten?: boolean, isHopping?: boolean }) => (
  <svg viewBox="0 0 40 60" className={`w-full h-full drop-shadow-[0_4px_4px_rgba(0,0,0,0.4)] transition-all duration-300 ${isBitten ? 'animate-bounce scale-110' : ''} ${isHopping ? '-translate-y-4' : 'translate-y-0'} ${className}`} style={{ color }}>
    <circle cx="20" cy="15" r="10" fill="currentColor" stroke="black" strokeWidth="3" />
    <path d="M20 25 C14 25 10 28 10 32 L6 50 C6 54 10 56 14 56 L26 56 C30 56 34 54 34 50 L30 32 C30 28 26 25 20 25 Z" fill="currentColor" stroke="black" strokeWidth="3" strokeLinejoin="round" />
  </svg>
);

const IsometricDie = ({ value, rolling }: { value: number, rolling: boolean }) => (
  <svg viewBox="0 0 100 100" className={`w-full h-full transition-all duration-150 drop-shadow-[0_8px_15px_rgba(0,0,0,0.4)] ${rolling ? 'animate-dice-tumble' : 'animate-dice-settle'}`}>
    <defs>
      <linearGradient id="die-top" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ff5f5f" />
        <stop offset="100%" stopColor="#ef4444" />
      </linearGradient>
      <linearGradient id="die-side-1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#dc2626" />
        <stop offset="100%" stopColor="#991b1b" />
      </linearGradient>
      <linearGradient id="die-side-2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#b91c1c" />
        <stop offset="100%" stopColor="#7f1d1d" />
      </linearGradient>
    </defs>
    <g transform="translate(25, 20)">
      <path d="M25 0 L50 15 L25 30 L0 15 Z" fill="url(#die-top)" stroke="#7f1d1d" strokeWidth="1.5" />
      <path d="M0 15 L25 30 L25 60 L0 45 Z" fill="url(#die-side-1)" stroke="#7f1d1d" strokeWidth="1.5" />
      <path d="M25 30 L50 15 L50 45 L25 60 Z" fill="url(#die-side-2)" stroke="#7f1d1d" strokeWidth="1.5" />
      <g className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
         {value === 1 && <circle cx="25" cy="15" r="4.5" fill="white" />}
         {value === 2 && (<><circle cx="15" cy="10" r="3.5" fill="white" /><circle cx="35" cy="20" r="3.5" fill="white" /></>)}
         {value === 3 && (<><circle cx="15" cy="10" r="3.5" fill="white" /><circle cx="25" cy="15" r="3.5" fill="white" /><circle cx="35" cy="20" r="3.5" fill="white" /></>)}
         {value === 4 && (<><circle cx="15" cy="10" r="3.5" fill="white" /><circle cx="35" cy="10" r="3.5" fill="white" /><circle cx="15" cy="20" r="3.5" fill="white" /><circle cx="35" cy="20" r="3.5" fill="white" /></>)}
         {value === 5 && (<><circle cx="15" cy="10" r="3.5" fill="white" /><circle cx="35" cy="10" r="3.5" fill="white" /><circle cx="25" cy="15" r="3.5" fill="white" /><circle cx="15" cy="20" r="3.5" fill="white" /><circle cx="35" cy="20" r="3.5" fill="white" /></>)}
         {value === 6 && (<><circle cx="15" cy="8" r="3" fill="white" /><circle cx="25" cy="8" r="3" fill="white" /><circle cx="35" cy="8" r="3" fill="white" /><circle cx="15" cy="22" r="3" fill="white" /><circle cx="25" cy="22" r="3" fill="white" /><circle cx="35" cy="22" r="3" fill="white" /></>)}
      </g>
    </g>
  </svg>
);

const GameTab: React.FC<GameTabProps> = ({ myProfile, game, setGame, onProfileUpdate }) => {
  const [inputCode, setInputCode] = useState('');
  const [rolling, setRolling] = useState(false);
  const [rollingDiceValue, setRollingDiceValue] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [visualHostPos, setVisualHostPos] = useState(game?.hostPos || 1);
  const [visualGuestPos, setVisualGuestPos] = useState(game?.guestPos || 1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isHopping, setIsHopping] = useState<'host' | 'guest' | null>(null);
  const [isSpecialMove, setIsSpecialMove] = useState<'host' | 'guest' | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState(TURN_TIMEOUT_SECONDS);
  const [turnStartTime, setTurnStartTime] = useState<number>(Date.now());
  const [isMuted, setIsMuted] = useState(false);
  
  // Persistent Visual Turn focus for 'Final Landing' logic
  const [currentVisualTurn, setCurrentVisualTurn] = useState<'host' | 'guest'>(game?.turn || 'host');
  
  const gameRef = useRef<GameState | null>(game);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const lastSyncTimeRef = useRef<number>(0);

  useEffect(() => {
    Object.entries(SOUNDS).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      audioRefs.current[key] = audio;
    });
  }, []);

  const playSound = useCallback((soundKey: keyof typeof SOUNDS) => {
    if (isMuted) return;
    const audio = audioRefs.current[soundKey];
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(e => console.debug('Audio blocked'));
    }
  }, [isMuted]);

  const favStickers = STICKERS.filter(s => myProfile?.favouriteStickers?.includes(s.id));

  useEffect(() => { 
    gameRef.current = game;
    if (game?.lastUpdated) lastSyncTimeRef.current = Math.max(lastSyncTimeRef.current, game.lastUpdated);
  }, [game]);

  useEffect(() => {
    if (game && !isAnimating) {
       setVisualHostPos(game.hostPos);
       setVisualGuestPos(game.guestPos);
       setCurrentVisualTurn(game.turn); 
    }
  }, [game?.id]);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  useEffect(() => {
    if (!game || game.winner || !game.guestId) {
      setTimeLeft(TURN_TIMEOUT_SECONDS);
      return;
    }
    const elapsed = Math.floor((Date.now() - turnStartTime) / 1000);
    const remaining = Math.max(0, TURN_TIMEOUT_SECONDS - elapsed);
    setTimeLeft(remaining);
    const interval = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [game?.turn, turnStartTime, game?.winner, game?.guestId, game?.id]);

  useEffect(() => {
    if (game && !game.winner && game.guestId) {
      setTurnStartTime(Date.now());
    }
  }, [game?.turn, game?.id, game?.guestId]);

  useEffect(() => {
    const handleTimeout = async () => {
      if (timeLeft === 0 && game && !game.winner && game.guestId && !rolling && !isAnimating) {
        const isHostTurn = game.turn === 'host';
        const winnerId = isHostTurn ? game.guestId! : game.hostId;
        const isMeWinning = winnerId === myProfile?.uniqueId;
        
        // Timeout win - play sound immediately as there is no movement to finish line
        playSound(isMeWinning ? 'WIN' : 'LOSS');
        
        const update = { ...game, winner: winnerId, lastUpdated: Date.now() };
        setGame(update);
        if (!game.isBotGame) await dbService.updateGame(update);
        if (myProfile) await dbService.incrementStats(myProfile.uniqueId, isMeWinning, !!game.isBotGame);
      }
    };
    handleTimeout();
  }, [timeLeft, game?.winner, myProfile?.uniqueId, playSound, rolling, isAnimating]);

  useEffect(() => {
    if (game && game.isBotGame && game.guestId === "FoxyBot" && game.turn === "guest" && !game.winner && !rolling && !isAnimating) {
      const timer = setTimeout(() => rollDice(), 1500);
      return () => clearTimeout(timer);
    }
  }, [game?.turn, game?.isBotGame, game?.winner, rolling, isAnimating]);

  const handleQuit = async () => {
    if (!game || !myProfile) return;
    
    // If the game is already finished, "Quit" (header button) just acts as Return to Lobby
    if (game.winner) {
      setGame(null);
      return;
    }

    // Handle Active Forfeit
    if (game.guestId) {
      const isHost = game.hostId === myProfile.uniqueId;
      const opponentId = isHost ? game.guestId : game.hostId;
      
      const update = { ...game, winner: opponentId, lastUpdated: Date.now() };
      
      // Update state immediately to show the Result Screen (Loss)
      setGame(update);
      playSound('LOSS');

      // Update backend only for real games
      if (!game.isBotGame) {
        try {
          await dbService.updateGame(update);
        } catch (e) { console.error("Forfeit sync failed", e); }
      }
      
      // Record the loss in stats
      await dbService.incrementStats(myProfile.uniqueId, false, !!game.isBotGame);
    } else {
      // If quitting before game even starts (waiting for opponent), just exit
      setGame(null);
    }
  };

  // Movement Effect: Updated to trigger Visual Turn shift on 'Final Landing'
  useEffect(() => {
    if (!game || isHopping || isSpecialMove || rolling) return;

    const targetHost = game.hostPos;
    const targetGuest = game.guestPos;

    // Derived landing positions for local animation
    let landHost = game.hostLandingPos || targetHost;
    let landGuest = game.guestLandingPos || targetGuest;

    if (visualHostPos !== targetHost && !game.hostLandingPos) {
       landHost = Math.min(BOARD_CELLS, visualHostPos + (game.hostLastDice || game.lastDice || 0));
       if (landHost > BOARD_CELLS) landHost = visualHostPos;
    }
    if (visualGuestPos !== targetGuest && !game.guestLandingPos) {
       landGuest = Math.min(BOARD_CELLS, visualGuestPos + (game.guestLastDice || game.lastDice || 0));
       if (landGuest > BOARD_CELLS) landGuest = visualGuestPos;
    }

    // FINAL LANDING LOGIC
    if (visualHostPos === targetHost && visualGuestPos === targetGuest) {
      if (isAnimating) {
        setIsAnimating(false);
        setCurrentVisualTurn(game.turn); 
        
        // Play win/loss sound when pawn physically lands on 100
        if (targetHost === 100 || targetGuest === 100) {
          if (game.winner && myProfile) {
            playSound(game.winner === myProfile.uniqueId ? 'WIN' : 'LOSS');
          }
        }
      }
      return;
    }

    setIsAnimating(true);
    if (visualHostPos !== targetHost) setCurrentVisualTurn('host');
    else if (visualGuestPos !== targetGuest) setCurrentVisualTurn('guest');

    const moveStep = (
      current: number, 
      landing: number, 
      target: number, 
      player: 'host' | 'guest', 
      setter: React.Dispatch<React.SetStateAction<number>>
    ) => {
      if (current !== landing) {
        const nextCell = current < landing ? current + 1 : current - 1;
        setIsHopping(player);
        playSound('MOVE');
        setTimeout(() => {
          setter(nextCell);
          setIsHopping(null);
        }, WALK_SPEED_MS);
      } 
      else if (landing !== target) {
        setIsSpecialMove(player);
        const isSnake = target < landing;
        playSound(isSnake ? 'SNAKE' : 'LADDER');
        setTimeout(() => {
           setter(target);
           setIsSpecialMove(null);
        }, SLIDE_SPEED_MS);
      }
    };

    const timer = setTimeout(() => {
      if (visualHostPos !== targetHost) {
        moveStep(visualHostPos, landHost, targetHost, 'host', setVisualHostPos);
      } else if (visualGuestPos !== targetGuest) {
        moveStep(visualGuestPos, landGuest, targetGuest, 'guest', setVisualGuestPos);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [visualHostPos, visualGuestPos, game?.hostPos, game?.guestPos, game?.hostLandingPos, game?.guestLandingPos, game?.lastDice, game?.hostLastDice, game?.guestLastDice, game?.turn, game?.winner, isHopping, isSpecialMove, rolling, playSound, isAnimating, myProfile]);

  useEffect(() => {
    let interval: any;
    if (game && myProfile && !game.isBotGame) {
      interval = setInterval(async () => {
        try {
          const remote = await dbService.getGameByCode(game.code);
          if (!remote) { setGame(null); return; }
          const current = gameRef.current;
          if (!current || current.id !== remote.id) return;
          if (remote.lastUpdated && remote.lastUpdated > lastSyncTimeRef.current) {
            lastSyncTimeRef.current = remote.lastUpdated;
            
            // Handle forfeit/quit sound: if winner declared but no movement involved
            if (remote.winner && !current.winner) {
               const noMovementToGoal = (remote.hostPos !== 100 && remote.guestPos !== 100);
               if (noMovementToGoal) {
                 playSound(remote.winner === myProfile.uniqueId ? 'WIN' : 'LOSS');
               }
            }
            setGame(remote);
          }
        } catch (e) {}
      }, SYNC_INTERVAL);
    }
    return () => clearInterval(interval);
  }, [game?.id, game?.code, myProfile?.uniqueId, playSound]);

  const sendEcho = async (icon: string) => {
    if (!game || !myProfile) return;
    const isHost = game.hostId === myProfile.uniqueId;
    const timestamp = Date.now();
    const update = { ...game, [isHost ? 'hostReaction' : 'guestReaction']: `${icon}|${timestamp}`, lastUpdated: timestamp };
    setGame(update);
    if (!game.isBotGame) await dbService.updateGame(update);
  };

  const createGame = async (isBot: boolean = false) => {
    if (!myProfile) return;
    setLoading(true);
    try {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      const newGame = await dbService.hostGame(myProfile.uniqueId, myProfile.avatarUrl, code, isBot);
      setGame(newGame);
      setVisualHostPos(1);
      setVisualGuestPos(1);
      setCurrentVisualTurn('host');
      setTurnStartTime(Date.now());
    } catch (e) { setFeedback({ type: 'error', message: 'Hosting failed.' }); }
    finally { setLoading(false); }
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
        setCurrentVisualTurn(result.game.turn);
        setTurnStartTime(Date.now());
      } else setFeedback({ type: 'error', message: 'Invalid Code' });
    } catch (e) { setFeedback({ type: 'error', message: 'Join failed.' }); }
    finally { setLoading(false); }
  };

  const rollDice = async () => {
    const currentG = gameRef.current;
    if (!currentG || rolling || isAnimating || currentG.winner || !myProfile) return;
    
    setRolling(true);
    setIsAnimating(true);
    setCurrentVisualTurn(currentG.turn); 

    const diceValue = Math.floor(Math.random() * 6) + 1;
    const frames = 6;
    for (let i = 0; i < frames; i++) {
      setRollingDiceValue(Math.floor(Math.random() * 6) + 1);
      await new Promise(r => setTimeout(r, 80));
    }
    setRollingDiceValue(diceValue);
    
    const isHostTurn = currentG.turn === 'host';
    const currentPos = isHostTurn ? currentG.hostPos : currentG.guestPos;
    
    let landing = currentPos + diceValue;
    if (landing > BOARD_CELLS) landing = currentPos;
    
    const finalPos = LADDERS[landing] || SNAKES[landing] || landing;
    const winnerId = finalPos === BOARD_CELLS ? (isHostTurn ? currentG.hostId : currentG.guestId!) : undefined;
    
    const timestamp = Date.now();
    const update: GameState = { 
      ...currentG, 
      hostPos: isHostTurn ? finalPos : currentG.hostPos, 
      guestPos: !isHostTurn ? finalPos : currentG.guestPos, 
      hostLandingPos: isHostTurn ? landing : currentG.hostLandingPos,
      guestLandingPos: !isHostTurn ? landing : currentG.guestLandingPos,
      lastDice: diceValue, 
      hostLastDice: isHostTurn ? diceValue : (currentG.hostLastDice || 0), 
      guestLastDice: !isHostTurn ? diceValue : (currentG.guestLastDice || 0), 
      turn: (currentG.turn === 'host' ? 'guest' : 'host') as any, 
      winner: winnerId, 
      lastUpdated: timestamp
    };
    
    lastSyncTimeRef.current = timestamp;
    setGame(update);
    if (!currentG.isBotGame) await dbService.updateGame(update);
    
    if (winnerId && myProfile) {
      await dbService.incrementStats(myProfile.uniqueId, winnerId === myProfile.uniqueId, !!currentG.isBotGame);
    }
    
    setTimeout(() => {
      setRolling(false);
    }, 400);
  };

  const getCellCoords = (cell: number) => {
    const row = Math.floor((cell - 1) / 10);
    const col = (cell - 1) % 10;
    const x = (row % 2 === 0 ? col : 9 - col) * 10 + 5;
    const y = (9 - row) * 10 + 5;
    return { x, y };
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
          </div>
        );
      }
    }
    return cells;
  };

  const generateWigglyPath = (s: {x: number, y: number}, e: {x: number, y: number}, idx: number) => {
    const dx = e.x - s.x, dy = e.y - s.y, len = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / len, ny = dx / len, segments = 4, amp = 3.5 + (idx % 2);
    let d = `M ${s.x} ${s.y}`;
    for (let i = 1; i <= segments; i++) {
      const t = i / segments, prevT = (i - 1) / segments, midT = (t + prevT) / 2;
      const targetX = s.x + dx * t, targetY = s.y + dy * t;
      const offset = (i % 2 === 0 ? 1 : -1) * amp;
      const cpX = s.x + dx * midT + nx * offset, cpY = s.y + dy * midT + ny * offset;
      d += ` Q ${cpX} ${cpY} ${targetX} ${targetY}`;
    }
    return { d, firstCP: {x: s.x + dx * 0.125 + nx * -amp, y: s.y + dy * 0.125 + ny * -amp} };
  };

  if (!game) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-slate-950 p-6 sm:p-8 animate-in fade-in duration-700 relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-40 mix-blend-screen saturate-150" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=2070')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-950/20 via-slate-950/80 to-slate-950" />
        <div className="relative z-10 flex-1 flex flex-col justify-center items-center w-full max-w-sm mx-auto">
          <div className="text-center flex flex-col items-center gap-2 mb-20 animate-in zoom-in-95 duration-1000">
            <div className="relative transform hover:scale-110 transition-transform duration-700 mb-6 flex flex-col items-center">
              <GoldenTrophy size={80} className="relative z-10" />
              <div className="absolute inset-0 bg-white blur-3xl opacity-10 animate-pulse" />
            </div>
            <div className="relative flex flex-col items-center select-none">
              <h1 className="text-7xl font-black tracking-[-0.08em] uppercase italic leading-[0.6] font-righteous text-arena-title animate-title-float">ARENA</h1>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-px w-10 bg-indigo-500/50" />
                <h2 className="text-3xl font-black text-indigo-400 tracking-[0.2em] uppercase italic leading-tight font-righteous animate-subtitle-pulse">BATTLE</h2>
                <div className="h-px w-10 bg-indigo-500/50" />
              </div>
            </div>
          </div>
          <div className="w-full flex flex-col gap-10 items-center px-4 mb-16 relative">
            <button disabled={loading} onClick={() => createGame(false)} className="w-[220px] -translate-x-12 bg-slate-900/40 backdrop-blur-3xl border border-indigo-500/30 rounded-full h-16 transition-all hover:scale-105 active:scale-95 animate-float-x">
              <div className="flex items-center gap-4 px-6 h-full">
                <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white border border-white/20 shadow-[0_0_15px_rgba(79,70,229,0.8)]"><Sword size={18} /></div>
                <span className="text-xs font-black text-white uppercase italic tracking-widest drop-shadow-md text-glow-indigo">HOST ARENA</span>
              </div>
            </button>
            <button disabled={loading} onClick={() => createGame(true)} className="w-[220px] translate-x-12 bg-slate-900/40 backdrop-blur-3xl border border-emerald-500/30 rounded-full h-16 transition-all hover:scale-105 active:scale-95 animate-float-x-delayed">
              <div className="flex items-center gap-4 px-6 h-full">
                <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white border border-white/20 shadow-[0_0_15px_rgba(16,185,129,0.8)]"><Bot size={18} /></div>
                <span className="text-xs font-black text-white uppercase italic tracking-widest drop-shadow-md text-glow-emerald">BATTLE WITH AI</span>
              </div>
            </button>
            <div className="w-full max-w-[310px] mt-6 group/join animate-in slide-in-from-bottom-8 duration-700">
              <div className="relative p-[1.5px] rounded-[2.5rem] bg-gradient-to-tr from-indigo-500 via-white/20 to-indigo-400 shadow-2xl">
                <div className="bg-[#0a0f1e]/95 rounded-[2.4rem] p-6 flex flex-col gap-4">
                  <div className="flex items-center gap-2 mb-0.5 px-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_15px_#818cf8]" />
                    <h3 className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.4em]">Join Arena</h3>
                  </div>
                  <div className="relative flex items-center">
                    <input type="text" maxLength={4} value={inputCode} onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))} placeholder="CODE" className="flex-1 bg-[#020617]/90 rounded-[1.8rem] border border-white/10 px-6 py-4 text-white font-black tracking-[0.5em] outline-none focus:border-indigo-400" />
                    <button onClick={joinGame} disabled={loading || inputCode.length !== 4} className={`ml-3 w-11 h-11 rounded-2xl flex items-center justify-center border border-white/20 ${inputCode.length === 4 ? 'bg-indigo-500 text-white shadow-lg' : 'bg-slate-900 text-slate-700 opacity-60'}`}>
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={18} strokeWidth={4} />}
                    </button>
                  </div>
                </div>
              </div>
              {feedback && <p className="mt-4 text-[9px] font-black text-rose-500 text-center uppercase tracking-widest">{feedback.message}</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hostCoords = getCellCoords(visualHostPos);
  const guestCoords = getCellCoords(visualGuestPos);
  const sameCell = visualHostPos === visualGuestPos;

  const isMyTurn = (game.turn === 'host' && game.hostId === myProfile?.uniqueId) || 
                   (game.turn === 'guest' && game.guestId === myProfile?.uniqueId);
  const isRollButtonDisabled = !isMyTurn || rolling || isAnimating || !game.guestId;

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 text-white overflow-hidden relative pb-32">
      <div className="px-6 py-4 flex items-center justify-between border-b border-white/10 bg-slate-900/50 backdrop-blur-md z-[50]">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Sword size={12} className="text-amber-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400 animate-pulse text-glow-yellow">Arena #{game.code}</span>
          </div>
          {favStickers.length === 0 && (
            <p className="text-[7px] font-black text-indigo-400/80 uppercase tracking-[0.2em] animate-pulse mt-1">SET FAV STICKERS IN PROFILE TO REACT!</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsMuted(!isMuted)} className="p-2 bg-slate-800 rounded-lg border border-white/10 active:scale-90">{isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}</button>
          <button onClick={handleQuit} className="px-3 py-1.5 bg-rose-500 text-white rounded-lg text-[9px] font-black border border-white/20 active:scale-90 uppercase">QUIT</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col items-center">
        <div className="flex justify-center items-center gap-3 mb-6 mt-6 sticky top-0 z-[400] w-full">
           <div className={`px-2 py-1.5 rounded-xl border flex flex-col items-center min-w-[95px] relative transition-all duration-300 ${currentVisualTurn === 'host' ? 'bg-indigo-600 border-white scale-105 shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'bg-slate-800 border-white/10 opacity-80'}`}>
              <ReactionBubble text={game.hostReaction?.split('|')[0] || ''} visible={!!game.hostReaction && Date.now() - parseInt(game.hostReaction.split('|')[1] || '0') < ECHO_DURATION} />
              {currentVisualTurn === 'host' && !game.winner && game.guestId && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-indigo-700 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg ring-2 ring-indigo-500/50 z-[20] animate-in slide-in-from-top-2"><Clock size={10} strokeWidth={3} className="animate-pulse" /><span className="text-[10px] font-black tabular-nums">{timeLeft}s</span></div>}
              <span className="text-base font-black text-white leading-none">{game.hostLastDice || '-'}</span>
              <span className="text-[8px] font-black uppercase tracking-widest truncate max-w-[70px] mt-0.5">{game.hostId}</span>
           </div>
           <div className={`px-2 py-1.5 rounded-xl border flex flex-col items-center min-w-[95px] relative transition-all duration-300 ${currentVisualTurn === 'guest' ? 'bg-emerald-600 border-white scale-105 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-slate-800 border-white/10 opacity-80'}`}>
              <ReactionBubble text={game.guestReaction?.split('|')[0] || ''} visible={!!game.guestReaction && Date.now() - parseInt(game.guestReaction.split('|')[1] || '0') < ECHO_DURATION} />
              {currentVisualTurn === 'guest' && !game.winner && game.guestId && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-emerald-700 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg ring-2 ring-emerald-500/50 z-[20] animate-in slide-in-from-top-2"><Clock size={10} strokeWidth={3} className="animate-pulse" /><span className="text-[10px] font-black tabular-nums">{timeLeft}s</span></div>}
              <span className="text-base font-black text-white leading-none">{game.guestLastDice || '-'}</span>
              <span className="text-[8px] font-black uppercase tracking-widest truncate max-w-[70px] mt-0.5">{game.guestId || 'WAITING'}</span>
           </div>
        </div>

        <div className="w-full max-w-full mx-auto bg-white rounded-xl border-[4px] border-slate-900 shadow-2xl relative aspect-square mb-6 z-[60] overflow-hidden">
          <div className="absolute inset-0 flex flex-wrap z-10 rounded-lg">{renderBoard()}</div>
          {game.winner && <BoardCelebration winnerName={game.winner} isMe={game.winner === myProfile?.uniqueId} />}
          <svg className="absolute inset-0 pointer-events-none z-[40] w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {Object.entries(LADDERS).map(([start, end]) => {
              const s = getCellCoords(parseInt(start)), e = getCellCoords(end);
              const dx = e.x - s.x, dy = e.y - s.y, dist = Math.sqrt(dx * dx + dy * dy);
              const px = -dy / dist, py = dx / dist;
              const rungCount = Math.max(3, Math.floor(dist / 6));
              const rungSteps = Array.from({ length: rungCount }, (_, i) => (i + 1) / (rungCount + 1));
              return (
                <g key={`ladder-${start}`} className="drop-shadow-lg">
                  <line x1={s.x + px*0.8} y1={s.y + py*0.8} x2={e.x + px*0.8} y2={e.y + py*0.8} stroke="#fbbf24" strokeWidth="0.8" strokeLinecap="round" />
                  <line x1={s.x - px*0.8} y1={s.y - py*0.8} x2={e.x - px*0.8} y2={e.y - py*0.8} stroke="#fbbf24" strokeWidth="0.8" strokeLinecap="round" />
                  {rungSteps.map(r => (<line key={r} x1={s.x + dx*r + px*0.8} y1={s.y + dy*r + py*0.8} x2={s.x + dx*r - px*0.8} y2={s.y + dy*r - px*0.8} stroke="#fbbf24" strokeWidth="0.5" strokeLinecap="round" />))}
                </g>
              );
            })}
            {Object.entries(SNAKES).map(([start, end], idx) => {
              const s = getCellCoords(parseInt(start)), e = getCellCoords(end), colors = CARTOON_SNAKES[idx % CARTOON_SNAKES.length];
              const { d, firstCP } = generateWigglyPath(s, e, idx);
              const angle = Math.atan2(firstCP.y - s.y, firstCP.x - s.x) * (180 / Math.PI);
              return (
                <g key={`snake-${start}`} className="drop-shadow-md">
                  <path d={d} fill="none" stroke={colors.body} strokeWidth="1.2" strokeLinecap="round" />
                  <path d={d} fill="none" stroke={colors.stripe} strokeWidth="1.2" strokeLinecap="butt" strokeDasharray="3 4" opacity="0.8" />
                  <g transform={`translate(${s.x}, ${s.y}) rotate(${angle})`}>
                    <ellipse cx="0.8" cy="0" rx="2.2" ry="1.4" fill={colors.body} />
                    <circle cx="1.5" cy="-0.6" r="0.3" fill="black" />
                    <circle cx="1.5" cy="0.6" r="0.3" fill="black" />
                  </g>
                </g>
              );
            })}
          </svg>
          <div className="absolute inset-0 z-[60] pointer-events-none">
            <div className="absolute w-8 h-8 transition-all duration-300 ease-out" style={{ left: `${sameCell ? hostCoords.x - 2.5 : hostCoords.x}%`, top: `${hostCoords.y}%`, transform: 'translate(-50%, -85%)' }}>
               <Pawn color="#4f46e5" isBitten={isSpecialMove === 'host' && visualHostPos < (game.hostLandingPos || visualHostPos)} isHopping={isHopping === 'host'} />
            </div>
            <div className="absolute w-8 h-8 transition-all duration-300 ease-out" style={{ left: `${sameCell ? guestCoords.x + 2.5 : guestCoords.x}%`, top: `${guestCoords.y}%`, transform: 'translate(-50%, -85%)' }}>
               <Pawn color="#10b981" isBitten={isSpecialMove === 'guest' && visualGuestPos < (game.guestLandingPos || visualGuestPos)} isHopping={isHopping === 'guest'} />
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-[110px] left-0 right-0 px-8 z-[150] flex flex-col items-center">
        {game.winner ? (
          <button onClick={() => setGame(null)} className="w-full max-w-[280px] bg-white text-black font-black py-4 rounded-2xl shadow-xl active:scale-95 uppercase tracking-widest text-xs ring-2 ring-indigo-500/50 flex items-center justify-center gap-3"><LogOut size={18} /> Back to Lobby</button>
        ) : (
          <div className="flex flex-col items-center gap-4 w-full max-w-sm">
            {game.guestId && (
              <div className="flex flex-col items-center gap-3 w-full">
                <div className="flex gap-2 p-1.5 bg-slate-900/60 backdrop-blur-2xl border border-white/20 rounded-[2rem] shadow-2xl px-3 overflow-x-auto no-scrollbar">
                  {REACTIONS.map(r => (<button key={r.label} onClick={() => sendEcho(r.icon)} className="w-10 h-10 shrink-0 flex items-center justify-center rounded-2xl bg-slate-800 border border-white/5 active:scale-90"><span className="text-lg">{r.icon}</span></button>))}
                  {favStickers.length > 0 && <div className="flex gap-2 border-l border-white/10 pl-2">{favStickers.map(s => (<button key={s.id} onClick={() => sendEcho(s.image)} className="w-10 h-10 shrink-0 flex items-center justify-center rounded-2xl bg-slate-800 border border-white/5 active:scale-90"><img src={s.image} className="w-7 h-7 object-contain" alt={s.name} /></button>))}</div>}
                </div>
              </div>
            )}
            <button disabled={isRollButtonDisabled} onClick={rollDice} className={`w-16 h-16 rounded-[1.25rem] transition-all active:scale-90 relative ${isRollButtonDisabled ? 'opacity-40 grayscale' : 'hover:scale-110 shadow-lg'}`}><IsometricDie value={rolling ? rollingDiceValue : (game.lastDice || 1)} rolling={rolling} />{isMyTurn && game.guestId && !rolling && !isAnimating && <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center border-2 border-white animate-pulse"><Sparkles size={10} className="text-white" /></div>}</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameTab;
