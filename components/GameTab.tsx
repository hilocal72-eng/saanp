
import React, { useState, useEffect } from 'react';
import { GameState, UserProfile } from '../types';
import { dbService } from '../services/dbService';
import { LADDERS, SNAKES, BOARD_CELLS } from '../constants';
import { Trophy, RefreshCw, Loader2, Dices, Sword, AlertCircle, X, LogOut, HelpCircle } from 'lucide-react';

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
  const [showFullModal, setShowFullModal] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);

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
      const result = await dbService.joinGame(myProfile.uniqueId, inputCode);
      if (result.game) {
        setGame(result.game);
      } else if (result.error === 'ROOM_FULL') {
        setShowFullModal(true);
      } else if (result.error === 'ROOM_NOT_FOUND') {
        alert('Room not found. Check the code.');
      } else {
        alert('Could not join room. Try again.');
      }
    } catch (e) {
      alert("Error joining game.");
    } finally {
      setLoading(false);
    }
  };

  const handleGameEnd = async (winnerId: string, loserId: string) => {
    await dbService.incrementStats(winnerId, true);
    await dbService.incrementStats(loserId, false);
    
    if (myProfile && (myProfile.name === winnerId || myProfile.name === loserId)) {
      const updated = await dbService.findPlayerGlobal(myProfile.name);
      if (updated) {
        const db = { users: [updated], friends: [], chats: [], games: [] };
        localStorage.setItem('snake_quest_db', JSON.stringify(db));
      }
    }
  };

  const handleLeaveRoom = () => {
    if (!game) return;
    if (game.guestId && !game.winner) {
      setShowQuitModal(true);
    } else {
      confirmLeave();
    }
  };

  const confirmLeave = async () => {
    if (!game) return;
    const isHost = game.hostId === myProfile?.uniqueId;

    if (game.guestId && !game.winner) {
      const winnerId = isHost ? game.guestId : game.hostId;
      const loserId = isHost ? game.hostId : game.guestId;
      await handleGameEnd(winnerId, loserId);
    }

    if (game.id && (game.winner || !game.guestId)) {
      await dbService.deleteGame(game.id);
    }
    
    setGame(null);
    setShowQuitModal(false);
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
        lastDice: dice,
        hostLastDice: isHost ? dice : (game.hostLastDice || 0),
        guestLastDice: !isHost ? dice : (game.guestLastDice || 0)
      };
      setGame(midGame);
      setRolling(false);

      const finalPos = LADDERS[landingPos] || SNAKES[landingPos] || landingPos;
      
      if (finalPos !== landingPos) {
        setIsSliding(true);
        setTimeout(async () => {
          const nextTurn = game.turn === 'host' ? 'guest' : 'host';
          const winner = finalPos === BOARD_CELLS ? (isHost ? game.hostId : game.guestId!) : undefined;
          const updatedGame: GameState = {
            ...midGame,
            hostPos: isHost ? finalPos : game.hostPos,
            guestPos: !isHost ? finalPos : game.guestPos,
            turn: nextTurn,
            winner
          };
          await dbService.updateGame(updatedGame);
          setGame(updatedGame);
          setIsSliding(false);

          if (winner) {
            const loser = isHost ? game.guestId! : game.hostId;
            handleGameEnd(winner, loser);
          }
        }, 1000);
      } else {
        const nextTurn = game.turn === 'host' ? 'guest' : 'host';
        const winner = landingPos === BOARD_CELLS ? (isHost ? game.hostId : game.guestId!) : undefined;
        const updatedGame: GameState = {
          ...midGame,
          turn: nextTurn,
          winner
        };
        await dbService.updateGame(updatedGame);
        setGame(updatedGame);

        if (winner) {
          const loser = isHost ? game.guestId! : game.hostId;
          handleGameEnd(winner, loser);
        }
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
        {/* ROOM FULL MODAL */}
        {showFullModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-slate-900 border border-amber-500/30 p-10 rounded-[2.5rem] shadow-[0_0_80px_rgba(245,158,11,0.1)] text-center max-w-xs w-full relative">
              <button onClick={() => setShowFullModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
              <div className="w-20 h-20 bg-amber-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={48} className="text-amber-500" />
              </div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-tight mb-2">Arena Full</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                This battle room already has two legendary fighters. Try joining another code!
              </p>
              <button 
                onClick={() => setShowFullModal(false)}
                className="mt-10 w-full bg-white text-black font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all text-[11px] tracking-widest uppercase"
              >
                GOT IT
              </button>
            </div>
          </div>
        )}

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
      {/* QUIT MODAL */}
      {showQuitModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-slate-900 border border-rose-500/30 p-8 rounded-[2rem] shadow-[0_0_80px_rgba(244,63,94,0.1)] text-center max-w-xs w-full relative">
            <div className="w-16 h-16 bg-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <HelpCircle size={32} className="text-rose-500" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-tight mb-2">Quit Match?</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-8">
              Leaving mid-battle results in a loss. Surrender?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setShowQuitModal(false)}
                className="w-full bg-slate-800 text-white font-black py-4 rounded-xl active:scale-95 transition-all text-[9px] tracking-widest uppercase border border-white/5"
              >
                NO
              </button>
              <button 
                onClick={confirmLeave}
                className="w-full bg-rose-600 text-white font-black py-4 rounded-xl shadow-lg shadow-rose-900/40 active:scale-95 transition-all text-[9px] tracking-widest uppercase"
              >
                YES, QUIT
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-slate-900/50 backdrop-blur-md sticky top-0 z-[100]">
        <div className="flex flex-col">
          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Global Room</span>
          <span className="text-sm font-black text-indigo-400">#{game.code}</span>
        </div>
        <button onClick={handleLeaveRoom} className="px-4 py-2 bg-rose-500/10 text-rose-500 rounded-xl text-[9px] font-black border border-rose-500/20 active:scale-90 transition-transform">LEAVE ROOM</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-56">
        <div className="relative flex items-center justify-between gap-4 mb-8 mt-2 px-2">
           <div className={`flex-1 flex flex-col items-center justify-center p-3 rounded-3xl border transition-all duration-500 ${game.turn === 'host' ? 'bg-indigo-600/30 border-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.4)] scale-105' : 'bg-slate-900/40 border-slate-800 opacity-40'}`}>
              <div className="text-center">
                <span className="text-[10px] font-black text-white uppercase truncate max-w-[80px] block tracking-tighter">{game.hostId}</span>
              </div>
           </div>

           <div className="z-10 bg-slate-950 px-2 py-3 border border-white/10 rounded-full flex flex-col items-center justify-center">
              <Sword size={12} className="text-slate-500" />
           </div>

           <div className={`flex-1 flex flex-col items-center justify-center p-3 rounded-3xl border transition-all duration-500 ${game.turn === 'guest' ? 'bg-emerald-600/30 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-105' : 'bg-slate-900/40 border-slate-800 opacity-40'}`}>
              <div className="text-center">
                <span className="text-[10px] font-black text-white uppercase truncate max-w-[80px] block tracking-tighter">{game.guestId || 'WAITING'}</span>
              </div>
           </div>
        </div>

        <div className="w-full max-w-[95vw] mx-auto aspect-square bg-[#fffbeb] rounded-3xl border-8 border-amber-900/10 shadow-2xl overflow-hidden flex flex-wrap relative">
          {renderBoard()}
          <svg className="absolute inset-0 pointer-events-none z-10 w-full h-full" viewBox="0 0 100 100">
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
              <button onClick={handleLeaveRoom} className="mt-2 px-8 py-3 bg-white text-black rounded-xl font-black text-[10px] uppercase active:scale-95 transition-transform">BACK TO MENU</button>
            </div>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center gap-4 pb-28">
            <div className="flex items-center gap-6 relative">
               {/* HOST DICE (RED) */}
               <div className="flex flex-col items-center gap-2">
                 <div className={`w-20 h-20 rounded-[2.5rem] border-4 flex items-center justify-center shadow-[0_10px_40px_rgba(225,29,72,0.4)] transition-all duration-300 relative overflow-hidden border-rose-500/30
                    ${(rolling && game.turn === 'host') ? 'animate-bounce border-rose-400 bg-rose-600 scale-110 shadow-rose-500/60' : 
                    'bg-rose-900/40 opacity-100'}`}>
                    <span className="text-4xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] z-10">
                      {game.hostLastDice || '-'}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                 </div>
                 <span className="text-[7px] font-black uppercase text-rose-400 tracking-[0.2em]">HOST DICE</span>
               </div>

               <div className="h-10 w-[1px] bg-white/10"></div>

               {/* GUEST DICE (RED) */}
               <div className="flex flex-col items-center gap-2">
                 <div className={`w-20 h-20 rounded-[2.5rem] border-4 flex items-center justify-center shadow-[0_10px_40px_rgba(225,29,72,0.4)] transition-all duration-300 relative overflow-hidden border-rose-500/30
                    ${(rolling && game.turn === 'guest') ? 'animate-bounce border-rose-400 bg-rose-600 scale-110 shadow-rose-500/60' : 
                    'bg-rose-900/40 opacity-100'}`}>
                    <span className="text-4xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] z-10">
                      {game.guestLastDice || '-'}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                 </div>
                 <span className="text-[7px] font-black uppercase text-rose-400 tracking-[0.2em]">GUEST DICE</span>
               </div>
               
               <button 
                disabled={!isMyTurn || rolling || isSliding || !game.guestId} 
                onClick={rollDice} 
                className={`absolute -bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-75 shadow-2xl z-[110] border-4 border-slate-950
                  ${isMyTurn && game.guestId && !rolling && !isSliding 
                    ? 'bg-rose-600 text-white cursor-pointer hover:bg-rose-500 shadow-rose-500/50' 
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'}`}
               >
                 {rolling ? <RefreshCw className="animate-spin" size={24} /> : <Dices size={24} className="text-white" />}
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameTab;
