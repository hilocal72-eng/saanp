
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, UserProfile } from '../types';
import { dbService } from '../services/dbService';
import { LADDERS, SNAKES, BOARD_CELLS } from '../constants';
import { 
  Trophy, Sword, Zap, Frown, Star
} from 'lucide-react';

interface GameTabProps {
  myProfile: UserProfile | null;
  game: GameState | null;
  setGame: (g: GameState | null) => void;
}

// Custom Pawn Component for Player Tokens
const Pawn = ({ color, className }: { color: string, className?: string }) => (
  <svg 
    viewBox="0 0 40 60" 
    className={`w-full h-full drop-shadow-[0_4px_4px_rgba(0,0,0,0.4)] ${className}`}
    style={{ color }}
  >
    <circle cx="20" cy="15" r="10" fill="currentColor" stroke="black" strokeWidth="3" />
    <path 
      d="M20 25 C14 25 10 28 10 32 L6 50 C6 54 10 56 14 56 L26 56 C30 56 34 54 34 50 L30 32 C30 28 26 25 20 25 Z" 
      fill="currentColor" 
      stroke="black" 
      strokeWidth="3" 
      strokeLinejoin="round"
    />
    <circle cx="17" cy="12" r="3" fill="white" opacity="0.3" />
  </svg>
);

// Single Isometric Die
const IsometricDie = ({ value, rolling }: { value: number, rolling: boolean }) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      className={`w-full h-full transition-all duration-150 ${rolling ? 'animate-dice-tumble scale-110' : 'animate-dice-settle hover:scale-105'}`}
      style={{ filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.4))' }}
    >
      <g transform="translate(25, 20)">
        <path d="M25 0 L50 15 L25 30 L0 15 Z" fill="#ffdf5e" stroke="black" strokeWidth="2.5" />
        <path d="M0 15 L25 30 L25 60 L0 45 Z" fill="#ffce00" stroke="black" strokeWidth="2.5" />
        <path d="M25 30 L50 15 L50 45 L25 60 Z" fill="#ffe98a" stroke="black" strokeWidth="2.5" />
        
        <g className="pips">
           {value === 1 && <circle cx="25" cy="15" r="4" fill="#ff9100" stroke="black" strokeWidth="0.5" />}
           {value === 2 && (
             <>
               <circle cx="15" cy="10" r="3" fill="black" />
               <circle cx="35" cy="20" r="3" fill="black" />
             </>
           )}
           {value === 3 && (
             <>
               <circle cx="15" cy="10" r="3" fill="black" />
               <circle cx="25" cy="15" r="3" fill="black" />
               <circle cx="35" cy="20" r="3" fill="black" />
             </>
           )}
           {value === 4 && (
             <>
               <circle cx="15" cy="10" r="3" fill="black" />
               <circle cx="35" cy="10" r="3" fill="black" />
               <circle cx="15" cy="20" r="3" fill="black" />
               <circle cx="35" cy="20" r="3" fill="black" />
             </>
           )}
           {value === 5 && (
             <>
               <circle cx="15" cy="10" r="3" fill="black" />
               <circle cx="35" cy="10" r="3" fill="black" />
               <circle cx="25" cy="15" r="3" fill="black" />
               <circle cx="15" cy="20" r="3" fill="black" />
               <circle cx="35" cy="20" r="3" fill="black" />
             </>
           )}
           {value === 6 && (
             <>
               <circle cx="15" cy="8" r="2.5" fill="black" />
               <circle cx="25" cy="8" r="2.5" fill="black" />
               <circle cx="35" cy="8" r="2.5" fill="black" />
               <circle cx="15" cy="22" r="2.5" fill="black" />
               <circle cx="25" cy="22" r="2.5" fill="black" />
               <circle cx="35" cy="22" r="2.5" fill="black" />
             </>
           )}
        </g>
      </g>
    </svg>
  );
};

