import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, UserProfile } from '../types';
import { dbService } from '../services/dbService';
import { LADDERS, SNAKES, BOARD_CELLS } from '../constants';
import { 
  Trophy, Sword, Clock, Sparkles, LogOut, User, Bot, Hash, ArrowRight, Play, Zap, Loader2, Scissors, Pencil, Star
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
const WALK_SPEED_MS = 300; // Slower for visibility
const SLIDE_SPEED_MS = 800; // Slower slide

const REACTIONS = [
  { icon: '😂', label: 'LOL' },
  { icon: '😭', label: 'NOOO' },
  { icon: '🤬', label: 'RAGE' },
  { icon: '🐍', label: 'SNAKE!' },
  { icon: '😎', label: 'COOL' },
  { icon: '❤️', label: 'LOVE' }
];

const SNAKE_COLORS = ['#22c55e', '#ef4444', '#a855f7', '#3b82f6', '#f59e0b'];

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
  return (
    <div className="absolute inset-0 flex items-center justify-center z-[500] pointer-events-none overflow-visible">
      <div className="text-3xl animate-reaction-pop drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] select-none">{text}</div>
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
  <svg viewBox="0 0 100 100" className={`w-full h-full transition-all duration-150 drop-shadow-[0_8px_15px_rgba(0,0,0,0.4)] ${rolling ? 'animate-dice-tumble scale-110' : 'animate-dice-settle'}`}>
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
  
  // Track visual positions separately to animate them
  const [visualHostPos, setVisualHostPos] = useState(game?.hostPos || 1);
  const [visualGuestPos, setVisualGuestPos] = useState(game?.guestPos || 1);
  
  const [isAnimating, setIsAnimating] = useState(false);
  const [isHopping, setIsHopping] = useState<'host' | 'guest' | null>(null);
  const [isSpecialMove, setIsSpecialMove] = useState<'host' | 'guest' | null>(null); // For snakes/ladders
  
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState(TURN_TIMEOUT_SECONDS);
  
  // Track turn start locally to avoid timer resets on tab switching (since component stays mounted)
  const [turnStartTime, setTurnStartTime] = useState<number>(Date.now());
  const gameRef = useRef<GameState | null>(game);

  useEffect(() => { gameRef.current = game; }, [game]);

  // Sync visual positions on first load or if game is reset
  useEffect(() => {
    if (game && !isAnimating) {
       setVisualHostPos(game.hostPos);
       setVisualGuestPos(game.guestPos);
    }
  }, [game?.id]);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Turn Timer logic: Uses local turnStartTime which is only reset when the turn changes
  useEffect(() => {
    // DO NOT start the timer if no opponent has joined yet
    if (!game || game.winner || !game.guestId) {
      setTimeLeft(TURN_TIMEOUT_SECONDS);
      return;
    }

    const elapsed = Math.floor((Date.now() - turnStartTime) / 1000);
    const remaining = Math.max(0, TURN_TIMEOUT_SECONDS - elapsed);
    setTimeLeft(remaining);

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [game?.turn, turnStartTime, game?.winner, game?.guestId, game?.id]);

  // Reset local turn timer whenever the turn changes OR a guest joins
  useEffect(() => {
    // Only reset the start point if the game is active and has an opponent
    if (game && !game.winner && game.guestId) {
      setTurnStartTime(Date.now());
    }
  }, [game?.turn, game?.id, game?.guestId]);

  // Handle Turn Expiry (Game Over on Time Out)
  useEffect(() => {
    const handleTimeout = async () => {
      if (timeLeft === 0 && game && !game.winner && game.guestId) {
        // Current turn player loses
        const isHostTurn = game.turn === 'host';
        const winnerId = isHostTurn ? game.guestId! : game.hostId;
        
        const update = { 
          ...game, 
          winner: winnerId, 
          lastUpdated: Date.now() 
        };
        
        setGame(update);
        if (!game.isBotGame) await dbService.updateGame(update);
        if (myProfile) await dbService.incrementStats(myProfile.uniqueId, winnerId === myProfile.uniqueId);
      }
    };
    handleTimeout();
  }, [timeLeft, game?.winner]);

  // Bot Turn Logic
  useEffect(() => {
    // Standardized check for bot name "CHIP"
    if (game && game.isBotGame && game.guestId === "CHIP" && game.turn === "guest" && !game.winner && !rolling && !isAnimating) {
      const timer = setTimeout(() => rollDice(), 1500);
      return () => clearTimeout(timer);
    }
  }, [game?.turn, game?.isBotGame, game?.winner, rolling, isAnimating, game?.guestId]);

  // --- REFINED MOVEMENT EFFECT ---
  useEffect(() => {
    if (!game) return;
    
    const movePawn = (current: number, target: number, player: 'host' | 'guest', setter: React.Dispatch<React.SetStateAction<number>>) => {
      if (current === target) return;

      setIsAnimating(true);

      // Check for special landing spots (Snake head or Ladder foot)
      const snakeEnd = SNAKES[current];
      const ladderEnd = LADDERS[current];

      // If we are EXACTLY at the start of a snake/ladder AND that snake/ladder leads to our FINAL target
      // This ensures we only take the slide/climb AFTER walking to it step-by-step
      if ((snakeEnd === target || ladderEnd === target)) {
        setIsSpecialMove(player);
        setTimeout(() => {
           setter(target);
           setIsSpecialMove(null);
        }, SLIDE_SPEED_MS);
        return;
      }

      // Normal step-by-step walk
      setIsHopping(player);
      setTimeout(() => {
        setIsHopping(null);
        // Step forward incrementally
        setter(prev => prev + 1);
      }, WALK_SPEED_MS);
    };

    if (visualHostPos !== game.hostPos) {
      movePawn(visualHostPos, game.hostPos, 'host', setVisualHostPos);
    } else if (visualGuestPos !== game.guestPos) {
      movePawn(visualGuestPos, game.guestPos, 'guest', setVisualGuestPos);
    } else {
      setIsAnimating(false);
    }
  }, [game?.hostPos, game?.guestPos, visualHostPos, visualGuestPos]);

  useEffect(() => {
    let interval: any;
    if (game && myProfile && !game.isBotGame) {
      interval = setInterval(async () => {
        try {
          const remote = await dbService.getGameByCode(game.code);
          if (!remote) { setGame(null); return; }
          const current = gameRef.current;
          if (!current || current.id !== remote.id) return;
          if (remote.lastUpdated !== current.lastUpdated) setGame(remote);
        } catch (e) {}
      }, SYNC_INTERVAL);
    }
    return () => clearInterval(interval);
  }, [game?.id, game?.code, myProfile?.uniqueId]);

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
        setInputCode(''); 
        setTurnStartTime(Date.now());
      }
      else setFeedback({ type: 'error', message: 'Invalid Code' });
    } catch (e) { setFeedback({ type: 'error', message: 'Join failed.' }); }
    finally { setLoading(false); }
  };

  const rollDice = async () => {
    const currentG = gameRef.current;
    if (!currentG || rolling || isAnimating || currentG.winner || !myProfile) return;
    setRolling(true);
    const diceValue = Math.floor(Math.random() * 6) + 1;
    
    // Smooth tumble animation with 16 frames
    const frames = 16;
    for (let i = 0; i < frames; i++) {
      setRollingDiceValue(Math.floor(Math.random() * 6) + 1);
      // Accelerate then decelerate slightly
      const delay = i < frames / 2 ? 60 : 60 + (i - frames / 2) * 15;
      await new Promise(r => setTimeout(r, delay));
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
      lastDice: diceValue, 
      hostLastDice: isHostTurn ? diceValue : (currentG.hostLastDice || 0), 
      guestLastDice: !isHostTurn ? diceValue : (currentG.guestLastDice || 0), 
      turn: (currentG.turn === 'host' ? 'guest' : 'host') as any, 
      winner: winnerId, 
      lastUpdated: timestamp
    };
    
    setGame(update);
    if (!currentG.isBotGame) await dbService.updateGame(update);
    if (winnerId && myProfile) await dbService.incrementStats(myProfile.uniqueId, winnerId === myProfile.uniqueId);
    
    // Keep the "rolling" state active for a split second after setting final value for settle animation
    setTimeout(() => {
      setRolling(false);
    }, 450);
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
            <div className="relative group">
              <div className="absolute -inset-4 bg-indigo-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
              <button disabled={loading} onClick={() => createGame(false)} className="w-[220px] -translate-x-12 bg-slate-900/40 backdrop-blur-3xl border border-indigo-500/30 rounded-full h-16 relative overflow-hidden transition-all hover:scale-105 hover:bg-slate-900/60 active:scale-95 animate-float-x">
                <div className="flex items-center gap-4 px-6 h-full">
                  <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white border border-white/20 shadow-[0_0_15px_rgba(79,70,229,0.8)]"><Sword size={18} /></div>
                  <span className="text-xs font-black text-white uppercase italic tracking-widest drop-shadow-md text-glow-indigo">HOST ARENA</span>
                </div>
              </button>
            </div>

            <div className="relative group">
              <div className="absolute -inset-4 bg-emerald-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
              <button disabled={loading} onClick={() => createGame(true)} className="w-[220px] translate-x-12 bg-slate-900/40 backdrop-blur-3xl border border-emerald-500/30 rounded-full h-16 relative overflow-hidden transition-all hover:scale-105 hover:bg-slate-900/60 active:scale-95 animate-float-x-delayed">
                <div className="flex items-center gap-4 px-6 h-full">
                  <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white border border-white/20 shadow-[0_0_15px_rgba(16,185,129,0.8)]"><Bot size={18} /></div>
                  <span className="text-xs font-black text-white uppercase italic tracking-widest drop-shadow-md text-glow-emerald">BATTLE WITH AI</span>
                </div>
              </button>
            </div>

            <div className="w-full max-w-[310px] mt-6 group/join animate-in slide-in-from-bottom-8 duration-700">
              <div className="relative p-[1.5px] rounded-[2.5rem] bg-gradient-to-tr from-indigo-500 via-white/20 to-indigo-400 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)]">
                <div className="bg-[#0a0f1e]/95 rounded-[2.4rem] p-6 flex flex-col gap-4 relative overflow-hidden shadow-[inset_0_0_40px_rgba(79,70,229,0.15)]">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                  
                  <div className="flex items-center gap-2 mb-0.5 px-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_15px_#818cf8]" />
                    <h3 className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.4em] drop-shadow-[0_0_8px_rgba(129,140,248,0.7)]">Join Arena</h3>
                  </div>
                  
                  <div className="relative flex items-center">
                    <div className="flex-1 bg-[#020617]/90 rounded-[1.8rem] border border-white/10 shadow-[inset_0_2px_15px_rgba(0,0,0,1)] flex items-center px-6 py-4 transition-all focus-within:border-indigo-400 focus-within:shadow-[0_0_30px_rgba(79,70,229,0.25)]">
                      <input 
                        type="text" 
                        maxLength={4} 
                        value={inputCode} 
                        onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))} 
                        placeholder="CODE" 
                        className="w-full bg-transparent text-white font-black placeholder:text-slate-800 outline-none text-base uppercase tracking-[0.5em] caret-indigo-400" 
                      />
                    </div>
                    
                    <button 
                      onClick={joinGame}
                      disabled={loading || inputCode.length !== 4}
                      className={`ml-3 w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-500 active:scale-90 relative overflow-hidden border border-white/20 ${
                        inputCode.length === 4 
                          ? 'bg-indigo-500 text-white shadow-[0_0_35px_rgba(99,102,241,0.7)] scale-105' 
                          : 'bg-slate-900 text-slate-700 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/30 to-transparent pointer-events-none" />
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={18} strokeWidth={4} className={inputCode.length === 4 ? 'animate-pulse drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]' : ''} />}
                    </button>
                  </div>
                </div>
              </div>
              {feedback && <p className="mt-4 text-[9px] font-black text-rose-500 text-center uppercase tracking-widest animate-in fade-in slide-in-from-top-2">{feedback.message}</p>}
            </div>
          </div>
        </div>
        <style dangerouslySetInnerHTML={{ __html: `
          .text-arena-title { color: #ffffff; text-shadow: 0 1px 0 #cccccc, 0 2px 0 #c5c5c5, 0 3px 0 #bbbbbb, 0 4px 0 #b1b1b1, 0 5px 0 #aaaaaa, 0 6px 1px rgba(0,0,0,.1), 0 0 5px rgba(0,0,0,.1), 0 1px 3px rgba(0,0,0,.3), 0 3px 5px rgba(0,0,0,.2), 0 5px 10px rgba(0,0,0,.25), 0 10px 10px rgba(0,0,0,.2), 0 20px 20px rgba(0,0,0,.15); }
          @keyframes titleFloat { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-10px) rotate(1deg); } }
          .animate-title-float { animation: titleFloat 6s ease-in-out infinite; }
          @keyframes float-x { 0%, 100% { transform: translate(-48px, 0px); } 50% { transform: translate(-48px, -8px); } }
          @keyframes float-x-delayed { 0%, 100% { transform: translate(48px, 0px); } 50% { transform: translate(48px, -8px); } }
          .animate-float-x { animation: float-x 4s ease-in-out infinite; }
          .animate-float-x-delayed { animation: float-x-delayed 4s ease-in-out infinite 1.5s; }
          @keyframes snake-blink { 0%, 95%, 100% { opacity: 1; } 97%, 99% { opacity: 0; } }
          .snake-eye { animation: snake-blink 4s infinite; }
        ` }} />
      </div>
    );
  }

  const hostCoords = getCellCoords(visualHostPos);
  const guestCoords = getCellCoords(visualGuestPos);
  const sameCell = visualHostPos === visualGuestPos;

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 text-white overflow-hidden relative pb-32">
      <div className="px-6 py-4 flex items-center justify-between border-b border-white/10 bg-slate-900/50 backdrop-blur-md z-[50]">
        <div className="flex items-center gap-2"><Sword size={12} className="text-amber-400" /><span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Arena #{game.code}</span></div>
        <button onClick={() => setGame(null)} className="px-3 py-1.5 bg-rose-500 text-white rounded-lg text-[9px] font-black border border-white/20 active:scale-90">QUIT</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col items-center">
        <div className="flex justify-center items-center gap-3 mb-6 mt-6 sticky top-0 z-[400] w-full">
           {/* HOST CARD */}
           <div className={`px-2 py-1.5 rounded-xl border flex flex-col items-center min-w-[95px] relative transition-all duration-300 ${game.turn === 'host' ? 'bg-indigo-600 border-white scale-105 shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'bg-slate-800 border-white/10 opacity-80'}`}>
              <ReactionBubble text={game.hostReaction?.split('|')[0] || ''} visible={!!game.hostReaction && Date.now() - parseInt(game.hostReaction.split('|')[1]) < ECHO_DURATION} />
              
              {/* TIMER DISPLAY */}
              {game.turn === 'host' && !game.winner && game.guestId && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-indigo-700 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,255,255,0.8)] ring-2 ring-indigo-500/50 z-[20] animate-in slide-in-from-top-2 duration-300">
                  <Clock size={10} strokeWidth={3} className="animate-pulse" />
                  <span className="text-[10px] font-black tabular-nums">{timeLeft}s</span>
                </div>
              )}
              
              <span className="text-base font-black text-white leading-none">{game.hostLastDice || '-'}</span>
              <div className="flex flex-col items-center mt-0.5">
                <span className="text-[8px] font-black uppercase tracking-widest truncate max-w-[70px] leading-tight">{game.hostId}</span>
              </div>
           </div>

           {/* GUEST CARD */}
           <div className={`px-2 py-1.5 rounded-xl border flex flex-col items-center min-w-[95px] relative transition-all duration-300 ${game.turn === 'guest' ? 'bg-emerald-600 border-white scale-105 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-slate-800 border-white/10 opacity-80'}`}>
              <ReactionBubble text={game.guestReaction?.split('|')[0] || ''} visible={!!game.guestReaction && Date.now() - parseInt(game.guestReaction.split('|')[1]) < ECHO_DURATION} />
              
              {/* TIMER DISPLAY */}
              {game.turn === 'guest' && !game.winner && game.guestId && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-emerald-700 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,255,255,0.8)] ring-2 ring-emerald-500/50 z-[20] animate-in slide-in-from-top-2 duration-300">
                  <Clock size={10} strokeWidth={3} className="animate-pulse" />
                  <span className="text-[10px] font-black tabular-nums">{timeLeft}s</span>
                </div>
              )}

              <span className="text-base font-black text-white leading-none">{game.guestLastDice || '-'}</span>
              <div className="flex flex-col items-center mt-0.5">
                <span className="text-[8px] font-black uppercase tracking-widest truncate max-w-[70px] leading-tight">{game.guestId || 'WAITING'}</span>
              </div>
           </div>
        </div>

        <div className="w-full max-w-full mx-auto bg-white rounded-xl border-[4px] border-slate-900 shadow-2xl relative aspect-square mb-6 z-[60] overflow-hidden">
          <div className="absolute inset-0 flex flex-wrap z-10 rounded-lg">{renderBoard()}</div>
          {game.winner && <BoardCelebration winnerName={game.winner} isMe={game.winner === myProfile?.uniqueId} />}
          
          <svg className="absolute inset-0 pointer-events-none z-[40] w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="ladder-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#78350f" /></linearGradient>
            </defs>

            {Object.entries(LADDERS).map(([start, end]) => {
              const s = getCellCoords(parseInt(start)), e = getCellCoords(end), dx = e.x - s.x, dy = e.y - s.y, dist = Math.sqrt(dx * dx + dy * dy), px = -dy / dist, py = dx / dist;
              const railWidth = 1.4;
              return (
                <g key={`ladder-${start}`} className="drop-shadow-lg">
                  <line x1={s.x + px*railWidth} y1={s.y + py*railWidth} x2={e.x + px*railWidth} y2={e.y + py*railWidth} stroke="url(#ladder-gradient)" strokeWidth="1.2" strokeLinecap="round" />
                  <line x1={s.x - px*railWidth} y1={s.y - py*railWidth} x2={e.x - px*railWidth} y2={e.y - py*railWidth} stroke="url(#ladder-gradient)" strokeWidth="1.2" strokeLinecap="round" />
                  {[0.1, 0.25, 0.4, 0.55, 0.7, 0.85].map(r => (
                    <line key={r} x1={s.x + dx*r + px*railWidth} y1={s.y + dy*r + py*railWidth} x2={s.x + dx*r - px*railWidth} y2={s.y + dy*r - px*railWidth} stroke="#fbbf24" strokeWidth="0.8" strokeLinecap="round" />
                  ))}
                </g>
              );
            })}

            {Object.entries(SNAKES).map(([start, end], idx) => {
              const s = getCellCoords(parseInt(start)), e = getCellCoords(end);
              const color = SNAKE_COLORS[idx % SNAKE_COLORS.length];
              const cx1 = (s.x + e.x) / 2 + (idx % 2 === 0 ? 12 : -12);
              const cy1 = (s.y + e.y) / 2 - 8;
              const cx2 = (s.x + e.x) / 2 + (idx % 2 === 0 ? -12 : 12);
              const cy2 = (s.y + e.y) / 2 + 8;
              const path = `M ${s.x} ${s.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${e.x} ${e.y}`;
              return (
                <g key={`snake-${start}`} className="drop-shadow-md">
                  <path d={path} fill="none" stroke={color} strokeWidth="3.2" strokeLinecap="round" opacity="0.95" />
                  <circle cx={s.x} cy={s.y} r="3" fill={color} />
                  <circle cx={s.x - 1} cy={s.y - 0.5} r="0.6" fill="white" className="snake-eye" />
                  <circle cx={s.x + 1} cy={s.y - 0.5} r="0.6" fill="white" className="snake-eye" />
                  <circle cx={s.x - 1} cy={s.y - 0.5} r="0.3" fill="black" className="snake-eye" />
                  <circle cx={s.x + 1} cy={s.y - 0.5} r="0.3" fill="black" className="snake-eye" />
                  <circle cx={e.x} cy={e.y} r="1.5" fill={color} />
                </g>
              );
            })}
          </svg>

          <div className="absolute inset-0 z-[60] pointer-events-none">
            <div className="absolute w-8 h-8 transition-all duration-300 ease-out" style={{ left: `${sameCell ? hostCoords.x - 2.5 : hostCoords.x}%`, top: `${hostCoords.y}%`, transform: 'translate(-50%, -85%)' }}>
               <Pawn color="#4f46e5" isBitten={isSpecialMove === 'host' && SNAKES[visualHostPos] !== undefined} isHopping={isHopping === 'host'} />
            </div>
            <div className="absolute w-8 h-8 transition-all duration-300 ease-out" style={{ left: `${sameCell ? guestCoords.x + 2.5 : guestCoords.x}%`, top: `${guestCoords.y}%`, transform: 'translate(-50%, -85%)' }}>
               <Pawn color="#10b981" isBitten={isSpecialMove === 'guest' && SNAKES[visualGuestPos] !== undefined} isHopping={isHopping === 'guest'} />
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-[110px] left-0 right-0 px-8 z-[150] flex flex-col items-center">
        {game.winner ? (
          <button onClick={() => setGame(null)} className="w-full max-w-[280px] bg-white text-black font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs ring-2 ring-indigo-500/50"><LogOut size={18} /> Back to Lobby</button>
        ) : (
          <div className="flex flex-col items-center gap-4 w-full max-w-sm">
            {game.guestId && (
              <div className="flex justify-center gap-2 p-1.5 bg-slate-900/60 backdrop-blur-2xl border border-white/20 rounded-[2rem] ring-1 ring-white/5 shadow-2xl">
                {REACTIONS.map(r => (
                  <button key={r.label} onClick={() => sendEcho(r.icon)} className="w-10 h-10 flex flex-col items-center justify-center rounded-2xl bg-slate-800 border border-white/5 hover:bg-white/20 active:scale-90 transition-all group overflow-hidden"><span className="text-lg grayscale group-hover:grayscale-0 transition-all">{r.icon}</span></button>
                ))}
              </div>
            )}
            <div className="flex flex-col items-center gap-0.5">
              <button 
                disabled={(!((game.turn === 'host' && game.hostId === myProfile?.uniqueId) || (game.turn === 'guest' && game.guestId === myProfile?.uniqueId))) || rolling || isAnimating || !game.guestId} 
                onClick={rollDice} 
                className={`w-16 h-16 rounded-[1.25rem] transition-all active:scale-90 relative ${rolling || isAnimating || !game.guestId ? 'opacity-40 grayscale pointer-events-none' : 'hover:scale-110 shadow-[0_0_20px_rgba(79,70,229,0.2)]'}`}
              >
                <IsometricDie value={rolling ? rollingDiceValue : (game.lastDice || 1)} rolling={rolling} />
                {((game.turn === 'host' && game.hostId === myProfile?.uniqueId) || (game.turn === 'guest' && game.guestId === myProfile?.uniqueId)) && game.guestId && !rolling && !isAnimating && (<div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center border-2 border-white animate-pulse"><Sparkles size={10} className="text-white" /></div>)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameTab;
