
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProfile, Gender } from '../types';
import { dbService } from '../services/dbService';
import { 
  User, Copy, AlertTriangle, PartyPopper, Sparkles, 
  LogIn, UserPlus, LogOut, Swords, TrendingUp, Trophy, KeyRound, 
  Eye, EyeOff, RefreshCw, Loader2, X, Scissors, Pencil
} from 'lucide-react';

interface ProfileTabProps {
  onProfileUpdate: (p: UserProfile | null) => void;
  currentProfile: UserProfile | null;
}

interface CropModalProps {
  imageSrc: string;
  onConfirm: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

const CropModal: React.FC<CropModalProps> = ({ imageSrc, onConfirm, onCancel }) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setStartPos({ x: clientX - offset.x, y: clientY - offset.y });
  };

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setOffset({
      x: clientX - startPos.x,
      y: clientY - startPos.y
    });
  }, [isDragging, startPos]);

  const handleEnd = () => setIsDragging(false);

  const handleApply = () => {
    if (!imgRef.current) return;
    const canvas = document.createElement('canvas');
    const size = 200;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imgRef.current;
    const centerX = size / 2;
    const centerY = size / 2;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, size, size);

    ctx.save();
    ctx.translate(centerX + offset.x * (size / 256), centerY + offset.y * (size / 256));
    ctx.scale(zoom * (size / 256), zoom * (size / 256));
    ctx.drawImage(img, -img.clientWidth / 2, -img.clientHeight / 2, img.clientWidth, img.clientHeight);
    ctx.restore();

    onConfirm(canvas.toDataURL('image/jpeg', 0.8));
  };

  return (
    <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center p-6 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl flex flex-col items-center">
        <div className="flex items-center justify-between w-full mb-6">
          <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
            <Scissors size={14} className="text-indigo-400" /> Adjust Avatar
          </h3>
          <button onClick={onCancel} className="p-2 text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div 
          ref={containerRef}
          className="relative w-64 h-64 bg-black rounded-3xl overflow-hidden border-2 border-indigo-500/30 shadow-[0_0_40px_rgba(79,70,229,0.2)] cursor-move touch-none"
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        >
          <img 
            ref={imgRef}
            src={imageSrc} 
            alt="To crop" 
            className="absolute pointer-events-none transition-transform duration-75"
            style={{
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              maxWidth: 'none',
              height: '100%',
              width: 'auto'
            }}
          />
          <div className="absolute inset-0 pointer-events-none ring-[40px] ring-slate-900/80 rounded-full border border-indigo-500/50" />
        </div>

        <div className="w-full mt-8 space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zoom Level</span>
              <span className="text-[10px] font-black text-indigo-400">{(zoom * 100).toFixed(0)}%</span>
            </div>
            <input 
              type="range" 
              min="0.5" 
              max="3" 
              step="0.01" 
              value={zoom} 
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button onClick={onCancel} className="bg-slate-800 text-white font-black py-4 rounded-xl text-[10px] tracking-widest uppercase border border-white/5">Cancel</button>
            <button onClick={handleApply} className="bg-indigo-600 text-white font-black py-4 rounded-xl text-[10px] tracking-widest uppercase shadow-lg shadow-indigo-900/40">Apply Crop</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfileTab: React.FC<ProfileTabProps> = ({ onProfileUpdate, currentProfile }) => {
  const [mode, setMode] = useState<'create' | 'login'>('login');
  const [name, setName] = useState(currentProfile?.name || '');
  const [pin, setPin] = useState(currentProfile?.pin || '');
  const [showPin, setShowPin] = useState(false);
  const [gender, setGender] = useState<Gender>(currentProfile?.gender || 'male');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentProfile) {
      setName(currentProfile.name);
      setPin(currentProfile.pin);
      setGender(currentProfile.gender as Gender);
    } else {
      setName('');
      setPin('');
      setGender('male');
    }
    setShowPin(false);
  }, [currentProfile, mode]);

  const handleAvatarClick = () => {
    if (!currentProfile) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentProfile?.id) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setTempImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = async (croppedDataUrl: string) => {
    setTempImage(null);
    setUploading(true);
    try {
      await dbService.updateAvatar(currentProfile!.id!, croppedDataUrl);
      const updated = await dbService.findPlayerGlobal(currentProfile!.uniqueId);
      if (updated) {
        onProfileUpdate(updated);
        const db = { users: [updated], friends: [], chats: [], games: [] };
        localStorage.setItem('snake_quest_db', JSON.stringify(db));
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload image.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAction = async () => {
    if (currentProfile) return; 
    
    setError(null);
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      setError('Username is required');
      return;
    }

    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }

    setSaving(true);
    try {
      if (mode === 'login') {
        const player = await dbService.findPlayerGlobal(trimmedName);
        if (player && String(player.pin) === String(pin)) {
          const db = { users: [player], friends: [], chats: [], games: [] };
          localStorage.setItem('snake_quest_db', JSON.stringify(db));
          onProfileUpdate(player);
          setShowSuccess(true);
        } else {
          setError('Player not found or incorrect PIN');
        }
      } else {
        if (!gender) {
          setError('Please select an avatar type');
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
          pin: pin,
          gender,
          uniqueId: trimmedName
        };
        
        const savedProfile = await dbService.saveProfile(profile);
        onProfileUpdate(savedProfile);
        setShowSuccess(true);
      }
    } catch (e: any) {
      console.error("Auth Error:", e);
      if (e.message.includes('USERNAME_TAKEN')) {
        setError('This Username is already in use.');
      } else {
        setError('Failed to process. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshStats = async () => {
    if (!currentProfile || refreshing) return;
    setRefreshing(true);
    try {
      const player = await dbService.findPlayerGlobal(currentProfile.uniqueId);
      if (player) {
        const db = { users: [player], friends: [], chats: [], games: [] };
        localStorage.setItem('snake_quest_db', JSON.stringify(db));
        onProfileUpdate(player);
      }
    } catch (e) {
      console.error("Refresh error:", e);
    } finally {
      setTimeout(() => setRefreshing(false), 600);
    }
  };

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      localStorage.removeItem('snake_quest_db');
      onProfileUpdate(null);
      window.location.reload();
    } catch (err) {
      console.error("Logout error:", err);
      window.location.reload();
    }
  };

  const handlePinChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 4);
    setPin(cleaned);
  };

  const isLoggedIn = !!currentProfile;
  const winCount = currentProfile?.wins || 0;
  const lossCount = currentProfile?.losses || 0;
  const winRate = winCount + lossCount > 0 
    ? Math.round((winCount / (winCount + lossCount)) * 100) 
    : 0;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-950 overflow-x-hidden relative">
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-30 mix-blend-screen"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=2070')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'grayscale(0.3) contrast(1.1)'
        }}
      />
      
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-5%] left-[-5%] w-[60%] h-[60%] bg-indigo-600/20 blur-[130px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 flex flex-col p-6 pb-48 animate-in fade-in duration-700">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />

        {tempImage && (
          <CropModal 
            imageSrc={tempImage} 
            onConfirm={handleCropConfirm} 
            onCancel={() => setTempImage(null)} 
          />
        )}

        {showSuccess && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-slate-900 border border-indigo-500/30 p-10 rounded-[2.5rem] shadow-[0_0_80px_rgba(79,70,229,0.2)] text-center max-w-xs w-full">
              <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-900/40">
                <PartyPopper size={40} className="text-white" />
              </div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-tight">{mode === 'login' ? 'Welcome Back!' : 'Congrats!'}</h2>
              <button onClick={() => setShowSuccess(false)} className="mt-10 w-full bg-white text-black font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all text-sm tracking-widest uppercase">START QUEST</button>
            </div>
          </div>
        )}

        <div className="text-center mt-12 mb-10 px-4">
          <div className="relative inline-block group">
            <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
            
            <div 
              onClick={handleAvatarClick}
              className={`w-24 h-24 bg-slate-900/60 backdrop-blur-2xl border-2 border-indigo-500/30 rounded-3xl shadow-[0_0_40px_rgba(79,70,229,0.3)] flex items-center justify-center mx-auto rotate-3 border-white/20 relative overflow-hidden transition-all ${isLoggedIn ? 'cursor-pointer hover:scale-105 active:scale-95' : ''}`}
            >
              {uploading && (
                <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center">
                  <Loader2 size={24} className="text-white animate-spin" />
                </div>
              )}
              
              {isLoggedIn && currentProfile?.avatarUrl ? (
                <img src={currentProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-[1.2rem] -rotate-3" />
              ) : (
                isLoggedIn ? <User size={48} className="text-white -rotate-3" /> : (mode === 'login' ? <LogIn size={48} className="text-white -rotate-3" /> : <Sparkles size={48} className="text-white -rotate-3" />)
              )}
            </div>

            {isLoggedIn && !uploading && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleAvatarClick(); }}
                className="absolute -top-3 -right-3 bg-slate-800 p-1 rounded-lg border border-white/20 text-slate-400 shadow-xl z-[70] hover:scale-110 active:scale-90 transition-all flex items-center justify-center ring-2 ring-slate-950"
                aria-label="Upload photo"
              >
                <Pencil size={6} strokeWidth={4} />
              </button>
            )}
          </div>
          
          <div className="flex flex-col items-center justify-center gap-2 mt-6">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] break-all max-w-full">
                {isLoggedIn ? currentProfile.name : (mode === 'login' ? 'Login' : 'New Player')}
              </h1>
              {isLoggedIn && (
                <button onClick={handleLogout} className="p-2 bg-rose-500/20 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl border border-rose-500/20 transition-all active:scale-90 backdrop-blur-sm" title="Logout">
                  <LogOut size={18} strokeWidth={3} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 p-8 space-y-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)] relative overflow-hidden group">
          {error && <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-center gap-3 text-rose-500 text-[10px] font-black uppercase tracking-wider animate-in shake duration-300"><AlertTriangle size={16} />{error}</div>}

          {!isLoggedIn && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-200 uppercase tracking-[0.2em] ml-1">Player Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={name} onChange={(e) => setName(e.target.value.replace(/\s/g, ''))} className="w-full pl-12 pr-5 py-4 rounded-2xl bg-slate-950/60 border border-slate-700 focus:border-indigo-500 outline-none transition-all text-white font-bold shadow-inner" placeholder="Username" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-200 uppercase tracking-[0.2em] ml-1">Secret 4-Digit PIN</label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type={mode === 'create' ? 'text' : (showPin ? 'text' : 'password')}
                    inputMode="numeric"
                    maxLength={4}
                    value={pin} 
                    onChange={(e) => handlePinChange(e.target.value)} 
                    className={`w-full pl-12 pr-12 py-4 rounded-2xl bg-slate-950/60 border border-slate-700 focus:border-indigo-500 outline-none transition-all text-white font-bold shadow-inner ${mode === 'login' && !showPin ? 'tracking-[0.5em]' : 'tracking-widest'}`} 
                    placeholder="****" 
                  />
                  {mode === 'login' && (
                    <button 
                      type="button" 
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-400 transition-colors"
                    >
                      {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  )}
                </div>
                {mode === 'create' && <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest ml-1">Visible for confirmation during setup</p>}
              </div>

              {mode === 'create' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-200 uppercase tracking-[0.2em] ml-1">Select Avatar Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['male', 'female'] as Gender[]).map((g) => (
                      <button key={g} onClick={() => setGender(g)} className={`py-4 rounded-2xl text-[11px] font-black transition-all border ${gender === g ? 'bg-indigo-600 text-white border-white/40 shadow-lg' : 'bg-slate-950/50 text-slate-300 border-white/20'}`}>{g.toUpperCase()}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {currentProfile && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="p-4 bg-slate-950 rounded-2xl flex items-center justify-between border border-white/10 shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400"><User size={16} /></div>
                  <div>
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Public Handle</p>
                    <p className="font-mono text-xs font-bold text-white mt-0.5">@{currentProfile.name}</p>
                  </div>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(currentProfile.name); alert('Handle copied!'); }} className="text-white/60 hover:text-indigo-400 p-2 transition-colors bg-white/10 rounded-lg"><Copy size={16} /></button>
              </div>

              <div className="relative">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl relative overflow-hidden group/stat shadow-inner">
                     <div className="absolute -right-2 -top-2 opacity-20 group-hover/stat:scale-110 transition-transform"><TrendingUp size={40} className="text-emerald-500" /></div>
                     <span className="text-[7px] font-black text-emerald-400 uppercase tracking-[0.2em] block mb-1">Total Wins</span>
                     <span className="text-3xl font-black text-white tabular-nums drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">{winCount}</span>
                  </div>
                  <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl relative overflow-hidden group/stat shadow-inner">
                     <div className="absolute -right-2 -top-2 opacity-20 group-hover/stat:scale-110 transition-transform"><Swords size={40} className="text-rose-500" /></div>
                     <span className="text-[7px] font-black text-rose-400 uppercase tracking-[0.2em] block mb-1">Matches Lost</span>
                     <span className="text-3xl font-black text-white tabular-nums drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]">{lossCount}</span>
                  </div>
                </div>
                
                {/* Refresh Stats Icon */}
                <button 
                  onClick={handleRefreshStats}
                  disabled={refreshing}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900 border border-white/20 flex items-center justify-center text-indigo-400 shadow-xl hover:scale-110 active:scale-95 transition-all z-20 group disabled:opacity-80"
                  title="Refresh Stats"
                >
                  <RefreshCw size={14} className={`${refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                </button>
              </div>

              <div className="bg-slate-950 rounded-2xl p-4 border border-white/10 flex items-center justify-between shadow-inner">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Battle Proficiency</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-black text-indigo-400 uppercase tracking-tighter">Win Accuracy</span>
                    <span className="text-xs font-black text-white">{winRate}%</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full border-2 border-indigo-500/30 flex items-center justify-center relative">
                  <svg className="w-12 h-12 -rotate-90">
                    <circle cx="24" cy="24" r="20" fill="transparent" stroke="currentColor" strokeWidth="3" className="text-slate-800" />
                    <circle cx="24" cy="24" r="20" fill="transparent" stroke="currentColor" strokeWidth="3" strokeDasharray={`${winRate * 1.25}, 125`} className="text-indigo-500" />
                  </svg>
                  <Trophy size={14} className="absolute text-indigo-500" />
                </div>
              </div>
            </div>
          )}

          {!isLoggedIn && (
            <div className="space-y-4 pt-4">
              <button onClick={handleAction} disabled={saving} className="w-full bg-white text-black font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_15px_40px_rgba(255,255,255,0.1)] uppercase tracking-[0.2em] text-[11px]">
                {saving ? 'AUTHENTICATING...' : (mode === 'login' ? 'ENTER ARENA' : 'REGISTER PLAYER')}
              </button>
              <button onClick={() => { setMode(mode === 'create' ? 'login' : 'create'); setPin(''); setError(null); }} className="w-full text-slate-200 font-black text-[9px] uppercase tracking-[0.25em] flex items-center justify-center gap-2 hover:text-indigo-400 transition-colors">
                {mode === 'login' ? <><UserPlus size={14} /> new player? Sign up</> : <><LogIn size={14} /> Existing player? Log in</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileTab;