const GameTab: React.FC<GameTabProps> = ({ myProfile, game, setGame }) => {
  const [inputCode, setInputCode] = useState('');
  const [rolling, setRolling] = useState(false);
  const [rollingDiceValue, setRollingDiceValue] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [statsUpdatedForGame, setStatsUpdatedForGame] = useState<string | null>(null);

  const [visualHostPos, setVisualHostPos] = useState(game?.hostPos || 1);
  const [visualGuestPos, setVisualGuestPos] = useState(game?.guestPos || 1);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const gameRef = useRef<GameState | null>(game);
  useEffect(() => { gameRef.current = game; }, [game]);

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
    }
  }, [myProfile, statsUpdatedForGame]);

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
        // If current is already at a head leading to final target, slide/jump now
        if (SNAKES[current] === target || LADDERS[current] === target) {
          return target;
        }

        // Determine if we need to walk to a shortcut head first
        const head = Object.keys(SNAKES).map(Number).find(k => SNAKES[k] === target) || 
                     Object.keys(LADDERS).map(Number).find(k => LADDERS[k] === target);
        
        const walkTarget = head || target;

        if (current < walkTarget) {
          return current + 1; // Walk forward cell by cell
        }
        
        // If we overshot or are in a weird state, snap to target
        if (current > walkTarget) {
          return target;
        }

        // If current === walkTarget but not yet target, it means we are at the head.
        // We stay here for one tick (the next setTimeout) to create a visual pause.
        return current;
      };

      if (!hostDone) setVisualHostPos(prev => calculateNextPos(prev, game.hostPos));
      if (!guestDone) setVisualGuestPos(prev => calculateNextPos(prev, game.guestPos));

    }, 220); // stepping speed

    return () => clearTimeout(timer);
  }, [game?.hostPos, game?.guestPos, visualHostPos, visualGuestPos]);

  useEffect(() => {
    let interval: any;
    if (game && myProfile) {
      interval = setInterval(async () => {
        const remoteGame = await dbService.getGameByCode(game.code);
        if (!remoteGame) {
          setGame(null);
          return;
        }
        if (remoteGame.winner && statsUpdatedForGame !== remoteGame.id) {
          const iWon = remoteGame.winner === myProfile.uniqueId;
          await syncMyStatsLocally(iWon, remoteGame.id!);
          setGame(remoteGame);
          return;
        }
        
        const g = gameRef.current;
        if (g && (remoteGame.hostPos !== g.hostPos || 
                  remoteGame.guestPos !== g.guestPos || 
                  remoteGame.turn !== g.turn || 
                  remoteGame.guestId !== g.guestId ||
                  remoteGame.winner !== g.winner)) {
          setGame(remoteGame); 
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [game?.id, game?.winner, game?.code, myProfile?.uniqueId, statsUpdatedForGame, syncMyStatsLocally, setGame]);

  const createGame = async () => {
    if (!myProfile) return;
    setLoading(true);
    try {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      const newGame = await dbService.hostGame(myProfile.uniqueId, code);
      setGame(newGame);
      setVisualHostPos(1);
      setVisualGuestPos(1);
      setStatsUpdatedForGame(null);
    } catch (e) { alert("Failed to create room."); } finally { setLoading(false); }
  };

  const joinGame = async () => {
    if (!myProfile || inputCode.length !== 4) return;
    setLoading(true);
    try {
      const result = await dbService.joinGame(myProfile.uniqueId, inputCode);
      if (result.game) {
        setGame(result.game);
        setVisualHostPos(result.game.hostPos);
        setVisualGuestPos(result.game.guestPos);
        setStatsUpdatedForGame(null);
        setInputCode('');
      } else alert(result.error === 'ROOM_FULL' ? 'Room is already full.' : 'Room not found.');
    } catch (e) { alert("Error joining game."); } finally { setLoading(false); }
  };

  const confirmLeave = async () => {
    if (!game || !myProfile) {
      setGame(null);
      return;
    }
    const isHost = game.hostId === myProfile.uniqueId;
    if (game.guestId && !game.winner) {
      const winnerId = isHost ? game.guestId : game.hostId;
      const finalGame = { ...game, winner: winnerId };
      await dbService.updateGame(finalGame);
      await syncMyStatsLocally(false, game.id!);
      setGame(finalGame);
    } else {
      setGame(null);
    }
    setShowQuitModal(false);
  };

  const rollDice = async () => {
    if (!game || rolling || isAnimating || game.winner || !myProfile || !isMyTurn || !game.guestId) return;
    setRolling(true);
    
    const diceValue = Math.floor(Math.random() * 6) + 1;
    let frames = 12;

    for (let i = 0; i < frames; i++) {
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

    const update = {
      ...game,
      hostPos: isHost ? finalPos : game.hostPos,
      guestPos: !isHost ? finalPos : game.guestPos,
      lastDice: diceValue,
      hostLastDice: isHost ? diceValue : (game.hostLastDice || 0),
      guestLastDice: !isHost ? diceValue : (game.guestLastDice || 0),
      turn: (game.turn === 'host' ? 'guest' : 'host') as any,
      winner: winnerId
    };
    
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

  const renderBoard = () => {
    const cells = [];
    for (let row = 9; row >= 0; row--) {
      const isReverseRow = row % 2 !== 0;
      for (let col = 0; col < 10; col++) {
        const actualCol = isReverseRow ? 9 - col : col;
        const cellNum = row * 10 + actualCol + 1;
        cells.push(
          <div key={cellNum} className="relative flex items-center justify-center border-[0.5px] border-black/10 bg-white" style={{ width: '10%', aspectRatio: '1/1' }}>
            <span className="absolute top-0.5 left-1 text-[9px] sm:text-[11px] font-black text-slate-900/40 select-none">{cellNum}</span>
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
  const isForfeit = game?.winner && game.hostPos < 100 && game.guestPos < 100;
  const sameCell = visualHostPos === visualGuestPos;

  const getSnakeColor = (start: number) => {
    const snakeColors = ["#ef4444", "#a855f7", "#10b981", "#3b82f6", "#f59e0b"];
    return snakeColors[start % snakeColors.length];
  };

  if (!game) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-slate-950 p-8 animate-in fade-in duration-700 relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-30 mix-blend-screen" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=2070')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="relative z-10 flex-1 flex flex-col justify-center items-center gap-10">
          <div className="text-center flex flex-col items-center gap-4">
            <Trophy size={64} className="text-indigo-400 animate-bounce" />
            <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">Arena<br/><span className="text-indigo-400">Battle</span></h1>
          </div>
          <div className="w-full max-w-[260px] space-y-6 pb-48">
            <button disabled={loading} onClick={createGame} className="w-full bg-white text-black font-black py-4 rounded-2xl active:scale-95 text-xs uppercase tracking-widest shadow-xl">HOST NEW ROOM</button>
            <div className="flex flex-col gap-3 relative">
              <input type="text" maxLength={4} value={inputCode} onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))} placeholder="CODE" className="w-full text-center font-black text-xl py-3 rounded-2xl bg-slate-900 border border-slate-800 text-white outline-none focus:border-indigo-500 transition-all placeholder:opacity-40" />
              <button disabled={loading || inputCode.length < 4} onClick={joinGame} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase active:scale-95">JOIN ARENA</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 text-white overflow-hidden pb-48">
      {showQuitModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-rose-500/30 p-8 rounded-[2rem] text-center max-w-xs w-full shadow-2xl">
            <h2 className="text-2xl font-black text-white uppercase mb-4">Exit Arena?</h2>
            <div className="grid grid-cols-2 gap-3 mt-8">
              <button onClick={() => setShowQuitModal(false)} className="bg-slate-800 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest">CANCEL</button>
              <button onClick={confirmLeave} className="bg-rose-600 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest">QUIT</button>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-slate-900/50 backdrop-blur-md z-[100]">
        <div className="flex flex-col">
          <div className="flex items-center gap-2"><Sword size={12} className="text-amber-500" /><span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">Arena #{game.code}</span></div>
        </div>
        <button onClick={() => setShowQuitModal(true)} className="px-3 py-1.5 bg-rose-500/10 text-rose-500 rounded-lg text-[9px] font-black border border-rose-500/20 active:scale-90">QUIT</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col items-center">
        <div className="flex justify-center items-center gap-4 mb-4">
           <div className={`px-3 py-1.5 rounded-xl border flex flex-col items-center shadow-lg transition-all min-w-[70px] ${game.turn === 'host' ? 'bg-indigo-600/20 border-indigo-500 scale-105' : 'bg-slate-900/40 border-transparent opacity-30'}`}>
              <span className="text-lg font-black text-white leading-none">{game.hostLastDice || '-'}</span>
              <span className="text-[6px] font-black mt-0.5 uppercase text-indigo-400 tracking-widest truncate max-w-[55px]">{game.hostId}</span>
           </div>
           <div className={`px-3 py-1.5 rounded-xl border flex flex-col items-center shadow-lg transition-all min-w-[70px] ${game.turn === 'guest' ? 'bg-emerald-600/20 border-emerald-500 scale-105' : 'bg-slate-900/40 border-transparent opacity-30'}`}>
              <span className="text-lg font-black text-white leading-none">{game.guestLastDice || '-'}</span>
              <span className="text-[6px] font-black mt-0.5 uppercase text-emerald-400 tracking-widest truncate max-w-[55px]">{game.guestId || 'Lobby...'}</span>
           </div>
        </div>

        <div className="w-full max-w-[95vw] mx-auto bg-white rounded-xl border-[6px] border-slate-900 shadow-2xl relative aspect-square overflow-hidden">
          <div className="absolute inset-0 flex flex-wrap z-10">{renderBoard()}</div>
          
          <svg className="absolute inset-0 pointer-events-none z-[40] w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {Object.entries(LADDERS).map(([start, end]) => {
              const s = getCellCoords(parseInt(start));
              const e = getCellCoords(end);
              const ladderColor = "#4b2c20";
              const dx = e.x - s.x;
              const dy = e.y - s.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const px = -dy / dist;
              const py = dx / dist;
              const halfWidth = 1.0;
              return (
                <g key={`ladder-${start}`} className="drop-shadow-sm">
                  <line x1={s.x + px * halfWidth} y1={s.y + py * halfWidth} x2={e.x + px * halfWidth} y2={e.y + py * halfWidth} stroke={ladderColor} strokeWidth="0.8" strokeLinecap="round" />
                  <line x1={s.x - px * halfWidth} y1={s.y - py * halfWidth} x2={e.x - px * halfWidth} y2={e.y - py * halfWidth} stroke={ladderColor} strokeWidth="0.8" strokeLinecap="round" />
                  {[0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map(r => {
                    const cx = s.x + dx * r;
                    const cy = s.y + dy * r;
                    return (
                      <line key={r} x1={cx + px * halfWidth} y1={cy + py * halfWidth} x2={cx - px * halfWidth} y2={cy - py * halfWidth} stroke={ladderColor} strokeWidth="0.5" strokeLinecap="round" />
                    );
                  })}
                </g>
              );
            })}
            {Object.entries(SNAKES).map(([start, end]) => {
              const s = getCellCoords(parseInt(start));
              const e = getCellCoords(end);
              const sNum = parseInt(start);
              const color = getSnakeColor(sNum);
              const dx = e.x - s.x;
              const dy = e.y - s.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              const nx = -dy / dist;
              const ny = dx / dist;
              const amp = (sNum % 2 === 0 ? 5 : -5);
              const cx1 = s.x + dx/3 + nx * amp;
              const cy1 = s.y + dy/3 + ny * amp;
              const cx2 = s.x + 2*dx/3 - nx * amp;
              const cy2 = s.y + 2*dy/3 - ny * amp;
              return (
                <g key={`snake-${start}`} className="drop-shadow-lg">
                  <path d={`M ${s.x} ${s.y} C ${cx1} ${cy1} ${cx2} ${cy2} ${e.x} ${e.y}`} fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
                  <circle cx={s.x} cy={s.y} r="1" fill={color} />
                  <circle cx={s.x - 0.3} cy={s.y - 0.2} r="0.25" fill="white" />
                  <circle cx={s.x + 0.3} cy={s.y - 0.2} r="0.25" fill="white" />
                </g>
              );
            })}
          </svg>

          <div className="absolute inset-0 z-[60] pointer-events-none">
            {/* Host Pawn */}
            <div 
              className="absolute w-8 h-8 transition-all duration-150 ease-out" 
              style={{ 
                left: `${sameCell ? hostCoords.x - 2.5 : hostCoords.x}%`, 
                top: `${hostCoords.y}%`, 
                transform: 'translate(-50%, -85%)',
                transitionDuration: SNAKES[visualHostPos] || LADDERS[visualHostPos] ? '500ms' : '180ms'
              }}
            >
              <Pawn color="#4f46e5" />
            </div>
            {/* Guest Pawn */}
            <div 
              className="absolute w-8 h-8 transition-all duration-150 ease-out" 
              style={{ 
                left: `${sameCell ? guestCoords.x + 2.5 : guestCoords.x}%`, 
                top: `${guestCoords.y}%`, 
                transform: 'translate(-50%, -85%)',
                transitionDuration: SNAKES[visualGuestPos] || LADDERS[visualGuestPos] ? '500ms' : '180ms'
              }}
            >
              <Pawn color="#10b981" />
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-[110px] left-0 right-0 px-6 z-[110] flex justify-center">
        {game.winner ? (
          <div className={`w-full max-w-xs p-8 rounded-[2.5rem] text-center shadow-[0_20px_60px_rgba(0,0,0,0.8)] border-2 animate-in slide-in-from-bottom-20 duration-500 ${iWon ? 'bg-indigo-600 border-indigo-400/50' : 'bg-slate-900 border-rose-500/30'}`}>
            {iWon ? (
              <>
                <Trophy size={64} className="text-yellow-400 mx-auto mb-6 animate-bounce drop-shadow-[0_0_15px_rgba(250,204,21,0.4)]" />
                <h2 className="text-3xl font-black uppercase mb-2 tracking-tighter">
                   {isForfeit ? 'Opponent Forfeited' : 'VICTORY'}
                </h2>
                {isForfeit && <p className="text-[12px] font-black uppercase tracking-[0.3em] text-indigo-200 mb-6 drop-shadow-md">You Won!</p>}
              </>
            ) : (
              <>
                <div className="relative inline-block mb-6">
                  <Frown size={64} className="text-rose-500 mx-auto animate-pulse drop-shadow-[0_0_15px_rgba(244,63,94,0.4)]" />
                  <span className="absolute -bottom-2 -right-2 text-3xl">😟</span>
                </div>
                <h2 className="text-5xl font-black uppercase mb-2 text-rose-500 italic tracking-tighter drop-shadow-lg">
                   LOSER
                </h2>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-300/60 mb-8">Better luck next time player</p>
              </>
            )}
            <button onClick={confirmLeave} className="w-full py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 shadow-xl transition-transform">BACK TO LOBBY</button>
          </div>
        ) : (
          <button 
            disabled={!isMyTurn || rolling || isAnimating || !game.guestId} 
            onClick={rollDice} 
            className={`w-28 h-28 rounded-3xl p-2 transition-all active:scale-90 relative ${!isMyTurn || rolling || isAnimating || !game.guestId ? 'opacity-50 grayscale' : 'animate-pulse-soft'}`}
          >
            <IsometricDie value={rolling ? rollingDiceValue : (game.lastDice || 1)} rolling={rolling} />
            {isMyTurn && game.guestId && !rolling && !isAnimating && (
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center border-2 border-indigo-600 shadow-lg">
                <Zap size={12} fill="currentColor" className="text-indigo-600" />
              </div>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default GameTab;
