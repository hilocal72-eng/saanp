
import React, { useState, useEffect } from 'react';
import { GameState, UserProfile } from '../types';
import { dbService } from '../services/dbService';
import { LADDERS, SNAKES, BOARD_CELLS } from '../constants';
import { Trophy, RefreshCw, Loader2, Dices, Sword } from 'lucide-react';

interface GameTabProps {
  myProfile: UserProfile | null;
  game: GameState | null;
  setGame: (g: GameState | null) => void;
}

const GameTab: React.FC<GameTabProps> = ({ myProfile, game, setGame }) => {
  const [inputCode, setInputCode] = useState('');
  const [rolling, setRolling] = useState(false);
  const [isSliding, setIsSliding] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let interval: any;
    if (game && !game.winner && !rolling && !isSliding) {
      interval = setInterval(async () => {
        const remoteGame = await dbService.getGameByCode(game.code);
        if (remoteGame && JSON.stringify(remoteGame) !== JSON.stringify(game)) {
          setGame(remoteGame);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [game, rolling, isSliding, setGame]);

  const createGame = async () => {
    if (!myProfile) return alert('Please complete your profile first');
    setLoading(true);
    try {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      const newGame = await dbService.hostGame(myProfile.uniqueId, code);
      setGame(newGame);
    } catch (e) {
      alert("Failed to create room. Check your internet.");
    } finally {
      setLoading(false);
    }
  };

  const joinGame = async () => {
    if (!myProfile) return alert('Please complete your profile first');
    if (inputCode.length !== 4) return;
    setLoading(true);
    try {
      const joined = await dbService.joinGame(myProfile.uniqueId, inputCode);
      if (joined) {
        setGame(joined);
      } else {
        alert('Room not found or already full');
      }
    } catch (e) {
      alert("Error joining game.");
    } finally {
      setLoading(false);
    }
  };

  const rollDice = async () => {
    if (!game || rolling || isSliding || game.winner || !myProfile) return;
    const isMyTurn = (game.turn === 'host' && game.hostId === myProfile.uniqueId) ||
                   (game.turn === 'guest' && game.guestId === myProfile.uniqueId);
    
    if (!isMyTurn) return;

    setRolling(true);
    if (window.navigator.vibrate) window.navigator.vibrate(40);

    setTimeout(async () => {
      const dice = Math.floor(Math.random() * 6) + 1;
      const isHost = game.hostId === myProfile.uniqueId;
      let landingPos: number;
      
      if (isHost) {
        landingPos = game.hostPos + dice;
        if (landingPos > BOARD_CELLS) landingPos = game.hostPos;
      } else {
        landingPos = game.guestPos + dice;
        if (landingPos > BOARD_CELLS) landingPos = game.guestPos;
      }

      const midGame: GameState = {
        ...game,
        hostPos: isHost ? landingPos : game.hostPos,
        guestPos: !isHost ? landingPos : game.guestPos,
        lastDice: dice
      };
      setGame(midGame);
      setRolling(false);

      const finalPos = LADDERS[landingPos] || SNAKES[landingPos] || landingPos;
      
      if (finalPos !== landingPos) {
        setIsSliding(true);
        setTimeout(async () => {
          const nextTurn = game.turn === 'host' ? 'guest' : 'host';
          const updatedGame: GameState = {
            ...midGame,
            hostPos: isHost ? finalPos : game.hostPos,
            guestPos: !isHost ? finalPos : game.guestPos,
            turn: nextTurn,
            winner: finalPos === BOARD_CELLS ? (isHost ? game.hostId : game.guestId) : undefined
          };
          await dbService.updateGame(updatedGame);
          setGame(updatedGame);
          setIsSliding(false);
        }, 1000);
      } else {
        const nextTurn = game.turn === 'host' ? 'guest' : 'host';
        const updatedGame: GameState = {
          ...midGame,
          turn: nextTurn,
          winner: landingPos === BOARD_CELLS ? (isHost ? game.hostId : game.guestId) : undefined
        };
        await dbService.updateGame(updatedGame);
        setGame(updatedGame);
      }
    }, 800);
  };

  const getCellCoords = (cellNum: number) => {
    const rowIdx = Math.floor((cellNum - 1) / 10);
    const colInRow = (cellNum - 1) % 10;
    const colIdx = rowIdx % 2 === 0 ? colInRow : 9 - colInRow;
    return { x: (colIdx + 0.5) * 10, y: (9 - rowIdx + 0.5) * 10 };
  };

  const getCellColor = (cellNum: number) => {
    const colors = ['bg-[#5fa052]', 'bg-[#d6413a]', 'bg-[#eb9625]', 'bg-white'];
    return colors[cellNum % 4];
  };

  const renderBoard = () => {
    const cells = [];
    for (let row = 9; row >= 0; row--) {
      const isEvenRow = row % 2 !== 0;
      for (let col = 0; col < 10; col++) {
        const actualCol = isEvenRow ? 9 - col : col;
        const cellNum = row * 10 + actualCol + 1;
        const isHostHere = game?.hostPos === cellNum;
        const isGuestHere = game?.guestPos === cellNum;
        const cellColor = getCellColor(cellNum);

        cells.push(
          <div key={cellNum} className={`relative flex items-center justify-center border-[0.5px] border-black/10 transition-all duration-500 ${cellColor}`} style={{ width: '10%', aspectRatio: '1/1' }}>
            <span className={`absolute top-0.5 left-0.5 text-[8px] font-black select-none ${cellColor === 'bg-white' ? 'text-black/80' : 'text-black/40'}`}>{cellNum}</span>
            <div className="relative flex items-center justify-center w-full h-full gap-0.5 pointer-events-none">
              {isHostHere && <div className="w-5 h-5 bg-indigo-600 rounded-full border-2 border-white shadow-lg animate-bounce z-[40]"></div>}
              {isGuestHere && <div className="w-5 h-5 bg-emerald-600 rounded-full border-2 border-white shadow-lg animate-bounce z-[40]"></div>}
            </div>
          </div>
        );
      }
    }
    return cells;
  };

  if (!game) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-slate-950 p-6 animate-in fade-in duration-700">
        <div className="flex-1 flex flex-col justify-center items-center gap-10">
          <div className="text-center">
            <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-white shadow-2xl">
              <Trophy size={48} />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">Arena<br/><span className="text-indigo-500">Battle</span></h1>
          </div>
          <div className="w-full max-w-[280px] flex flex-col gap-4">
            <button disabled={loading} onClick={createGame} className="w-full bg-white text-black font-black py-4 rounded-2xl transition-all active:scale-95 shadow-xl flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'HOST NEW ROOM'}
            </button>
            <div className="flex items-center gap-3 opacity-20">
              <div className="h-[1px] flex-1 bg-white"></div>
              <span className="text-[8px] font-black uppercase text-white">OR JOIN</span>
              <div className="h-[1px] flex-1 bg-white"></div>
            </div>
            <div className="flex flex-col gap-2">
              <input type="text" maxLength={4} value={inputCode} onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))} placeholder="ROOM ID" className="w-full text-center font-mono font-black text-lg py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 outline-none focus:border-indigo-500" />
              <button disabled={loading || inputCode.length < 4} onClick={joinGame} className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-black text-xs active:scale-95 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="animate-spin" size={16} /> : 'JOIN ARENA'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isMyTurn = (game.turn === 'host' && game.hostId === myProfile?.uniqueId) ||
                   (game.turn === 'guest' && game.guestId === myProfile?.uniqueId);

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 text-white overflow-hidden animate-in zoom-in-95 duration-500">
      <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-slate-900/50 backdrop-blur-md sticky top-0 z-[100]">
        <div className="flex flex-col">
          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Global Room</span>
          <span className="text-sm font-black text-indigo-400">#{game.code}</span>
        </div>
        <button onClick={() => setGame(null)} className="px-4 py-2 bg-rose-500/10 text-rose-500 rounded-xl text-[9px] font-black border border-rose-500/20 active:scale-90 transition-transform">LEAVE ROOM</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-44">
        {/* PLAYER ARENA HEADER - ONLY NAMES, NO ICONS, SMALL FONT */}
        <div className="relative flex items-center justify-between gap-4 mb-8 mt-2 px-2">
           <div className={`flex-1 flex flex-col items-center justify-center p-3 rounded-3xl border transition-all duration-500 ${game.turn === 'host' ? 'bg-indigo-600/30 border-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.4)] scale-105' : 'bg-slate-900/40 border-slate-800 opacity-40'}`}>
              <div className="text-center">
                <span className="text-[10px] font-black text-white uppercase truncate max-w-[80px] block tracking-tighter">{game.hostId}</span>
              </div>
              {game.turn === 'host' && <div className="absolute -bottom-1 w-1 h-1 bg-indigo-500 rounded-full animate-ping"></div>}
           </div>

           <div className="z-10 bg-slate-950 px-2 py-3 border border-white/10 rounded-full flex flex-col items-center justify-center">
              <Sword size={12} className="text-slate-500" />
              <span className="text-[5px] font-black text-slate-600 mt-0.5 uppercase">VS</span>
           </div>

           <div className={`flex-1 flex flex-col items-center justify-center p-3 rounded-3xl border transition-all duration-500 ${game.turn === 'guest' ? 'bg-emerald-600/30 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-105' : 'bg-slate-900/40 border-slate-800 opacity-40'}`}>
              <div className="text-center">
                <span className="text-[10px] font-black text-white uppercase truncate max-w-[80px] block tracking-tighter">{game.guestId || 'WAITING'}</span>
              </div>
              {game.turn === 'guest' && <div className="absolute -bottom-1 w-1 h-1 bg-emerald-500 rounded-full animate-ping"></div>}
           </div>
        </div>

        <div className="w-full max-w-[95vw] mx-auto aspect-square bg-[#fffbeb] rounded-3xl border-8 border-amber-900/10 shadow-2xl overflow-hidden flex flex-wrap relative">
          {renderBoard()}
          <svg className="absolute inset-0 pointer-events-none z-10 w-full h-full" viewBox="0 0 100 100">
            {/* Ladders and Snakes SVG content */}
            <defs>
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="0.4" />
                <feOffset dx="0.2" dy="0.2" result="offsetblur" />
                <feComponentTransfer><feFuncA type="linear" slope="0.5" /></feComponentTransfer>
                <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            {Object.entries(LADDERS).map(([start, end]) => {
              const from = getCellCoords(parseInt(start));
              const to = getCellCoords(end);
              return (
                <g key={`ladder-${start}`} filter="url(#shadow)">
                  <line x1={from.x - 0.8} y1={from.y} x2={to.x - 0.8} y2={to.y} stroke="#047857" strokeWidth="0.8" />
                  <line x1={from.x + 0.8} y1={from.y} x2={to.x + 0.8} y2={to.y} stroke="#047857" strokeWidth="0.8" />
                  <line x1={from.x - 0.8} y1={from.y} x2={to.x - 0.8} y2={to.y} stroke="#10b981" strokeWidth="0.4" />
                  <line x1={from.x + 0.8} y1={from.y} x2={to.x + 0.8} y2={to.y} stroke="#10b981" strokeWidth="0.4" />
                  <line x1={from.x - 0.8} y1={from.y} x2={to.x + 0.8} y2={from.y} stroke="#047857" strokeWidth="0.3" />
                  <line x1={to.x - 0.8} y1={to.y} x2={to.x + 0.8} y2={to.y} stroke="#047857" strokeWidth="0.3" />
                  <line x1={from.x - 0.8} y1={from.y} x2={to.x + 0.8} y2={to.y} stroke="#10b981" strokeWidth="1.6" strokeDasharray="0.3 1.2" />
                </g>
              );
            })}
            {Object.entries(SNAKES).map(([start, end]) => {
              const from = getCellCoords(parseInt(start));
              const to = getCellCoords(end);
              const midX = (from.x + to.x) / 2 + (from.x > to.x ? 6 : -6);
              const midY = (from.y + to.y) / 2;
              const pathData = `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;
              return (
                <g key={`snake-${start}`} filter="url(#shadow)">
                  <path d={pathData} fill="none" stroke="#9f1239" strokeWidth="2.2" strokeLinecap="round" opacity="0.4" />
                  <path d={pathData} fill="none" stroke="#f43f5e" strokeWidth="1.8" strokeLinecap="round" />
                  <path d={pathData} fill="none" stroke="#be123c" strokeWidth="0.5" strokeDasharray="1 0.8" strokeLinecap="round" />
                  <g transform={`translate(${from.x}, ${from.y})`}>
                    <ellipse cx="0" cy="0" rx="1.4" ry="1.8" fill="#f43f5e" transform={`rotate(${Math.atan2(midY - from.y, midX - from.x) * 180 / Math.PI + 90})`} />
                    <circle cx="-0.5" cy="-0.5" r="0.2" fill="white" opacity="0.8" />
                    <circle cx="0.5" cy="-0.5" r="0.2" fill="white" opacity="0.8" />
                  </g>
                  <circle cx={to.x} cy={to.y} r="0.4" fill="#f43f5e" />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 flex flex-col items-center gap-4 max-w-md mx-auto bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent z-[100]">
        {game.winner ? (
          <div className="w-full px-4 animate-in slide-in-from-bottom-full pb-20">
            <div className="bg-indigo-600 p-6 rounded-[2rem] flex flex-col items-center gap-2 shadow-2xl">
              <Trophy size={40} className="text-white mb-2" />
              <h2 className="text-xl font-black text-white uppercase tracking-tighter">{game.winner} WON THE BATTLE!</h2>
              <button onClick={() => setGame(null)} className="mt-2 px-8 py-3 bg-white text-black rounded-xl font-black text-[10px] uppercase active:scale-95 transition-transform">BACK TO MENU</button>
            </div>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center gap-4 pb-24">
            <div className="relative group">
               {/* DICE DISPLAY */}
               <div className={`w-28 h-28 rounded-[3rem] border-4 flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-300 relative overflow-hidden
                  ${rolling ? 'animate-bounce border-indigo-400 shadow-indigo-500/40 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500' : 
                  'border-white/20 bg-gradient-to-br from-slate-800 to-slate-900 opacity-100'}`}>
                  <div className={`absolute inset-0 bg-white/10 blur-xl rounded-full scale-75 ${rolling ? 'opacity-100' : 'opacity-0'}`}></div>
                  <span className={`text-6xl font-black text-white drop-shadow-[0_4px_15px_rgba(0,0,0,0.8)] z-10 transition-transform ${rolling ? 'scale-110' : 'scale-100'}`}>
                    {game.lastDice || '?'}
                  </span>
               </div>
               
               {/* DICE ROLL BUTTON - RED FOR CLEAR VISIBILITY */}
               <button 
                disabled={!isMyTurn || rolling || isSliding || !game.guestId} 
                onClick={rollDice} 
                className={`absolute -bottom-1 -right-1 w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-75 shadow-2xl z-[110] border-2 border-white/20
                  ${isMyTurn && game.guestId && !rolling && !isSliding 
                    ? 'bg-rose-600 text-white cursor-pointer hover:bg-rose-500 shadow-rose-500/50' 
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'}`}
               >
                 {rolling ? <RefreshCw className="animate-spin" size={28} /> : <Dices size={28} className="text-white" />}
               </button>
            </div>
            <p className={`text-[10px] font-black uppercase tracking-[0.4em] transition-all duration-300 ${isMyTurn ? 'text-indigo-400 animate-pulse' : 'text-slate-600'}`}>
              {isMyTurn ? "Your Strategy Turn" : "Waiting for Enemy"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameTab;
