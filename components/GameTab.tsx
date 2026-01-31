
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, UserProfile } from '../types';
import { dbService } from '../services/dbService';
import { LADDERS, SNAKES, BOARD_CELLS } from '../constants';
import { 
  Trophy, RefreshCw, Dices, Sword, Home, Zap, Frown,
  Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Star
} from 'lucide-react';

interface GameTabProps {
  myProfile: UserProfile | null;
  game: GameState | null;
  setGame: (g: GameState | null) => void;
}

const GameTab: React.FC<GameTabProps> = ({ myProfile, game, setGame }) => {
  const [inputCode, setInputCode] = useState('');
  const [rolling, setRolling] = useState(false);
  const [rollingDiceValue, setRollingDiceValue] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [statsUpdatedForGame, setStatsUpdatedForGame] = useState<string | null>(null);

  // Visual position states for markers
  const [visualHostPos, setVisualHostPos] = useState(game?.hostPos || 1);
  const [visualGuestPos, setVisualGuestPos] = useState(game?.guestPos || 1);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const isWalking = useRef(false);
  const currentHostTarget = useRef(game?.hostPos || 1);
  const currentGuestTarget = useRef(game?.guestPos || 1);
  const latestGameRef = useRef<GameState | null>(game);

  useEffect(() => {
    latestGameRef.current = game;
  }, [game]);

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

  const walkTo = async (
    current: number, 
    finalTarget: number, 
    setter: (n: number) => void, 
    ref: React.MutableRefObject<number>,
    isHostPlayer: boolean
  ) => {
    if (current === finalTarget) return;
    
    isWalking.current = true;
    setIsAnimating(true);

    let jumpTriggerCell = finalTarget;
    const possibleTriggers = Object.entries({ ...LADDERS, ...SNAKES })
      .filter(([start, end]) => end === finalTarget)
      .map(([start]) => parseInt(start));

    const validTrigger = possibleTriggers.find(t => t > current && t <= current + 6);
    if (validTrigger) {
      jumpTriggerCell = validTrigger;
    }

    let tempPos = current;
    if (jumpTriggerCell <= current) {
      setter(finalTarget);
    } else {
      while (tempPos < jumpTriggerCell) {
        const serverTarget = isHostPlayer ? latestGameRef.current?.hostPos : latestGameRef.current?.guestPos;
        if (serverTarget !== undefined && serverTarget !== finalTarget) {
          break; 
        }
        tempPos++;
        setter(tempPos);
        await new Promise(r => setTimeout(r, 600)); 
      }
      if (tempPos === jumpTriggerCell && jumpTriggerCell !== finalTarget) {
        await new Promise(r => setTimeout(r, 800));
        setter(finalTarget);
        await new Promise(r => setTimeout(r, 1000)); 
      }
    }

    ref.current = finalTarget;
    setIsAnimating(false);
    isWalking.current = false;
  };

  useEffect(() => {
    if (!game || isWalking.current) return;
    if (game.hostPos !== currentHostTarget.current) {
      walkTo(currentHostTarget.current, game.hostPos, setVisualHostPos, currentHostTarget, true);
    }
    if (game.guestPos !== currentGuestTarget.current) {
      walkTo(currentGuestTarget.current, game.guestPos, setVisualGuestPos, currentGuestTarget, false);
    }
  }, [game?.hostPos, game?.guestPos]);

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
        if (remoteGame.guestId && !remoteGame.winner) {
          const opponentUid = remoteGame.hostId === myProfile.uniqueId ? remoteGame.guestId : remoteGame.hostId;
          const opponent = await dbService.findPlayerGlobal(opponentUid);
          if (opponent && opponent.lastSeen && (Date.now() - opponent.lastSeen > 60000)) {
            const finalGame = { ...remoteGame, winner: myProfile.uniqueId };
            await dbService.updateGame(finalGame);
            await syncMyStatsLocally(true, remoteGame.id!);
            setGame(finalGame);
            return;
          }
        }
        if (JSON.stringify(remoteGame) !== JSON.stringify(game)) { 
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
      currentHostTarget.current = 1;
      currentGuestTarget.current = 1;
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
        currentHostTarget.current = result.game.hostPos;
        currentGuestTarget.current = result.game.guestPos;
        setStatsUpdatedForGame(null);
        setInputCode('');
      } else alert('Room not found or full.');
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
    
    const dice = Math.floor(Math.random() * 6) + 1;
    let frames = 15;
    let delay = 60;

    const animateFrames = async () => {
      for (let i = 0; i < frames; i++) {
        setRollingDiceValue(Math.floor(Math.random() * 6) + 1);
        const frameDelay = delay + (i * 10);
        await new Promise(r => setTimeout(r, frameDelay));
      }
      setRollingDiceValue(dice);
    };

    await animateFrames();
    
    const isHost = game.hostId === myProfile.uniqueId;
    let landingPos = (isHost ? game.hostPos : game.guestPos) + dice;
    if (landingPos > BOARD_CELLS) landingPos = isHost ? game.hostPos : game.guestPos;
    
    const finalPos = LADDERS[landingPos] || SNAKES[landingPos] || landingPos;
    const winnerId = finalPos === BOARD_CELLS ? (isHost ? game.hostId : game.guestId!) : undefined;

    const update = {
      ...game,
      hostPos: isHost ? finalPos : game.hostPos,
      guestPos: !isHost ? finalPos : game.guestPos,
      lastDice: dice,
      hostLastDice: isHost ? dice : (game.hostLastDice || 0),
      guestLastDice: !isHost ? dice : (game.guestLastDice || 0),
      turn: (game.turn === 'host' ? 'guest' : 'host') as any,
      winner: winnerId
    };
    
    await dbService.updateGame(update);
    setGame(update);
    if (winnerId) await syncMyStatsLocally(winnerId === myProfile.uniqueId, game.id!);
    setRolling(false);
  };

  const renderDiceFace = (val: number, isRolling: boolean) => {
    const props = { size: 52, className: `drop-shadow-lg ${isRolling ? 'animate-dice-tumble' : 'animate-dice-settle'}` };
    switch (val) {
      case 1: return <Dice1 {...props} />;
      case 2: return <Dice2 {...props} />;
      case 3: return <Dice3 {...props} />;
      case 4: return <Dice4 {...props} />;
      case 5: return <Dice5 {...props} />;
      case 6: return <Dice6 {...props} />;
      default: return <Dices {...props} />;
    }
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
          <div 
            key={cellNum} 
            className="relative flex items-center justify-center border-[0.5px] border-black bg-white" 
            style={{ width: '10%', aspectRatio: '1/1' }}
          >
            <span className="absolute top-0.5 left-1 text-[8px] sm:text-[10px] font-black text-black select-none">{cellNum}</span>
            {cellNum === BOARD_CELLS && (
              <div className="absolute top-1 right-1">
                <Star size={16} className="text-yellow-400 fill-yellow-400" />
              </div>
            )}
          </div>
        );
      }
    }
    return cells;
  };

  const getSnakeColor = (start: number) => {
    const snakeColors = ["#ef4444", "#a855f7", "#10b981", "#3b82f6", "#f59e0b", "#9f1239"];
    return snakeColors[start % snakeColors.length];
  };

  const hostCoords = getCellCoords(visualHostPos);
  const guestCoords = getCellCoords(visualGuestPos);

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
              <input 
                type="text" 
                maxLength={4} 
                value={inputCode} 
                onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))} 
                placeholder={inputCode ? "" : "CODE"}
                className="w-full text-center font-black text-xl py-3 rounded-2xl bg-slate-900 border border-slate-800 text-white outline-none focus:border-indigo-500 transition-all placeholder:opacity-40" 
              />
              <button disabled={loading || inputCode.length < 4} onClick={joinGame} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase active:scale-95">JOIN ARENA</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const iWon = game.winner === myProfile?.uniqueId;

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 text-white overflow-hidden pb-48">
      {showQuitModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-rose-500/30 p-8 rounded-[2rem] text-center max-w-xs w-full shadow-2xl">
            <h2 className="text-2xl font-black text-white uppercase mb-4">Exit Arena?</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Matches in progress count as losses.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowQuitModal(false)} className="bg-slate-800 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest">CANCEL</button>
              <button onClick={confirmLeave} className="bg-rose-600 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest">QUIT</button>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-slate-900/50 backdrop-blur-md z-[100]">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Sword size={12} className="text-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">Arena #{game.code}</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className={`text-xs font-black truncate max-w-[80px] ${game.turn === 'host' ? 'text-indigo-400 underline underline-offset-4' : 'text-slate-500'}`}>{game.hostId}</span>
            <span className="text-[10px] font-bold text-slate-700 italic">vs</span>
            <span className={`text-xs font-black truncate max-w-[80px] ${game.turn === 'guest' ? 'text-emerald-400 underline underline-offset-4' : 'text-slate-500'}`}>{game.guestId || 'Lobby...'}</span>
          </div>
        </div>
        {!game.winner && (
          <button onClick={() => setShowQuitModal(true)} className="px-3 py-1.5 bg-rose-500/10 text-rose-500 rounded-lg text-[9px] font-black border border-rose-500/20 active:scale-90">QUIT</button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide flex flex-col items-center">
        <div className="flex justify-center items-center gap-10 mb-6 mt-2">
           <div className={`p-4 rounded-2xl border-2 flex flex-col items-center shadow-lg transition-all ${game.turn === 'host' ? 'bg-indigo-600/20 border-indigo-500 ring-2 ring-indigo-500/20 scale-105' : 'bg-slate-900/40 border-transparent opacity-30'}`}>
              <span className="text-2xl font-black text-white leading-none">{game.hostLastDice || '-'}</span>
              <span className="text-[8px] font-black mt-1 uppercase text-indigo-400 tracking-widest truncate max-w-[60px]">{game.hostId}</span>
           </div>
           <div className={`p-4 rounded-2xl border-2 flex flex-col items-center shadow-lg transition-all ${game.turn === 'guest' ? 'bg-emerald-600/20 border-emerald-500 ring-2 ring-emerald-500/20 scale-105' : 'bg-slate-900/40 border-transparent opacity-30'}`}>
              <span className="text-2xl font-black text-white leading-none">{game.guestLastDice || '-'}</span>
              <span className="text-[8px] font-black mt-1 uppercase text-emerald-400 tracking-widest truncate max-w-[60px]">{game.guestId || '???'}</span>
           </div>
        </div>

        <div 
          className="w-full max-w-[95vw] mx-auto bg-white rounded-xl border-[8px] border-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden relative aspect-square"
        >
          <div className="absolute inset-0 flex flex-wrap z-10">
            {renderBoard()}
          </div>
          
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
            <div 
              className="absolute w-4 h-4 bg-indigo-600 rounded-full border-2 border-white shadow-xl animate-bounce transition-all ease-in-out duration-700"
              style={{ 
                left: `${hostCoords.x}%`, 
                top: `${hostCoords.y}%`, 
                transform: 'translate(-50%, -50%)' 
              }}
            />
            <div 
              className="absolute w-4 h-4 bg-emerald-600 rounded-full border-2 border-white shadow-xl animate-bounce transition-all ease-in-out duration-700"
              style={{ 
                left: `${guestCoords.x}%`, 
                top: `${guestCoords.y}%`, 
                transform: 'translate(-50%, -50%)' 
              }}
            />
          </div>
        </div>
      </div>

      <div className="fixed bottom-[110px] left-0 right-0 px-6 z-[110] max-w-md mx-auto">
        {game.winner ? (
          <div className={`w-full p-8 rounded-[2.5rem] text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] border animate-in slide-in-from-bottom-full duration-500 ${iWon ? 'bg-indigo-600 border-indigo-400' : 'bg-slate-900 border-rose-500/30'}`}>
            <div className="mb-4 flex justify-center">
              {iWon ? (
                <div className="relative">
                  <Trophy size={64} className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] animate-bounce" />
                  <Zap className="absolute -top-2 -right-2 text-white animate-pulse" size={20} fill="currentColor" />
                </div>
              ) : (
                <div className="relative">
                  <Frown size={64} className="text-rose-500/80 animate-pulse" />
                </div>
              )}
            </div>
            <h2 className={`text-4xl font-black uppercase italic tracking-tighter ${iWon ? 'text-white' : 'text-rose-500'}`}>
              {iWon ? 'Winner' : 'Loser'}
            </h2>
            <button onClick={confirmLeave} className="mt-8 px-10 py-4 bg-white text-black rounded-2xl font-black text-[11px] uppercase shadow-xl active:scale-95 transition-all tracking-widest hover:bg-slate-100">BACK TO LOBBY</button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button 
              disabled={!isMyTurn || rolling || isAnimating || !game.guestId} 
              onClick={rollDice} 
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all active:scale-75 shadow-[0_0_50px_rgba(79,70,229,0.4)] border-4 border-slate-950 ${isMyTurn && game.guestId && !rolling && !isAnimating ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
            >
              <div className="relative">
                {rolling ? renderDiceFace(rollingDiceValue, true) : renderDiceFace(game.lastDice || 1, false)}
                {isMyTurn && game.guestId && !rolling && !isAnimating && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center border-2 border-indigo-600 animate-pulse">
                    <Zap size={10} fill="currentColor" className="text-indigo-600" />
                  </div>
                )}
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameTab;
