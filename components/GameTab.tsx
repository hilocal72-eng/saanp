
import React, { useState, useEffect } from 'react';
import { GameState, UserProfile } from '../types';
import { dbService } from '../services/dbService';
import { LADDERS, SNAKES, BOARD_CELLS } from '../constants';
import { Dice6, Trophy, Users, RefreshCw, LogIn, Plus, Zap, AlertCircle } from 'lucide-react';

interface GameTabProps {
  myProfile: UserProfile | null;
}

const GameTab: React.FC<GameTabProps> = ({ myProfile }) => {
  const [game, setGame] = useState<GameState | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    let interval: any;
    if (game && !game.winner) {
      interval = setInterval(() => {
        const remoteGame = dbService.getGameByCode(game.code);
        if (remoteGame && JSON.stringify(remoteGame) !== JSON.stringify(game)) {
          setGame(remoteGame);
        }
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [game]);

  const createGame = () => {
    if (!myProfile) return alert('Please complete your profile first');
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const newGame = dbService.hostGame(myProfile.uniqueId, code);
    setGame(newGame);
  };

  const joinGame = () => {
    if (!myProfile) return alert('Please complete your profile first');
    if (inputCode.length !== 4) return;
    const joined = dbService.joinGame(myProfile.uniqueId, inputCode);
    if (joined) {
      setGame(joined);
    } else {
      alert('Game room not found');
    }
  };

  const rollDice = () => {
    if (!game || rolling || game.winner || !myProfile) return;
    const isMyTurn = (game.turn === 'host' && game.hostId === myProfile.uniqueId) ||
                   (game.turn === 'guest' && game.guestId === myProfile.uniqueId);
    
    if (!isMyTurn) return;

    setRolling(true);
    if (window.navigator.vibrate) window.navigator.vibrate(40);

    setTimeout(() => {
      const dice = Math.floor(Math.random() * 6) + 1;
      let newPos: number;
      const isHost = game.hostId === myProfile.uniqueId;
      
      if (isHost) {
        newPos = game.hostPos + dice;
        if (newPos > BOARD_CELLS) newPos = game.hostPos;
      } else {
        newPos = game.guestPos + dice;
        if (newPos > BOARD_CELLS) newPos = game.guestPos;
      }

      if (LADDERS[newPos]) newPos = LADDERS[newPos];
      if (SNAKES[newPos]) newPos = SNAKES[newPos];

      const nextTurn = game.turn === 'host' ? 'guest' : 'host';
      const updatedGame: GameState = {
        ...game,
        hostPos: isHost ? newPos : game.hostPos,
        guestPos: !isHost ? newPos : game.guestPos,
        turn: nextTurn,
        lastDice: dice,
        winner: newPos === BOARD_CELLS ? (isHost ? game.hostId : game.guestId) : undefined
      };

      dbService.updateGame(updatedGame);
      setGame(updatedGame);
      setRolling(false);
    }, 800);
  };

  const renderBoard = () => {
    const cells = [];
    for (let row = 9; row >= 0; row--) {
      const isEvenRow = row % 2 !== 0;
      for (let col = 0; col < 10; col++) {
        const actualCol = isEvenRow ? 9 - col : col;
        const cellNum = row * 10 + actualCol + 1;
        const isSnake = SNAKES[cellNum];
        const isLadder = LADDERS[cellNum];
        const isHostHere = game?.hostPos === cellNum;
        const isGuestHere = game?.guestPos === cellNum;

        cells.push(
          <div 
            key={cellNum} 
            className={`relative flex items-center justify-center border-[0.5px] border-slate-700/30 transition-all duration-500 ${
              (row + actualCol) % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-800/20'
            }`}
            style={{ width: '10%', aspectRatio: '1/1' }}
          >
            <span className="absolute top-0.5 left-0.5 text-[6px] font-black text-slate-600 select-none">
              {cellNum}
            </span>
            
            {isSnake && (
              <div className="absolute inset-0 flex items-center justify-center opacity-40">
                <span className="text-sm drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]">🐍</span>
              </div>
            )}
            {isLadder && (
              <div className="absolute inset-0 flex items-center justify-center opacity-40">
                <span className="text-sm drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">🪜</span>
              </div>
            )}
            
            <div className="relative flex items-center justify-center w-full h-full">
              {isHostHere && (
                <div className="w-5 h-5 bg-indigo-500 rounded-full border border-white shadow-[0_0_15px_rgba(99,102,241,0.8)] animate-bounce z-10"></div>
              )}
              {isGuestHere && (
                <div className="w-5 h-5 bg-emerald-500 rounded-full border border-white shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-bounce z-10"></div>
              )}
            </div>
          </div>
        );
      }
    }
    return cells;
  };

  if (!myProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-slate-950 p-8 text-center animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mb-8 border border-rose-500/20">
          <Zap size={40} />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Game Locked</h1>
        <p className="text-slate-400 mt-4 leading-relaxed">Please set up your profile in the Profile tab to play.</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-slate-950 p-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex-1 flex flex-col justify-center items-center gap-10">
          <div className="text-center">
            <div className="w-32 h-32 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 text-white rotate-6 shadow-[0_0_60px_rgba(79,70,229,0.3)] border border-white/10 group hover:rotate-0 transition-transform duration-500">
              <Dice6 size={64} className="animate-pulse" />
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter uppercase leading-none">Snake<br/><span className="text-indigo-500">Quest</span></h1>
            <p className="text-slate-500 font-bold mt-4 tracking-widest text-xs uppercase">Classic Multiplayer</p>
          </div>

          <div className="w-full max-w-[300px] flex flex-col gap-4">
            <button 
              onClick={createGame}
              className="w-full bg-white text-black font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl"
            >
              HOST NEW GAME
            </button>
            
            <div className="flex items-center gap-4 py-2 opacity-20">
              <div className="h-[1px] flex-1 bg-white"></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-white">OR</span>
              <div className="h-[1px] flex-1 bg-white"></div>
            </div>

            <div className="flex flex-col gap-3">
              <input 
                type="text" 
                maxLength={4}
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="ROOM CODE"
                className="w-full text-center font-mono font-black text-xl py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 outline-none focus:border-indigo-500 transition-colors"
              />
              <button 
                onClick={joinGame}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm active:scale-95 transition-all shadow-lg shadow-indigo-900/40"
              >
                JOIN GAME
              </button>
            </div>
          </div>
        </div>
        <div className="h-24"></div>
      </div>
    );
  }

  const isMyTurn = (game.turn === 'host' && game.hostId === myProfile.uniqueId) ||
                   (game.turn === 'guest' && game.guestId === myProfile.uniqueId);

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 text-white overflow-hidden animate-in zoom-in-95 duration-500">
      {/* Session Bar */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-slate-900/50 backdrop-blur-md">
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Room Code</span>
          <span className="text-sm font-black text-indigo-400">#{game.code}</span>
        </div>
        <button onClick={() => setGame(null)} className="px-3 py-1 bg-rose-500/10 text-rose-500 rounded-lg text-[10px] font-black border border-rose-500/20">QUIT</button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 pb-48">
        {/* Vital Monitors */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className={`p-4 rounded-2xl border transition-all duration-500 ${
            game.turn === 'host' ? 'bg-indigo-500/10 border-indigo-500/40 shadow-[0_0_20px_rgba(99,102,241,0.1)]' : 'bg-slate-900/40 border-transparent opacity-40'
          }`}>
            <p className="text-[8px] font-black uppercase text-slate-400">Host</p>
            <div className="mt-1 text-2xl font-black">{game.hostPos} <span className="text-[10px] text-slate-500 font-medium">/ 100</span></div>
          </div>
          <div className={`p-4 rounded-2xl border transition-all duration-500 ${
            game.turn === 'guest' ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-slate-900/40 border-transparent opacity-40'
          }`}>
            <p className="text-[8px] font-black uppercase text-slate-400">Guest</p>
            <div className="mt-1 text-2xl font-black">{game.guestPos || '-'} <span className="text-[10px] text-slate-500 font-medium">/ 100</span></div>
          </div>
        </div>

        {/* Tactical Grid */}
        <div className="w-full max-w-sm mx-auto aspect-square bg-slate-900 rounded-3xl border-4 border-slate-800 shadow-2xl overflow-hidden flex flex-wrap">
          {renderBoard()}
        </div>
        
        {!game.guestId && (
          <div className="mt-8 p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl text-center animate-pulse">
            <AlertCircle size={32} className="mx-auto text-indigo-500 mb-2" />
            <h4 className="font-black text-xs tracking-widest">WAITING FOR PLAYER...</h4>
            <p className="text-[10px] text-slate-400 mt-1 uppercase">SHARE ROOM CODE {game.code}</p>
          </div>
        )}
      </div>

      {/* Control Module */}
      <div className="fixed bottom-0 left-0 right-0 p-6 flex flex-col items-center gap-6 max-w-md mx-auto bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent z-50">
        {game.winner ? (
          <div className="w-full px-4 animate-in slide-in-from-bottom-full pb-20">
            <div className="bg-indigo-600 p-8 rounded-[2rem] flex flex-col items-center gap-3 shadow-[0_0_60px_rgba(79,70,229,0.3)]">
              <Trophy size={48} className="text-white" />
              <h2 className="text-2xl font-black text-white uppercase">{game.winner === myProfile.uniqueId ? 'YOU WIN!' : 'GAME OVER'}</h2>
              <button 
                onClick={() => setGame(null)}
                className="mt-4 px-10 py-3 bg-white text-black rounded-xl font-black text-xs uppercase"
              >
                RETURN TO MENU
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center gap-4 pb-24">
            <div className="flex items-center gap-8">
               <div className={`w-16 h-16 bg-slate-900 rounded-2xl border-2 border-slate-800 flex items-center justify-center transition-all ${rolling ? 'rotate-[360deg] border-indigo-500' : ''}`}>
                  <span className="text-3xl font-black">{game.lastDice || '?'}</span>
               </div>
               
               <button 
                 disabled={!isMyTurn || rolling || !game.guestId}
                 onClick={rollDice}
                 className={`w-32 h-16 rounded-2xl font-black text-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
                   isMyTurn && game.guestId
                   ? 'bg-white text-black shadow-xl shadow-white/10' 
                   : 'bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800'
                 }`}
               >
                 {rolling ? <RefreshCw className="animate-spin" /> : 'ROLL'}
               </button>
            </div>
            
            <p className={`text-[8px] font-black uppercase tracking-[0.4em] ${isMyTurn ? 'text-indigo-400 animate-pulse' : 'text-slate-700'}`}>
              {isMyTurn ? "Your Turn" : "Opponent's Turn"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameTab;
