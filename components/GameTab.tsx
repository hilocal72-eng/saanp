
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, UserProfile, ChatMessage } from '../types';
import { dbService } from '../services/dbService';
import { LADDERS, SNAKES, BOARD_CELLS } from '../constants';
import { 
  Trophy, Sword, Frown, Star, Clock, Sparkles, Send, MessageSquare
} from 'lucide-react';

interface GameTabProps {
  myProfile: UserProfile | null;
  game: GameState | null;
  setGame: (g: GameState | null) => void;
  onProfileUpdate: (p: UserProfile | null) => void;
}

const TURN_TIMEOUT_SECONDS = 60;

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const Confetti = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden z-[200]">
    {[...Array(30)].map((_, i) => (
      <div 
        key={i}
        className="absolute w-2 h-2 rounded-sm animate-confetti-fall"
        style={{
          left: `${Math.random() * 100}%`,
          backgroundColor: ['#fbbf24', '#6366f1', '#f43f5e', '#10b981', '#ffffff'][i % 5],
          animationDelay: `${Math.random() * 4}s`,
          animationDuration: `${2.5 + Math.random() * 2.5}s`
        }}
      />
    ))}
  </div>
);

const CelebratingPlayer = () => (
  <div className="relative w-48 h-56 mx-auto mb-4 scale-110">
    <div className="absolute inset-0 bg-indigo-500/10 blur-[60px] rounded-full animate-pulse"></div>
    <svg viewBox="0 0 200 240" className="w-full h-full drop-shadow-[0_15px_25px_rgba(0,0,0,0.5)] relative z-10 animate-victory-bounce">
      <defs>
        <linearGradient id="skinGrad" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#ffdbac', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#f1c27d', stopOpacity: 1 }} />
        </linearGradient>
        <linearGradient id="trophyGrad" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#fde047', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#a16207', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <g className="animate-pulse">
        <path d="M40 40 L45 45 M45 40 L40 45" stroke="#fbbf24" strokeWidth="2" />
        <path d="M160 80 L165 85 M165 80 L160 85" stroke="#fbbf24" strokeWidth="2" />
        <path d="M30 150 L35 155 M35 150 L30 155" stroke="#fbbf24" strokeWidth="2" />
      </g>
      <path d="M85 160 L75 220" stroke="url(#skinGrad)" strokeWidth="12" strokeLinecap="round" />
      <path d="M115 160 L125 220" stroke="url(#skinGrad)" strokeWidth="12" strokeLinecap="round" />
      <rect x="65" y="220" width="20" height="10" rx="4" fill="#10b981" />
      <rect x="115" y="220" width="20" height="10" rx="4" fill="#10b981" />
      <path d="M75 130 L125 130 L130 165 L100 165 L100 155 L70 165 Z" fill="#10b981" />
      <path d="M80 130 L80 165" stroke="#059669" strokeWidth="3" />
      <path d="M120 130 L120 165" stroke="#059669" strokeWidth="3" />
      <path d="M75 80 L125 80 L130 140 L70 140 Z" fill="#f97316" />
      <path d="M90 80 L100 105 L110 80" stroke="#1e293b" strokeWidth="2" fill="none" />
      <circle cx="100" cy="110" r="8" fill="#fbbf24" stroke="#a16207" strokeWidth="1" />
      <path d="M85 45 Q100 35 115 45 L115 70 Q100 85 85 70 Z" fill="url(#skinGrad)" />
      <path d="M85 45 Q100 25 120 45 Q125 35 115 30 Q100 20 80 40 Z" fill="#1e293b" />
      <circle cx="93" cy="55" r="1.5" fill="#1e293b" />
      <circle cx="107" cy="55" r="1.5" fill="#1e293b" />
      <path d="M93 63 Q100 70 107 63" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M75 90 L40 50" stroke="url(#skinGrad)" strokeWidth="10" strokeLinecap="round" />
      <circle cx="40" cy="50" r="8" fill="url(#skinGrad)" />
      <path d="M125 90 L160 65" stroke="url(#skinGrad)" strokeWidth="10" strokeLinecap="round" />
      <g transform="translate(145, 10)">
        <path d="M10 10 H40 L38 35 C38 45 32 50 25 50 C18 50 12 45 12 35 Z" fill="url(#trophyGrad)" stroke="#854d0e" strokeWidth="1" />
        <path d="M10 15 H5 C2 15 2 25 5 25 H10 M40 15 H45 C48 15 48 25 45 25 H40" fill="none" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" />
        <rect x="22" y="50" width="6" height="8" fill="#451a03" />
        <rect x="15" y="58" width="20" height="6" rx="1" fill="#1e293b" />
      </g>
    </svg>
    <style>{`
      @keyframes victory-bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-15px); }
      }
      .animate-victory-bounce { animation: victory-bounce 1.5s ease-in-out infinite; }
    `}</style>
  </div>
);

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
  const gameRef = useRef<GameState | null>(game);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Chat States
  const [chatInput, setChatInput] = useState('');
  const [sessionMessages, setSessionMessages] = useState<ChatMessage[]>([]);
  
  useEffect(() => { gameRef.current = game; }, [game]);

  useEffect(() => {
    if (game) {
      setVisualHostPos(game.hostPos);
      setVisualGuestPos(game.guestPos);
    }
  }, [game?.id]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [sessionMessages]);

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
    if (!game) return;
    const hostDone = visualHostPos === game.hostPos;
    const guestDone = visualGuestPos === game.guestPos;
    if (hostDone && guestDone) { setIsAnimating(false); return; }
    const timer = setTimeout(() => {
      setIsAnimating(true);
      const calculateNextPos = (current: number, target: number) => {
        if (SNAKES[current] === target || LADDERS[current] === target) return target;
        const head = Object.keys(SNAKES).map(Number).find(k => SNAKES[k] === target) || Object.keys(LADDERS).map(Number).find(k => LADDERS[k] === target);
        const walkTarget = head || target;
        if (current < walkTarget) return current + 1;
        if (current > walkTarget) return target;
        return current;
      };
      if (!hostDone) setVisualHostPos(prev => calculateNextPos(prev, game.hostPos));
      if (!guestDone) setVisualGuestPos(prev => calculateNextPos(prev, game.guestPos));
    }, 220);
    return () => clearTimeout(timer);
  }, [game?.hostPos, game?.guestPos, visualHostPos, visualGuestPos]);

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
          if (remoteGame.hostPos !== current.hostPos || remoteGame.guestPos !== current.guestPos || remoteGame.turn !== current.turn || remoteGame.guestId !== current.guestId || remoteGame.winner !== current.winner || remoteGame.lastUpdated !== current.lastUpdated) {
            setGame(remoteGame); 
          }

          // Polling for session messages
          if (game.guestId) {
             const opponentId = game.hostId === myProfile.uniqueId ? game.guestId : game.hostId;
             // Explicitly fetch messages with gameId filter
             const msgs = await dbService.getMessages(myProfile.uniqueId, opponentId, game.id);
             setSessionMessages(msgs);
          }
        } catch (e) { console.debug("Sync failed"); }
      }, 2000);
    }
    return () => { isActive = false; clearInterval(interval); };
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

  const handleSendChat = async () => {
    if (!chatInput.trim() || !game || !myProfile || !game.guestId) return;
    const opponentId = game.hostId === myProfile.uniqueId ? game.guestId : game.hostId;
    const msg: ChatMessage = {
      id: '',
      senderId: myProfile.uniqueId,
      receiverId: opponentId,
      text: chatInput.trim(),
      timestamp: Date.now(),
      gameId: game.id // Tag with gameId for isolation
    };
    await dbService.sendMessage(msg);
    setChatInput('');
    setSessionMessages(prev => [...prev, msg]);
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
        <div className="absolute inset-0 z-0 opacity-30 mix-blend-screen" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=2070')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="relative z-10 flex-1 flex flex-col justify-center items-center gap-10">
          <div className="text-center flex flex-col items-center gap-4">
            <Trophy size={64} className="text-indigo-400 animate-bounce" />
            <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">Arena<br/><span className="text-indigo-400">Battle</span></h1>
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

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 text-white overflow-hidden relative pb-32">
      {game.winner && iWon && <Confetti />}
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

      <div className="px-6 py-4 flex items-center justify-between border-b border-white/10 bg-slate-900/50 backdrop-blur-md z-[100]">
        <div className="flex items-center gap-2"><Sword size={12} className="text-amber-400" /><span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Arena #{game.code}</span></div>
        <button onClick={() => setShowQuitModal(true)} className="px-3 py-1.5 bg-rose-500 text-white rounded-lg text-[9px] font-black border border-white/20 active:scale-90">QUIT</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col items-center">
        {/* BIG RECTANGLE CHAT FEED AREA */}
        <div className="w-full mb-6 mt-2 relative z-[110]">
          <div className="flex items-center gap-2 mb-2 px-1">
            <MessageSquare size={12} className="text-indigo-400" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400">Battle Feed</span>
          </div>
          <div 
            ref={chatScrollRef}
            className="w-full h-24 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-y-auto p-3 flex flex-col gap-2 shadow-inner"
          >
            {sessionMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">No Transmission</p>
              </div>
            ) : (
              sessionMessages.map((m, i) => (
                <div key={i} className="flex flex-col gap-0.5 animate-in fade-in slide-in-from-left-2 duration-300">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1 h-3 rounded-full ${m.senderId === game.hostId ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                    <span className={`text-[7px] font-black uppercase tracking-widest ${m.senderId === game.hostId ? 'text-indigo-300' : 'text-emerald-300'}`}>
                      {m.senderId}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-white/90 pl-2.5 leading-tight break-words">
                    {m.text}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-center items-center gap-3 mb-6 relative z-[110]">
           <div className={`px-2 py-1.5 rounded-xl border flex flex-col items-center min-w-[85px] relative ${game.turn === 'host' ? 'bg-indigo-600 border-white scale-105' : 'bg-slate-800 border-white/10 opacity-80'}`}>
              <span className="text-base font-black text-white leading-none">{game.hostLastDice || '-'}</span>
              <span className="text-[8px] font-black mt-0.5 uppercase tracking-widest truncate max-w-[75px]">{game.hostId}</span>
              {game.turn === 'host' && !game.winner && <div className="flex items-center gap-1 mt-1 text-white"><Clock size={8} /><span className="text-[7px] font-black">{formatTime(timeLeft)}</span></div>}
           </div>
           <div className={`px-2 py-1.5 rounded-xl border flex flex-col items-center min-w-[85px] relative ${game.turn === 'guest' ? 'bg-emerald-600 border-white scale-105' : 'bg-slate-800 border-white/10 opacity-80'}`}>
              <span className="text-base font-black text-white leading-none">{game.guestLastDice || '-'}</span>
              <span className="text-[8px] font-black mt-0.5 uppercase tracking-widest truncate max-w-[75px]">{game.guestId || ''}</span>
              {game.turn === 'guest' && !game.winner && game.guestId && <div className="flex items-center gap-1 mt-1 text-white"><Clock size={8} /><span className="text-[7px] font-black">{formatTime(timeLeft)}</span></div>}
           </div>
        </div>

        <div className="w-full max-w-full mx-auto bg-white rounded-xl border-[4px] border-slate-900 shadow-2xl relative aspect-square overflow-hidden mb-6">
          <div className="absolute inset-0 flex flex-wrap z-10">{renderBoard()}</div>
          <svg className="absolute inset-0 pointer-events-none z-[40] w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            {Object.entries(LADDERS).map(([start, end]) => {
              const s = getCellCoords(parseInt(start));
              const e = getCellCoords(end);
              const dx = e.x - s.x;
              const dy = e.y - s.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const px = -dy / dist;
              const py = dx / dist;
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
                    <circle r="2.2" fill={color} stroke="black" strokeWidth="0.3" />
                    <circle cx="-0.6" cy="-0.6" r="0.4" fill="#fff" filter="url(#glow)" />
                    <circle cx="0.6" cy="-0.6" r="0.4" fill="#fff" filter="url(#glow)" />
                  </g>
                  <circle cx={e.x} cy={e.y} r="0.8" fill={color} stroke="black" strokeWidth="0.2" />
                </g>
              );
            })}
          </svg>
          <div className="absolute inset-0 z-[60] pointer-events-none">
            <div className="absolute w-8 h-8 transition-all duration-150 ease-out" style={{ left: `${sameCell ? hostCoords.x - 2.5 : hostCoords.x}%`, top: `${hostCoords.y}%`, transform: 'translate(-50%, -85%)' }}><Pawn color="#4f46e5" /></div>
            <div className="absolute w-8 h-8 transition-all duration-150 ease-out" style={{ left: `${sameCell ? guestCoords.x + 2.5 : guestCoords.x}%`, top: `${guestCoords.y}%`, transform: 'translate(-50%, -85%)' }}><Pawn color="#10b981" /></div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-[75px] left-0 right-0 px-6 z-[110] flex flex-col items-center pointer-events-none">
        {game.winner ? (
          <div className={`w-full max-w-[300px] p-8 rounded-[3rem] text-center shadow-2xl border-2 animate-in slide-in-from-bottom-5 pointer-events-auto ${iWon ? 'bg-indigo-600 border-white' : 'bg-slate-900 border-rose-500'}`}>
            {iWon ? (
              <>
                <CelebratingPlayer />
                <h2 className="text-6xl font-righteous tracking-tight animate-shimmer bg-gradient-to-r from-yellow-200 via-yellow-500 to-yellow-200 bg-clip-text text-transparent drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)] py-4">
                  You Won
                </h2>
              </>
            ) : (
              <>
                <Frown size={48} className="text-rose-500 mx-auto mb-4 animate-bounce" />
                <h2 className="text-3xl font-black uppercase text-rose-500 italic tracking-tighter">LOSER</h2>
                <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] mt-1">Better Luck Next Battle</p>
              </>
            )}
            <button onClick={confirmLeave} className="w-full mt-8 py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 shadow-xl transition-all">BACK TO LOBBY</button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 pointer-events-auto w-full max-w-sm">
            {game.guestId && (
              <div className="w-full px-4 mb-2">
                <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/10 flex items-center p-1 shadow-inner ring-1 ring-white/5">
                  <input 
                    type="text" 
                    value={chatInput} 
                    onChange={(e) => setChatInput(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                    placeholder="Quick msg..."
                    className="flex-1 bg-transparent border-none outline-none text-[10px] font-bold text-white px-3 py-2 placeholder:text-slate-500"
                  />
                  <button onClick={handleSendChat} disabled={!chatInput.trim()} className="p-2 bg-indigo-600 text-white rounded-xl active:scale-90 disabled:opacity-40 transition-all">
                    <Send size={12} />
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col items-center gap-0.5">
              <button disabled={!isMyTurn || rolling || isAnimating || !game.guestId} onClick={rollDice} className={`w-12 h-12 rounded-[1rem] transition-all active:scale-90 relative ${!isMyTurn || rolling || isAnimating || !game.guestId ? 'opacity-40 grayscale pointer-events-none' : 'hover:scale-110'}`}>
                <IsometricDie value={rolling ? rollingDiceValue : (game.lastDice || 1)} rolling={rolling} />
                {isMyTurn && game.guestId && !rolling && !isAnimating && <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center border-2 border-white animate-pulse"><Sparkles size={10} className="text-white" /></div>}
              </button>
              <div className="text-center min-h-[10px]">
                {game.guestId && <p className={`text-[7px] font-black uppercase tracking-widest ${isMyTurn ? 'text-white' : 'text-slate-500'}`}>{isMyTurn ? "Roll!" : "Opponent"}</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameTab;
