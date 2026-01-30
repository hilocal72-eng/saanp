
import React, { useState, useEffect } from 'react';
import { UserProfile, Gender } from '../types';
import { dbService } from '../services/dbService';
import { User, CheckCircle2, Copy, AlertTriangle, PartyPopper, Lock } from 'lucide-react';

interface ProfileTabProps {
  onProfileUpdate: (p: UserProfile) => void;
  currentProfile: UserProfile | null;
}

const ProfileTab: React.FC<ProfileTabProps> = ({ onProfileUpdate, currentProfile }) => {
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
    }
  }, [currentProfile]);

  const handleSave = async () => {
    if (currentProfile) return; // Prevention
    
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName || !age || !gender) {
      alert('Please fill all details');
      return;
    }
    
    if (trimmedName.length < 3) {
      alert('Username must be at least 3 characters');
      return;
    }

    setSaving(true);
    try {
      const isNewProfile = !currentProfile;
      const profile: UserProfile = {
        name: trimmedName,
        age: parseInt(age),
        gender,
        uniqueId: trimmedName
      };
      
      const savedProfile = await dbService.saveProfile(profile);
      onProfileUpdate(savedProfile);
      
      if (isNewProfile) {
        setShowSuccess(true);
      }
    } catch (e: any) {
      if (e.message === 'USERNAME_TAKEN') {
        setError('This Username is already in use.');
      } else {
        alert('Error: ' + e.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const isLocked = !!currentProfile;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-950 p-6 pb-32 animate-in fade-in duration-500 relative">
      {/* Congrats Dialog */}
      {showSuccess && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-slate-900 border border-indigo-500/30 p-10 rounded-[2.5rem] shadow-[0_0_80px_rgba(79,70,229,0.2)] text-center max-w-xs w-full">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-900/40">
              <PartyPopper size={40} className="text-white" />
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-tight">Congrats!</h2>
            <p className="text-slate-200 font-bold mt-4 uppercase tracking-widest text-xs">Profile Created Successfully</p>
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
          <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-indigo-700 rounded-3xl shadow-[0_0_40px_rgba(79,70,229,0.2)] flex items-center justify-center mx-auto mb-6 rotate-3 border border-white/10">
            {isLocked ? <Lock size={48} className="text-white -rotate-3" /> : <User size={48} className="text-white -rotate-3" />}
          </div>
          {isLocked && (
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border-2 border-slate-950">
              <CheckCircle2 size={16} />
            </div>
          )}
        </div>
        <h1 className="text-3xl font-black tracking-tighter text-white uppercase">Player Profile</h1>
        {isLocked && <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-2">Verified Identity</p>}
      </div>

      <div className="bg-slate-900/50 rounded-[2rem] border border-white/5 p-8 space-y-6">
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-center gap-3 text-rose-500 text-[10px] font-black uppercase tracking-wider animate-in shake duration-300">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Username</label>
          <input 
            type="text" 
            value={name}
            disabled={isLocked}
            onChange={(e) => setName(e.target.value.replace(/\s/g, ''))}
            className={`w-full px-5 py-4 rounded-xl bg-slate-950 border ${error ? 'border-rose-500' : 'border-slate-800'} focus:border-indigo-500 outline-none transition-all text-white font-bold placeholder:text-slate-600 ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
            placeholder="Username"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Age</label>
          <input 
            type="number" 
            value={age}
            disabled={isLocked}
            onChange={(e) => setAge(e.target.value)}
            className={`w-full px-5 py-4 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 outline-none transition-all text-white font-bold placeholder:text-slate-600 ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
            placeholder="Your age"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Gender</label>
          <div className="grid grid-cols-2 gap-2">
            {(['male', 'female'] as Gender[]).map((g) => (
              <button
                key={g}
                disabled={isLocked}
                onClick={() => setGender(g)}
                className={`py-3 rounded-xl text-[11px] font-black transition-all border ${
                  gender === g 
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.3)]' 
                  : 'bg-slate-950 text-slate-300 border-slate-800'
                } ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {g.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {currentProfile && (
          <div className="pt-4 border-t border-white/5">
            <div className="p-4 bg-slate-950 rounded-2xl flex items-center justify-between border border-slate-800 mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <User size={16} />
                </div>
                <div>
                  <p className="text-[8px] font-black text-white uppercase tracking-tighter">My Username</p>
                  <p className="font-mono text-xs font-bold text-white mt-0.5">@{currentProfile.name}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(currentProfile.name);
                  alert('Username copied!');
                }}
                className="text-white hover:text-indigo-400 p-1 transition-colors"
              >
                <Copy size={16} />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center font-medium italic">Use this id to connect with friends</p>
          </div>
        )}

        {!isLocked ? (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-white text-black font-black py-5 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 shadow-xl uppercase tracking-widest text-sm"
          >
            {saving ? 'CREATING...' : 'CREATE PROFILE'}
          </button>
        ) : (
          <div className="w-full bg-slate-800/50 text-slate-400 font-black py-5 rounded-xl flex items-center justify-center gap-3 border border-slate-700/50 uppercase tracking-widest text-sm cursor-not-allowed">
            <Lock size={16} /> PROFILE LOCKED
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileTab;
