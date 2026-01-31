
import React, { useState, useEffect } from 'react';
import { GameState, UserProfile } from '../types';
import { dbService } from '../services/dbService';
import { LADDERS, SNAKES, BOARD_CELLS } from '../constants';
import { Trophy, RefreshCw, Loader2, Dices, Sword, AlertCircle, X, HelpCircle, WifiOff, Sparkles, User, Zap, Star } from 'lucide-react';

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
  const [isOpponentStale, setIsOpponentStale] = useState(false);
  const [statsUpdatedForGame, setStatsUpdatedForGame] = useState<string | null>(null);

  // Animation states for cell-by-cell movement
  const [visualHostPos, setVisualHostPos] = useState(game?.hostPos || 1);
  const [visualGuestPos, setVisualGuestPos] = useState(game?.guestPos || 1);
  const [isAnimatingSteps, setIsAnimatingSteps] = useState(false);

  const isMyTurn = !!(game && myProfile && (
    (game.turn === 'host' && game.hostId === myProfile.uniqueId) ||
    (game.turn === 'guest' && game.guestId === myProfile.uniqueId)
  ));

  // Visual Step-by-Step Animation Loop
  useEffect(() => {
    if (!game) return;
    
    let moveTimeout: any;

    const animateSteps = () => {
      // Host visual catch-up
      if (visualHostPos < game.hostPos) {
        setIsAnimatingSteps(true);
        moveTimeout = setTimeout(() => {
          setVisualHostPos(prev => Math.min(prev + 1, game.hostPos));
        }, 150);
        return;
      }
      
      // Guest visual catch-up
      if (visualGuestPos < game.guestPos) {
        setIsAnimatingSteps(true);
        moveTimeout = setTimeout(() => {
          setVisualGuestPos(prev => Math.min(prev + 1, game.guestPos));
        }, 150);
        return;
      }

      // Sync teleport for snakes or backward movements
      if (visualHostPos > game.hostPos) setVisualHostPos(game.hostPos);
      if (visualGuestPos > game.guestPos) setVisualGuestPos(game.guestPos);

      setIsAnimatingSteps(false);
    };

    animateSteps();
    return () => clearTimeout(moveTimeout);
  }, [game?.hostPos, game?.guestPos, visualHostPos, visualGuestPos]);

  // Polling logic for remote updates and Stat Sync
  useEffect(() => {
    let interval: any;
    if (game && myProfile) {
      interval = setInterval(async () => {
        const remoteGame = await dbService.getGameByCode(game.code);
        
        // IF ROOM WAS DELETED BY OPPONENT
        if (!remoteGame) {
          setGame(null);
          setVisualHostPos(1);
          setVisualGuestPos(1);
          return;
        }

        // DETECT WINNER (Either via game end or forfeit)
        if (remoteGame.winner && statsUpdatedForGame !== remoteGame.id) {
          setGame(remoteGame);
          const iWon = remoteGame.winner === myProfile.uniqueId;
          await syncMyStatsLocally(iWon, remoteGame.id!);
          return;
        }

        // DETECT STALE OPPONENT
        if (remoteGame.guestId && !remoteGame.winner) {
          const opponentUid = remoteGame.hostId === myProfile.uniqueId ? remoteGame.guestId : remoteGame.hostId;
          const opponent = await dbService.findPlayerGlobal(opponentUid);
          if (opponent && opponent.lastSeen && (Date.now() - opponent.lastSeen > 60000)) {
            setIsOpponentStale(true);
            const finalGame = { ...remoteGame, winner: myProfile.uniqueId };
            await dbService.updateGame(finalGame);
            await syncMyStatsLocally(true, remoteGame.id!);
            setGame(finalGame);
            return;
          } else { setIsOpponentStale(false); }
        }

        if (JSON.stringify(remoteGame) !== JSON.stringify(game)) { 
          setGame(remoteGame); 
        }
        await dbService.updateGame({ ...remoteGame }); 
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [game?.id, game?.winner, game?.code, myProfile?.uniqueId, statsUpdatedForGame]);

  const syncMyStatsLocally = async (iWon: boolean, gameId: string) => {
    if (statsUpdatedForGame === gameId || !myProfile) return;
    setStatsUpdatedForGame(gameId);
    await dbService.incrementStats(myProfile.uniqueId, iWon);
    const updated = await dbService.findPlayerGlobal(myProfile.uniqueId);
    if (updated) {
      const db = { users: [updated], friends: [], chats: [], games: [] };
      localStorage.setItem('snake_quest_db', JSON.stringify(db));
    }
  };

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
      } else if (result.error === 'ROOM_FULL') setShowFullModal(true);
      else alert('Room not found.');
    } catch (e) { alert("Error joining game."); } finally { setLoading(false); }
  };

  const confirmLeave = async () => {
    if (!game || !myProfile) return;
    const isHost = game.hostId === myProfile.uniqueId;
    
    if (game.guestId && !game.winner) {
      // Current player is forfeiting
      const winnerId = isHost ? game.guestId : game.hostId;
      const finalGame = { ...game, winner: winnerId };
      await dbService.updateGame(finalGame);
      await syncMyStatsLocally(false, game.id!);
      setGame(finalGame);
    } else if (game.id && (game.winner || !game.guestId)) {
      await dbService.deleteGame(game.id);
      setGame(null);
    } else {
      setGame(null);
    }
    
    setShowQuitModal(false);
    setIsOpponentStale(false);
    setVisualHostPos(1);
    setVisualGuestPos(1);
  };

  const rollDice = async () => {
    if (!game || rolling || isSliding || isAnimatingSteps || game.winner || !myProfile || !isMyTurn) return;
    setRolling(true);
    
    setTimeout(async () => {
      const dice = Math.floor(Math.random() * 6) + 1;
      const isHost = game.hostId === myProfile.uniqueId;
      let landingPos = (isHost ? game.hostPos : game.guestPos) + dice;
      
      if (landingPos > BOARD_CELLS) landingPos = isHost ? game.hostPos : game.guestPos;
      
      const midUpdate = {
        ...game,
        hostPos: isHost ? landingPos : game.hostPos,
        guestPos: !isHost ? landingPos : game.guestPos,
        lastDice: dice,
        hostLastDice: isHost ? dice : (game.hostLastDice || 0),
        guestLastDice: !isHost ? dice : (game.guestLastDice || 0)
      };
      
      setGame(midUpdate);
      setRolling(false);

      const checkSpecial = async () => {
        const finalPos = LADDERS[landingPos] || SNAKES[landingPos] || landingPos;
        if (finalPos !== landingPos) {
          setIsSliding(true);
          setTimeout(async () => {
            const winnerId = finalPos === BOARD_CELLS ? (isHost ? game.hostId : game.guestId!) : undefined;
            const finalUpdate = { 
              ...midUpdate, 
              hostPos: isHost ? finalPos : game.hostPos, 
              guestPos: !isHost ? finalPos : game.guestPos, 
              turn: (game.turn === 'host' ? 'guest' : 'host') as any, 
              winner: winnerId 
            };
            await dbService.updateGame(finalUpdate);
            setGame(finalUpdate);
            setIsSliding(false);
            if (winnerId) await syncMyStatsLocally(winnerId === myProfile.uniqueId, game.id!);
          }, 1000);
        } else {
          const winnerId = landingPos === BOARD_CELLS ? (isHost ? game.hostId : game.guestId!) : undefined;
          const finalUpdate = { ...midUpdate, turn: (game.turn === 'host' ? 'guest' : 'host') as any, winner: winnerId };
          await dbService.updateGame(finalUpdate);
          setGame(finalUpdate);
          if (winnerId) await syncMyStatsLocally(winnerId === myProfile.uniqueId, game.id!);
        }
      };

      setTimeout(checkSpecial, dice * 160 + 500);
    }, 800);
  };

  const renderBoard = () => {
    const cells = [];
    for (let row = 9; row >= 0; row--) {
      const isEvenRow = row % 2 !== 0;
      for (let col = 0; col < 10; col++) {
        const actualCol = isEvenRow ? 9 - col : col;
        const cellNum = row * 10 + actualCol + 1;
        const isHostHere = visualHostPos === cellNum;
        const isGuestHere = visualGuestPos === cellNum;
        const colors = ['bg-[#5fa052]', 'bg-[#d6413a]', 'bg-[#eb9625]', 'bg-[#fffbeb]'];
        const cellColor = colors[cellNum % 4];
        cells.push(
          <div key={cellNum} className={`relative flex items-center justify-center border-[0.5px] border-black/10 transition-all duration-300 ${cellColor}`} style={{ width: '10%', aspectRatio: '1/1' }}>
            <span className={`absolute top-0.5 left-0.5 text-[8px] font-black select-none ${cellColor === 'bg-[#fffbeb]' ? 'text-black/80' : 'text-black/40'}`}>{cellNum}</span>
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
      <div className="flex flex-col min-h-[100dvh] bg-slate-950 p-8 animate-in fade-in duration-700 relative overflow-hidden">
        {/* FANCY GAMING WALLPAPER BACKGROUND */}
        <div 
          className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-screen"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=2070')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'grayscale(0.5) contrast(1.2)'
          }}
        />
        
        {/* NEON OVERLAYS */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-30">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/20 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] bg-emerald-500/20 blur-[100px] rounded-full"></div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center items-center gap-10">
          
          {/* MAIN ARENA ACTION */}
          <div className="text-center flex flex-col items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-30 animate-pulse"></div>
              <div className="w-32 h-32 bg-slate-900/60 backdrop-blur-2xl border-2 border-indigo-500/50 rounded-[3rem] flex items-center justify-center shadow-[0_0_60px_rgba(79,70,229,0.5)] relative z-10 rotate-3 animate-bounce">
                <Trophy size={64} className="text-indigo-400 drop-shadow-[0_0_20px_rgba(79,70,229,0.8)]" />
                <div className="absolute -top-3 -right-3 w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white rotate-12 shadow-2xl border-4 border-slate-950">
                  <Star size={20} fill="currentColor" />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <h2 className="text-indigo-400 font-black text-xs uppercase tracking-[0.6em] drop-shadow-lg">Elite Tournament</h2>
              <h1 className="text-6xl font-black text-white tracking-tighter uppercase leading-[0.75] italic drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]">
                Arena<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-indigo-200 to-white">Battle</span>
              </h1>
            </div>
          </div>

          {/* ACTIONS CONTAINER - LIFTED TO PREVENT OVERLAP WITH NAVIGATION BAR */}
          <div className="w-full max-w-[260px] space-y-6 pb-48">
            <button 
              disabled={loading} 
              onClick={createGame} 
              className="group relative w-full bg-white text-black font-black py-5 rounded-[2rem] transition-all active:scale-95 shadow-[0_20px_40px_rgba(255,255,255,0.1)] overflow-hidden flex items-center justify-center gap-3 tracking-[0.25em] text-xs"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <><Zap size={18} fill="currentColor" className="text-indigo-600" /> HOST NEW ROOM</>}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-100/40 to-transparent translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
            </button>
            
            <div className="relative pt-6">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 bg-slate-950/90 backdrop-blur-sm rounded-full border border-white/10 z-10 whitespace-nowrap italic">or Join room</div>
              <div className="absolute top-2.5 left-0 right-0 h-[1px] bg-white/10"></div>
              
              <div className="flex flex-col gap-3 mt-8">
                {/* SMALLER CODE INPUT */}
                <input 
                  type="text" 
                  maxLength={4} 
                  value={inputCode} 
                  onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))} 
                  placeholder="CODE" 
                  className="w-full text-center font-mono font-black text-xl py-2 rounded-2xl bg-slate-900/60 border border-slate-800 text-white placeholder:text-slate-700 outline-none focus:border-indigo-500 transition-all shadow-inner backdrop-blur-md" 
                />
                <button 
                  disabled={loading || inputCode.length < 4} 
                  onClick={joinGame} 
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] active:scale-95 shadow-2xl shadow-indigo-900/50 flex items-center justify-center gap-2 border border-white/10"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : 'JOIN ARENA'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isForfeitWin = game.winner === myProfile?.uniqueId && game.hostPos < 100 && game.guestPos < 100;

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 text-white overflow-hidden animate-in zoom-in-95 duration-500 pb-56">
      {/* QUIT CONFIRMATION MODAL */}
      {showQuitModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-slate-900 border border-rose-500/30 p-8 rounded-[2rem] shadow-2xl text-center max-w-xs w-full relative">
            <div className="w-16 h-16 bg-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6"><HelpCircle size={32} className="text-rose-500" /></div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-tight mb-2">Leave Arena?</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-8">Leaving now will forfeit the match and record a loss in your profile.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowQuitModal(false)} className="w-full bg-slate-800 text-white font-black py-4 rounded-xl active:scale-95 text-[9px] tracking-widest uppercase border border-white/5">CANCEL</button>
              <button onClick={confirmLeave} className="w-full bg-rose-600 text-white font-black py-4 rounded-xl active:scale-95 text-[9px] tracking-widest uppercase shadow-lg shadow-rose-900/40">LEAVE</button>
            </div>
          </div>
        </div>
      )}

      {/* VICTORY MODAL */}
      {(isForfeitWin || isOpponentStale) && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-500">
          <div className="bg-slate-900 border-2 border-indigo-500 p-10 rounded-[3rem] shadow-[0_0_100px_rgba(79,70,229,0.4)] text-center max-w-xs w-full relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
            <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-indigo-700 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl animate-bounce">
              <Sparkles size={48} className="text-white" />
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none mb-3">Opponent Left!</h2>
            <p className="text-lg font-black text-indigo-400 uppercase tracking-tighter mb-10">You win by forfeit!</p>
            <button onClick={confirmLeave} className="w-full bg-white text-black font-black py-5 rounded-2xl shadow-xl active:scale-90 transition-all text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-2 group">HURRAY! <Trophy size={18} className="group-hover:rotate-12 transition-transform" /></button>
          </div>
        </div>
      )}

      <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-slate-900/50 backdrop-blur-md sticky top-0 z-[100]">
        <div className="flex flex-col">
          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Global Room</span>
          <span className="text-sm font-black text-indigo-400">#{game.code}</span>
        </div>
        <div className="flex items-center gap-3">
          {isOpponentStale && (
            <div className="flex items-center gap-1.5 bg-rose-500/10 text-rose-400 px-3 py-1.5 rounded-lg border border-rose-500/20 animate-pulse">
              <WifiOff size={12} />
              <span className="text-[8px] font-black uppercase">Opponent Offline</span>
            </div>
          )}
          <button onClick={() => setShowQuitModal(true)} className="px-4 py-2 bg-rose-500/10 text-rose-500 rounded-xl text-[9px] font-black border border-rose-500/20 active:scale-90 transition-transform">LEAVE ROOM</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-32">
        <div className="relative flex items-center justify-between gap-4 mb-8 mt-2 px-2">
           <div className={`flex-1 flex flex-col items-center justify-center p-3 rounded-3xl border transition-all duration-500 ${game.turn === 'host' ? 'bg-indigo-600/30 border-indigo-500 shadow-md scale-105' : 'bg-slate-900/40 border-slate-800 opacity-40'}`}>
              <span className="text-[10px] font-black text-white uppercase truncate max-w-[80px]">{game.hostId}</span>
           </div>
           <div className="z-10 bg-slate-950 px-2 py-3 border border-white/10 rounded-full flex flex-col items-center justify-center"><Sword size={12} className="text-slate-500" /></div>
           <div className={`flex-1 flex flex-col items-center justify-center p-3 rounded-3xl border transition-all duration-500 ${game.turn === 'guest' ? 'bg-emerald-600/30 border-emerald-500 shadow-md scale-105' : 'bg-slate-900/40 border-slate-800 opacity-40'}`}>
              <span className="text-[10px] font-black text-white uppercase truncate max-w-[80px]">{game.guestId || 'WAITING'}</span>
           </div>
        </div>

        {/* REALISTIC BOARD DESIGN */}
        <div className="w-full max-w-[95vw] mx-auto aspect-square bg-[#fffbeb] rounded-[2rem] border-[12px] border-amber-900 shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden flex flex-wrap relative">
          {renderBoard()}
          
          <svg className="absolute inset-0 pointer-events-none z-10 w-full h-full" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="snakeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#881337" />
              </linearGradient>
              <linearGradient id="ladderGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#064e3b" />
              </linearGradient>
            </defs>

            {/* REALISTIC LADDERS */}
            {Object.entries(LADDERS).map(([start, end]) => {
              const sR = Math.floor((parseInt(start) - 1) / 10);
              const sC = (parseInt(start) - 1) % 10;
              const sX = (sR % 2 === 0 ? sC : 9 - sC) * 10 + 5;
              const sY = (9 - sR) * 10 + 5;

              const eR = Math.floor((end - 1) / 10);
              const eC = (end - 1) % 10;
              const eX = (eR % 2 === 0 ? eC : 9 - eC) * 10 + 5;
              const eY = (9 - eR) * 10 + 5;

              const dist = Math.sqrt(Math.pow(eX - sX, 2) + Math.pow(eY - sY, 2));
              const rungsCount = Math.floor(dist / 4);
              const rungs = [];
              for (let i = 1; i < rungsCount; i++) {
                const ratio = i / rungsCount;
                const rX = sX + (eX - sX) * ratio;
                const rY = sY + (eY - sY) * ratio;
                rungs.push(<line key={`rung-${i}`} x1={rX - 1.5} y1={rY} x2={rX + 1.5} y2={rY} stroke="url(#ladderGrad)" strokeWidth="0.8" />);
              }

              return (
                <g key={`ladder-${start}`}>
                   <line x1={sX-1.2} y1={sY} x2={eX-1.2} y2={eY} stroke="url(#ladderGrad)" strokeWidth="1.2" strokeLinecap="round" />
                   <line x1={sX+1.2} y1={sY} x2={eX+1.2} y2={eY} stroke="url(#ladderGrad)" strokeWidth="1.2" strokeLinecap="round" />
                   {rungs}
                </g>
              );
            })}

            {/* REALISTIC SNAKES */}
            {Object.entries(SNAKES).map(([start, end]) => {
              const sR = Math.floor((parseInt(start) - 1) / 10);
              const sC = (parseInt(start) - 1) % 10;
              const sX = (sR % 2 === 0 ? sC : 9 - sC) * 10 + 5;
              const sY = (9 - sR) * 10 + 5;

              const eR = Math.floor((end - 1) / 10);
              const eC = (end - 1) % 10;
              const eX = (eR % 2 === 0 ? eC : 9 - eC) * 10 + 5;
              const eY = (9 - eR) * 10 + 5;

              const ctrlX = (sX + eX) / 2 + (sX > eX ? 15 : -15);
              const ctrlY = (sY + eY) / 2;

              return (
                <path 
                  key={`snake-${start}`} 
                  d={`M ${sX} ${sY} Q ${ctrlX} ${ctrlY} ${eX} ${eY}`} 
                  fill="none" 
                  stroke="url(#snakeGrad)" 
                  strokeWidth="3.5" 
                  strokeLinecap="round"
                  strokeDasharray="1 2"
                  className="animate-pulse"
                />
              );
            })}
          </svg>
        </div>
      </div>

      <div className="fixed bottom-[115px] left-0 right-0 px-6 flex flex-col items-center gap-4 max-w-md mx-auto z-[110]">
        {game.winner ? (
          <div className="w-full px-4 animate-in slide-in-from-bottom-full">
            <div className="bg-indigo-600 p-6 rounded-[2rem] flex flex-col items-center gap-2 shadow-2xl border border-white/20">
              <Trophy size={40} className="text-white mb-2" />
              <h2 className="text-xl font-black text-white uppercase tracking-tighter text-center">
                {game.winner === myProfile?.uniqueId ? 'VICTORY IN BATTLE!' : 'DEFEAT IN ARENA'}
              </h2>
              <button onClick={confirmLeave} className="mt-2 px-8 py-3 bg-white text-black rounded-xl font-black text-[10px] uppercase active:scale-95 transition-transform">BACK TO MENU</button>
            </div>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center gap-4">
            <div className="flex items-center gap-10 relative bg-slate-900/95 backdrop-blur-xl px-10 py-6 rounded-[2.5rem] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
               <div className="flex flex-col items-center gap-2">
                 <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center shadow-lg transition-all duration-300 ${(rolling && game.turn === 'host') ? 'animate-bounce border-indigo-400 bg-indigo-600 scale-110' : 'border-indigo-500/20 bg-indigo-600 opacity-100'}`}>
                    <span className="text-xl font-black text-white">{game.hostLastDice || '-'}</span>
                 </div>
                 <span className="text-[6px] font-black uppercase text-indigo-400 tracking-widest">HOST</span>
               </div>
               <div className="h-8 w-[1px] bg-white/10"></div>
               <div className="flex flex-col items-center gap-2">
                 <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center shadow-lg transition-all duration-300 ${(rolling && game.turn === 'guest') ? 'animate-bounce border-emerald-400 bg-emerald-600 scale-110' : 'border-emerald-500/20 bg-emerald-600 opacity-100'}`}>
                    <span className="text-xl font-black text-white">{game.guestLastDice || '-'}</span>
                 </div>
                 <span className="text-[6px] font-black uppercase text-emerald-400 tracking-widest">GUEST</span>
               </div>
               <button 
                disabled={!isMyTurn || rolling || isSliding || isAnimatingSteps || !game.guestId} 
                onClick={rollDice} 
                className={`absolute -top-8 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-75 shadow-[0_0_30px_rgba(79,70,229,0.5)] z-[120] border-4 border-slate-950 ${isMyTurn && game.guestId && !rolling && !isSliding && !isAnimatingSteps ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'}`}
               >
                 {rolling ? <RefreshCw className="animate-spin" size={40} /> : <Dices size={44} className="text-white" />}
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameTab;
