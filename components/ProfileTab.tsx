
import React, { useState, useEffect } from 'react';
import { UserProfile, Gender } from '../types';
import { dbService } from '../services/dbService';
import { User, CheckCircle2, Copy, AlertTriangle } from 'lucide-react';

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

  useEffect(() => {
    if (currentProfile) {
      setName(currentProfile.name);
      setAge(currentProfile.age.toString());
      setGender(currentProfile.gender);
    }
  }, [currentProfile]);

  const handleSave = async () => {
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
      const profile: UserProfile = {
        name: trimmedName,
        age: parseInt(age),
        gender,
        uniqueId: trimmedName // Name is the ID now
      };
      
      const savedProfile = await dbService.saveProfile(profile, currentProfile?.name);
      onProfileUpdate(savedProfile);
      alert('Profile saved successfully!');
    } catch (e: any) {
      if (e.message === 'USERNAME_TAKEN') {
        setError('That username is already taken. Please choose another.');
      } else {
        alert('Error saving profile: ' + e.message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-950 p-6 pb-32 animate-in fade-in duration-500">
      <div className="text-center mt-12 mb-10">
        <div className="relative inline-block">
          <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-indigo-700 rounded-3xl shadow-[0_0_40px_rgba(79,70,229,0.2)] flex items-center justify-center mx-auto mb-6 rotate-3 border border-white/10">
            <User size={48} className="text-white -rotate-3" />
          </div>
          {currentProfile && (
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border-2 border-slate-950">
              <CheckCircle2 size={16} />
            </div>
          )}
        </div>
        <h1 className="text-3xl font-black tracking-tighter text-white uppercase">Identity</h1>
      </div>

      <div className="bg-slate-900/50 rounded-[2rem] border border-white/5 p-8 space-y-6">
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-center gap-3 text-rose-500 text-[10px] font-black uppercase tracking-wider animate-in shake duration-300">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Username (Must be unique)</label>
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value.replace(/\s/g, ''))} // No spaces
            className={`w-full px-5 py-4 rounded-xl bg-slate-950 border ${error ? 'border-rose-500' : 'border-slate-800'} focus:border-indigo-500 outline-none transition-all text-white font-bold placeholder:text-slate-700`}
            placeholder="Unique player name"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Age</label>
          <input 
            type="number" 
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full px-5 py-4 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 outline-none transition-all text-white font-bold placeholder:text-slate-700"
            placeholder="Your age"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Gender</label>
          <div className="grid grid-cols-3 gap-2">
            {(['male', 'female', 'other'] as Gender[]).map((g) => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className={`py-3 rounded-xl text-[10px] font-black transition-all border ${
                  gender === g 
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.3)]' 
                  : 'bg-slate-950 text-slate-500 border-slate-800'
                }`}
              >
                {g.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {currentProfile && (
          <div className="pt-4 border-t border-white/5">
            <div className="p-4 bg-slate-950 rounded-2xl flex items-center justify-between border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <User size={16} />
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">My Identity</p>
                  <p className="font-mono text-xs font-bold text-white mt-0.5">@{currentProfile.name}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(currentProfile.name);
                  alert('Username copied!');
                }}
                className="text-slate-600 hover:text-white p-1 transition-colors"
              >
                <Copy size={16} />
              </button>
            </div>
            <p className="text-[7px] text-center text-slate-600 mt-4 uppercase tracking-widest px-4">Your username is your unique global ID. Share it with friends so they can find you instantly.</p>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-white text-black font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
        >
          {saving ? 'VERIFYING...' : (currentProfile ? 'UPDATE PROFILE' : 'CREATE ACCOUNT')}
        </button>
      </div>
    </div>
  );
};

export default ProfileTab;
