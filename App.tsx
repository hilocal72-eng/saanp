
import React, { useState, useEffect } from 'react';
import { Tab, UserProfile } from './types';
import { dbService } from './services/dbService';
import ProfileTab from './components/ProfileTab';
import FriendsTab from './components/FriendsTab';
import GameTab from './components/GameTab';
import { User, Users, Gamepad2 } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.GAME);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState(Date.now());

  useEffect(() => {
    const loadProfile = () => {
      const data = localStorage.getItem('snake_quest_db');
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.users && parsed.users.length > 0) {
          const profile = parsed.users[0];
          setMyProfile(profile);
          return profile;
        }
      }
      return null;
    };

    const initialProfile = loadProfile();

    const checkNotifications = async () => {
      const currentName = myProfile?.name || initialProfile?.name;
      if (currentName) {
        try {
          // Heartbeat
          await dbService.updateLastSeen(currentName);
          
          const reqCount = await dbService.getPendingRequestCount(currentName);
          setPendingRequests(reqCount);

          if (activeTab !== Tab.FRIENDS) {
            const msgCount = await dbService.getNewMessageCount(currentName, lastCheckTime);
            if (msgCount > 0) setHasNewMessages(true);
          } else {
            setHasNewMessages(false);
            setLastCheckTime(Date.now());
          }
        } catch (e) {
          console.debug("Polling sync...");
        }
      }
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 10000); // 10s heartbeat
    return () => clearInterval(interval);
  }, [myProfile?.name, activeTab, lastCheckTime]);

  const handleProfileUpdate = (p: UserProfile) => {
    setMyProfile(p);
  };

  const renderContent = () => {
    switch (activeTab) {
      case Tab.PROFILE:
        return <ProfileTab currentProfile={myProfile} onProfileUpdate={handleProfileUpdate} />;
      case Tab.FRIENDS:
        return myProfile ? <FriendsTab myProfile={myProfile} /> : (
          <div className="flex flex-col items-center justify-center h-[100dvh] p-8 text-center animate-in fade-in zoom-in-95 bg-slate-950">
            <div className="w-24 h-24 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400 mb-8 border border-indigo-500/20 shadow-[0_0_50px_rgba(99,102,241,0.1)]">
              <Users size={48} />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Sign In Required</h2>
            <p className="text-slate-300 mt-4 font-medium leading-relaxed max-w-[280px]">You need a player profile to add friends and chat. Set yours up now!</p>
            <button 
              onClick={() => setActiveTab(Tab.PROFILE)}
              className="mt-10 bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-indigo-900/40 transition-all active:scale-95"
            >
              CREATE PLAYER
            </button>
          </div>
        );
      case Tab.GAME:
        return <GameTab myProfile={myProfile} />;
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
