
import React, { useState, useEffect } from 'react';
import { Tab, UserProfile, GameState } from './types';
import { dbService } from './services/dbService';
import ProfileTab from './components/ProfileTab';
import FriendsTab from './components/FriendsTab';
import GameTab from './components/GameTab';
import { User, Users, Gamepad2, Sparkles, Sword, Trophy, Zap } from 'lucide-react';

const App: React.FC = () => {
  // Default to PROFILE tab to ensure setup is the first thing users see
  const [activeTab, setActiveTab] = useState<Tab>(Tab.PROFILE);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [activeGame, setActiveGame] = useState<GameState | null>(null);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState(Date.now());

  // 1. Load profile and session ONLY once on mount
  useEffect(() => {
    const data = localStorage.getItem('snake_quest_db');
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (parsed.users && parsed.users.length > 0) {
          const user = parsed.users[0];
          setMyProfile(user);
          setActiveTab(Tab.GAME);
        }
      } catch (e) {
        console.error("Failed to load profile from storage", e);
      }
    }
  }, []);

  // 2. Poll for notifications ONLY if a profile exists
  useEffect(() => {
    if (!myProfile?.name) {
      setPendingRequests(0);
      setHasNewMessages(false);
      return;
    }

    const checkNotifications = async () => {
      try {
        await dbService.updateLastSeen(myProfile.name);
        
        const reqCount = await dbService.getPendingRequestCount(myProfile.name);
        setPendingRequests(reqCount);

        if (activeTab !== Tab.FRIENDS) {
          const msgCount = await dbService.getNewMessageCount(myProfile.name, lastCheckTime);
          if (msgCount > 0) setHasNewMessages(true);
        } else {
          setHasNewMessages(false);
          setLastCheckTime(Date.now());
        }
      } catch (e) {
        console.debug("Polling sync error...");
      }
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 10000);
    return () => clearInterval(interval);
  }, [myProfile?.name, activeTab, lastCheckTime]);

  const handleProfileUpdate = (p: UserProfile | null) => {
    setMyProfile(p);
    if (!p) {
      setActiveTab(Tab.PROFILE);
      setActiveGame(null);
    }
  };

  // Fixed: Changed icon type to React.ReactElement<any> to satisfy cloneElement requirements
  const renderProfileRequired = (title: string, subtitle: string, description: string, icon: React.ReactElement<any>) => (
    <div className="relative flex flex-col items-center justify-center h-[100dvh] p-8 text-center animate-in fade-in zoom-in-95 bg-slate-950 overflow-hidden">
      {/* GAMING BACKGROUND ELEMENTS */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage: `linear-gradient(to right, #6366f1 1px, transparent 1px), linear-gradient(to bottom, #6366f1 1px, transparent 1px)`,
            backgroundSize: '45px 45px',
            maskImage: 'radial-gradient(ellipse at center, black, transparent 80%)',
            transform: 'perspective(600px) rotateX(30deg) scale(2.5)',
            transformOrigin: 'center top',
            animation: 'grid-scroll 10s linear infinite'
          }}
        />
        <div className="absolute top-[-10%] left-[-10%] w-[80%] h-[80%] bg-indigo-600/20 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-15%] right-[-15%] w-[80%] h-[80%] bg-blue-600/20 blur-[150px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px]" />
      </div>

      <style>{`
        @keyframes grid-scroll {
          from { background-position: 0 0; }
          to { background-position: 0 45px; }
        }
        @keyframes badge-float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
        }
        @keyframes shine {
          from { transform: translateX(-100%) skewX(-20deg); }
          to { transform: translateX(200%) skewX(-20deg); }
        }
      `}</style>

      <div className="relative z-10 flex flex-col items-center w-full max-w-[320px]">
        <div className="relative mb-8 animate-[badge-float_5s_ease-in-out_infinite]">
          <div className="absolute inset-0 bg-indigo-500/40 blur-3xl rounded-full scale-125 animate-pulse"></div>
          <div className="relative w-40 h-40 bg-slate-900 border-4 border-indigo-500/30 rounded-[3rem] p-1 flex items-center justify-center overflow-hidden shadow-[0_0_80px_rgba(79,70,229,0.3)]">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/40 via-transparent to-blue-600/40"></div>
            <div className="w-full h-full bg-slate-950 rounded-[2.5rem] flex items-center justify-center border border-white/10 relative overflow-hidden group">
               <Sword size={24} className="absolute top-4 left-4 text-white/5 -rotate-12" />
               <Trophy size={24} className="absolute bottom-4 right-4 text-white/5 rotate-12" />
               <Zap size={24} className="absolute top-1/2 right-2 text-white/5 -translate-y-1/2" />
               <div className="relative z-10 text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                 {/* Fixed: Removed manual cast to fix TS overload mismatch error */}
                 {React.cloneElement(icon, { size: 72, strokeWidth: 2.5 })}
               </div>
               <div className="absolute inset-0 w-1/2 h-full bg-white/5 skew-x-[-20deg] animate-[shine_3s_infinite] pointer-events-none"></div>
            </div>
          </div>
        </div>

        <div className="space-y-2 mb-10">
          <h3 className="text-indigo-400 font-black text-xs uppercase tracking-[0.5em] mb-1">{subtitle}</h3>
          <h2 className="text-5xl font-black text-white tracking-tighter uppercase italic leading-[0.85] drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
            {title.split(' ')[0]}<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-300">{title.split(' ')[1]}</span>
          </h2>
          <p className="text-slate-400 mt-6 font-bold text-[11px] leading-relaxed uppercase tracking-widest px-4 opacity-80">
            {description}
          </p>
        </div>

        <div className="w-full">
          <button 
            onClick={() => setActiveTab(Tab.PROFILE)}
            className="group relative w-full bg-white text-black py-5 rounded-2xl font-black shadow-[0_15px_40px_rgba(255,255,255,0.1)] transition-all active:scale-95 overflow-hidden flex items-center justify-center gap-3 tracking-[0.2em] text-sm"
          >
            <Sparkles size={18} className="text-indigo-600 group-hover:animate-spin" />
            CREATE PLAYER
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-100/50 to-transparent translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
          </button>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case Tab.PROFILE:
        return <ProfileTab currentProfile={myProfile} onProfileUpdate={handleProfileUpdate} />;
      case Tab.FRIENDS:
        return myProfile ? <FriendsTab myProfile={myProfile} /> : renderProfileRequired(
          "Social Center", 
          "Elite Network",
          "Connect with legendary players and build your global squad.",
          <Users />
        );
      case Tab.GAME:
        return myProfile ? <GameTab myProfile={myProfile} game={activeGame} setGame={setActiveGame} /> : renderProfileRequired(
          "Wanna Play?", 
          "The Arena Awaits",
          "Unlock global matchmaking and start your quest to the top.",
          <Gamepad2 />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 flex flex-col max-w-md mx-auto relative overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] border-x border-slate-900">
      <main className="flex-1 overflow-hidden relative">
        {renderContent()}
      </main>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-[340px] z-[100]">
        <nav className="bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] border border-white/5 shadow-2xl shadow-black/50 px-2 py-2 flex justify-around items-center">
          <button 
            onClick={() => setActiveTab(Tab.PROFILE)}
            className={`flex-1 flex flex-col items-center gap-1 transition-all duration-300 py-2.5 rounded-3xl ${activeTab === Tab.PROFILE ? 'bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.4)]' : 'hover:bg-white/5'}`}
          >
            <User size={20} className={`transition-colors duration-300 ${activeTab === Tab.PROFILE ? 'text-white' : 'text-slate-400'}`} strokeWidth={3} />
            <span className={`text-[8px] font-black uppercase tracking-[0.2em] transition-colors duration-300 ${activeTab === Tab.PROFILE ? 'text-white' : 'text-slate-400'}`}>Player</span>
          </button>

          <button 
            onClick={() => setActiveTab(Tab.GAME)}
            className={`flex-1 flex flex-col items-center gap-1 transition-all duration-300 py-2.5 rounded-3xl ${activeTab === Tab.GAME ? 'bg-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'hover:bg-white/5'}`}
          >
            <Gamepad2 size={20} className={`transition-colors duration-300 ${activeTab === Tab.GAME ? 'text-white' : 'text-slate-400'}`} strokeWidth={3} />
            <span className={`text-[8px] font-black uppercase tracking-[0.2em] transition-colors duration-300 ${activeTab === Tab.GAME ? 'text-white' : 'text-slate-400'}`}>Play</span>
          </button>

          <button 
            onClick={() => setActiveTab(Tab.FRIENDS)}
            className={`flex-1 flex flex-col items-center gap-1 transition-all duration-300 py-2.5 rounded-3xl relative ${activeTab === Tab.FRIENDS ? 'bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.4)]' : 'hover:bg-white/5'}`}
          >
            {(pendingRequests > 0 || hasNewMessages) && (
              <span className={`absolute top-1 right-1/4 w-3 h-3 border-2 border-slate-900 rounded-full animate-bounce shadow-lg ${pendingRequests > 0 ? 'bg-rose-500 shadow-rose-900/60' : 'bg-indigo-400 shadow-indigo-900/60'}`}></span>
            )}
            <Users size={20} className={`transition-colors duration-300 ${activeTab === Tab.FRIENDS ? 'text-white' : 'text-slate-400'}`} strokeWidth={3} />
            <span className={`text-[8px] font-black uppercase tracking-[0.2em] transition-colors duration-300 ${activeTab === Tab.FRIENDS ? 'text-white' : 'text-slate-400'}`}>Social</span>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default App;
