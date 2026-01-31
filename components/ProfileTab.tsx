
import React, { useState, useEffect } from 'react';
import { UserProfile, Gender } from '../types';
import { dbService } from '../services/dbService';
import { User, CheckCircle2, Copy, AlertTriangle, PartyPopper, Lock, Sparkles, LogIn, UserPlus, LogOut } from 'lucide-react';

interface ProfileTabProps {
  onProfileUpdate: (p: UserProfile | null) => void;
  currentProfile: UserProfile | null;
}

const ProfileTab: React.FC<ProfileTabProps> = ({ onProfileUpdate, currentProfile }) => {
  const [mode, setMode] = useState<'create' | 'login'>('create');
  const [name, setName] = useState(currentProfile?.name || '');
  const [age, setAge] = useState(currentProfile?.age?.toString() || '');
  const [gender, setGender] = useState<Gender>(currentProfile?.gender || 'male');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (currentProfile) {
      setName(currentProfile.name);
      setAge(currentProfile.age.toString());
      setGender(currentProfile.gender as Gender);
    } else {
      setName('');
      setAge('');
      setGender('male');
    }
  }, [currentProfile]);

  const handleAction = async () => {
    if (currentProfile) return; 
    
    setError(null);
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      setError('Username is required');
      return;
    }

    setSaving(true);
    try {
      if (mode === 'login') {
        const player = await dbService.findPlayerGlobal(trimmedName);
        if (player) {
          const db = { users: [player], friends: [], chats: [], games: [] };
          localStorage.setItem('snake_quest_db', JSON.stringify(db));
          onProfileUpdate(player);
          setShowSuccess(true);
        } else {
          setError('No player found');
        }
      } else {
        if (!age || !gender) {
          setError('Please fill all details');
          setSaving(false);
          return;
        }
        if (trimmedName.length < 3) {
          setError('Username must be at least 3 characters');
          setSaving(false);
          return;
        }

        const profile: UserProfile = {
          name: trimmedName,
          age: parseInt(age),
          gender,
          uniqueId: trimmedName
        };
        
        const savedProfile = await dbService.saveProfile(profile);
        onProfileUpdate(savedProfile);
        setShowSuccess(true);
      }
    } catch (e: any) {
      if (e.message === 'USERNAME_TAKEN') {
        setError('This Username is already in use.');
      } else {
        setError('Error: ' + e.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (window.confirm('Log out from this player profile?')) {
      try {
        // 1. Wipe local storage
        localStorage.removeItem('snake_quest_db');
        
        // 2. Clear global state
        onProfileUpdate(null);
        
        // 3. Force hard refresh - App.tsx defaults to ProfileTab when no user is found
        window.location.reload();
      } catch (err) {
        console.error("Logout error:", err);
        window.location.reload();
      }
    }
  };

  const isLoggedIn = !!currentProfile;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-950 overflow-x-hidden relative">
      {/* GAMING BACKGROUND ELEMENTS */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: `linear-gradient(to right, #4f46e5 1px, transparent 1px), linear-gradient(to bottom, #4f46e5 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(ellipse at center, black, transparent 80%)',
            transform: 'perspective(500px) rotateX(20deg) scale(2)',
            transformOrigin: 'center top',
            animation: 'grid-move 20s linear infinite'
          }}
        />
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[10%] right-[-10%] w-[60%] h-[60%] bg-emerald-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
      </div>

      <style>{`
        @keyframes grid-move {
          from { background-position: 0 0; }
          to { background-position: 0 40px; }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-10px) scale(1.05); }
        }
      `}</style>

      <div className="relative z-10 flex flex-col p-6 pb-32 animate-in fade-in duration-700">
        {/* Success Modal */}
        {showSuccess && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-slate-900 border border-indigo-500/30 p-10 rounded-[2.5rem] shadow-[0_0_80px_rgba(79,70,229,0.2)] text-center max-w-xs w-full">
              <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-900/40">
                <PartyPopper size={40} className="text-white" />
              </div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-tight">
                {mode === 'login' ? 'Welcome Back!' : 'Congrats!'}
              </h2>
              <p className="text-slate-200 font-bold mt-4 uppercase tracking-widest text-xs">
                {mode === 'login' ? 'Profile loaded successfully' : 'Profile Created Successfully'}
              </p>
              <button 
                onClick={() => setShowSuccess(false)}
                className="mt-10 w-full bg-white text-black font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all text-sm tracking-widest uppercase"
              >
                START QUEST
              </button>
            </div>
          </div>
        )}

        <div className="text-center mt-12 mb-10">
          <div className="relative inline-block">
            <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-indigo-700 rounded-3xl shadow-[0_0_40px_rgba(79,70,229,0.3)] flex items-center justify-center mx-auto mb-6 rotate-3 border border-white/20 animate-[float-slow_4s_ease-in-out_infinite]">
              {isLoggedIn ? <Lock size={48} className="text-white -rotate-3" /> : (mode === 'login' ? <LogIn size={48} className="text-white -rotate-3" /> : <Sparkles size={48} className="text-white -rotate-3" />)}
            </div>
            {isLoggedIn && (
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border-2 border-slate-950 shadow-lg shadow-emerald-500/50">
                <CheckCircle2 size={16} />
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-center gap-4 relative">
            <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
              {isLoggedIn ? 'Identity' : (mode === 'login' ? 'Player Login' : 'Player Setup')}
            </h1>
            {isLoggedIn && (
              <button 
                onClick={handleLogout}
                type="button"
                className="p-3 bg-rose-500/20 hover:bg-rose-500/40 text-rose-500 rounded-2xl border-2 border-rose-500/30 transition-all active:scale-75 hover:scale-110 flex items-center justify-center cursor-pointer shadow-xl shadow-rose-950/40"
                aria-label="Logout"
              >
                <LogOut size={22} strokeWidth={3} />
              </button>
            )}
          </div>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] border border-white/10 p-8 space-y-6 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-center gap-3 text-rose-500 text-[10px] font-black uppercase tracking-wider animate-in shake duration-300">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          {!isLoggedIn && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Username</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value.replace(/\s/g, ''))}
                className={`w-full px-5 py-4 rounded-2xl bg-slate-950/50 border ${error ? 'border-rose-500' : 'border-white/5'} focus:border-indigo-500 outline-none transition-all text-white font-bold placeholder:text-slate-600 shadow-inner`}
                placeholder="Username"
              />
            </div>
          )}

          {mode === 'create' && !isLoggedIn && (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Age</label>
                <input 
                  type="number" 
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-950/50 border border-white/5 focus:border-indigo-500 outline-none transition-all text-white font-bold placeholder:text-slate-600 shadow-inner"
                  placeholder="Your age"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Gender</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['male', 'female'] as Gender[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGender(g)}
                      className={`py-3.5 rounded-2xl text-[11px] font-black transition-all border ${
                        gender === g 
                        ? 'bg-indigo-600 text-white border-white/20 shadow-[0_0_20px_rgba(79,70,229,0.3)]' 
                        : 'bg-slate-950/50 text-slate-400 border-white/5'
                      }`}
                    >
                      {g.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {currentProfile && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950/50 rounded-2xl flex items-center justify-between border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <User size={16} />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">My Username</p>
                    <p className="font-mono text-xs font-bold text-white mt-0.5">@{currentProfile.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(currentProfile.name);
                    alert('Username copied!');
                  }}
                  className="text-white/40 hover:text-indigo-400 p-2 transition-colors bg-white/5 rounded-lg active:scale-90"
                >
                  <Copy size={16} />
                </button>
              </div>
              
              {/* Help text positioned directly beneath the ID box */}
              <p className="text-[10px] text-indigo-400 text-center font-black uppercase tracking-[0.15em] animate-pulse">
                Use this ID to connect with friends
              </p>
            </div>
          )}

          {!isLoggedIn && (
            <div className="space-y-4">
              <button
                onClick={handleAction}
                disabled={saving}
                className="w-full bg-white text-black font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 shadow-[0_10px_30px_rgba(255,255,255,0.15)] uppercase tracking-widest text-sm"
              >
                {saving ? 'INITIALIZING...' : (mode === 'login' ? 'LOGIN PLAYER' : 'CREATE PLAYER')}
              </button>

              <button
                onClick={() => setMode(mode === 'create' ? 'login' : 'create')}
                className="w-full text-slate-400 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:text-indigo-400 transition-colors"
              >
                {mode === 'create' ? (
                  <><LogIn size={14} /> Already have a player? Login</>
                ) : (
                  <><UserPlus size={14} /> Need a player? Create</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileTab;
