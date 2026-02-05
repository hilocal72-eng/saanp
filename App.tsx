import React, { useState, useEffect } from 'react';
import { Tab, UserProfile, GameState } from './types';
import { dbService } from './services/dbService';
import ProfileTab from './components/ProfileTab';
import FriendsTab from './components/FriendsTab';
import GameTab from './components/GameTab';
import { User, Users, Gamepad2 } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.PROFILE);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [activeGame, setActiveGame] = useState<GameState | null>(null);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState(Date.now());

  useEffect(() => {
    const data = localStorage.getItem('snake_quest_db');
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (parsed.users && parsed.users.length > 0) {
          const user = parsed.users[0];
          dbService.findPlayerGlobal(user.uniqueId).then(fresh => {
            if (fresh) { setMyProfile(fresh); localStorage.setItem('snake_quest_db', JSON.stringify({ users: [fresh], friends: [], chats: [], games: [] })); }
            else setMyProfile(user);
          });
          setActiveTab(Tab.GAME);
        }
      } catch (e) { console.error("Load error", e); }
    }
  }, []);

  useEffect(() => {
    if (!myProfile?.name) return;
    const check = async () => {
      try {
        await dbService.updateLastSeen(myProfile.name);
        setPendingRequests(await dbService.getPendingRequestCount(myProfile.name));
        if (activeTab !== Tab.FRIENDS) { if (await dbService.getNewMessageCount(myProfile.name, lastCheckTime) > 0) setHasNewMessages(true); }
        else { setHasNewMessages(false); setLastCheckTime(Date.now()); }
      } catch (e) {}
    };
    check(); const interval = setInterval(check, 10000); return () => clearInterval(interval);
  }, [myProfile?.name, activeTab, lastCheckTime]);

  const renderProfileRequired = (title: string, description: string, icon: React.ReactElement<any>, tabType: Tab) => (
    <div className="relative flex flex-col items-center justify-center h-[100dvh] p-8 text-center animate-in fade-in zoom-in-95 bg-slate-950 overflow-hidden">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 opacity-[0.25]" style={{ backgroundImage: `linear-gradient(to right, #6366f1 1px, transparent 1px), linear-gradient(to bottom, #6366f1 1px, transparent 1px)`, backgroundSize: '45px 45px', maskImage: 'radial-gradient(ellipse at center, black, transparent 80%)', transform: 'perspective(600px) rotateX(30deg) scale(2.5)', transformOrigin: 'center top' }} />
        <div className="absolute top-[-10%] left-[-10%] w-[80%] h-[80%] bg-indigo-600/20 blur-[150px] rounded-full animate-pulse" />
      </div>
      <div className="relative z-10 flex flex-col items-center w-full max-w-[320px]">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-indigo-500/40 blur-3xl rounded-full scale-125 animate-pulse" />
          <div className="relative w-36 h-36 bg-slate-900 border-4 border-indigo-500/50 rounded-[3rem] flex items-center justify-center overflow-hidden shadow-[0_0_80px_rgba(79,70,229,0.5)]">
            <div className="w-full h-full bg-slate-950 rounded-[2.5rem] flex items-center justify-center border border-white/20 relative">
               <div className="relative z-10 text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">{React.cloneElement(icon, { size: 64, strokeWidth: 2.5 })}</div>
            </div>
          </div>
        </div>
        <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-[0.85]">{title}</h2>
        <p className="text-white mt-6 font-black text-[10px] uppercase tracking-widest px-4">{description}</p>
        <button onClick={() => setActiveTab(Tab.PROFILE)} className="mt-10 w-full bg-white text-black py-4 rounded-2xl font-black shadow-xl active:scale-95 tracking-[0.2em] text-xs">CREATE PLAYER</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-slate-950 flex flex-col max-w-md mx-auto relative overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] border-x border-slate-900">
      <main className="flex-1 overflow-hidden relative h-full">
        {/* Profile Tab - Conditional since it's the entry point */}
        <div className={activeTab === Tab.PROFILE ? 'h-full' : 'hidden'}>
          <ProfileTab currentProfile={myProfile} onProfileUpdate={(p) => { setMyProfile(p); if (!p) { setActiveTab(Tab.PROFILE); setActiveGame(null); } }} />
        </div>
        
        {/* Friends Tab - Hidden CSS used to preserve state */}
        <div className={activeTab === Tab.FRIENDS ? 'h-full' : 'hidden'}>
          {myProfile ? <FriendsTab myProfile={myProfile} /> : renderProfileRequired("Social Center", "Connect with players and build your squad.", <Users />, Tab.FRIENDS)}
        </div>
        
        {/* Game Tab - Hidden CSS used to preserve timer and state */}
        <div className={activeTab === Tab.GAME ? 'h-full' : 'hidden'}>
          {myProfile ? <GameTab myProfile={myProfile} game={activeGame} setGame={setActiveGame} onProfileUpdate={setMyProfile} /> : renderProfileRequired("Wanna Play?", "Unlock global matchmaking and start your quest.", <Gamepad2 />, Tab.GAME)}
        </div>
      </main>
      
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-[360px] z-[150]">
        <nav className="bg-slate-900/90 backdrop-blur-2xl rounded-[2.2rem] border border-white/10 shadow-2xl px-1.5 py-1.5 flex justify-around items-center">
          <button onClick={() => setActiveTab(Tab.PROFILE)} className={`flex-1 flex flex-col items-center gap-0.5 transition-all duration-300 py-2 rounded-2xl ${activeTab === Tab.PROFILE ? 'bg-indigo-600' : 'hover:bg-white/5'}`}>
            {myProfile?.avatarUrl ? <div className={`w-5 h-5 rounded-lg overflow-hidden border ${activeTab === Tab.PROFILE ? 'border-white' : 'border-white/20'}`}><img src={myProfile.avatarUrl} className="w-full h-full object-cover" /></div> : <User size={18} className={activeTab === Tab.PROFILE ? 'text-white' : 'text-slate-400'} />}
            <span className={`text-[7px] font-black uppercase tracking-widest ${activeTab === Tab.PROFILE ? 'text-white' : 'text-slate-400'}`}>Player</span>
          </button>
          <button onClick={() => setActiveTab(Tab.GAME)} className={`flex-1 flex flex-col items-center gap-0.5 transition-all duration-300 py-2 rounded-2xl ${activeTab === Tab.GAME ? 'bg-emerald-600' : 'hover:bg-white/5'}`}>
            <Gamepad2 size={18} className={activeTab === Tab.GAME ? 'text-white' : 'text-slate-400'} />
            <span className={`text-[7px] font-black uppercase tracking-widest ${activeTab === Tab.GAME ? 'text-white' : 'text-slate-400'}`}>Play</span>
          </button>
          <button onClick={() => setActiveTab(Tab.FRIENDS)} className={`flex-1 flex flex-col items-center gap-0.5 transition-all duration-300 py-2 rounded-2xl relative ${activeTab === Tab.FRIENDS ? 'bg-indigo-600' : 'hover:bg-white/5'}`}>
            {(pendingRequests > 0 || hasNewMessages) && <span className="absolute top-1 right-1/4 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
            <Users size={18} className={activeTab === Tab.FRIENDS ? 'text-white' : 'text-slate-400'} />
            <span className={`text-[7px] font-black uppercase tracking-widest ${activeTab === Tab.FRIENDS ? 'text-white' : 'text-slate-400'}`}>Social</span>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default App;