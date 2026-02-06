
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProfile, Gender } from '../types';
import { dbService } from '../services/dbService';
import { STICKERS } from '../constants';
import { 
  User, Copy, AlertTriangle, PartyPopper, Sparkles, 
  LogIn, UserPlus, LogOut, Swords, TrendingUp, Trophy, KeyRound, 
  Eye, EyeOff, RefreshCw, Loader2, X, Scissors, Pencil, Coins,
  Smile, LayoutGrid, Star
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
    setOffset({ x: clientX - startPos.x, y: clientY - startPos.y });
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
          onMouseDown={handleStart} onMouseMove={handleMove} onMouseUp={handleEnd} onMouseLeave={handleEnd} onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd}
        >
          <img ref={imgRef} src={imageSrc} className="absolute pointer-events-none transition-transform duration-75" style={{ left: '50%', top: '50%', transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, maxWidth: 'none', height: '100%', width: 'auto' }} />
          <div className="absolute inset-0 pointer-events-none ring-[40px] ring-slate-900/80 rounded-full border border-indigo-500/50" />
        </div>
        <div className="w-full mt-8 space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zoom Level</span>
              <span className="text-[10px] font-black text-indigo-400">{(zoom * 100).toFixed(0)}%</span>
            </div>
            <input type="range" min="0.5" max="3" step="0.01" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
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
  const [subTab, setSubTab] = useState<'stats' | 'collection'>('stats');
  const [name, setName] = useState(currentProfile?.name || '');
  const [pin, setPin] = useState(currentProfile?.pin || '');
  const [showPin, setShowPin] = useState(false);
  const [gender, setGender] = useState<Gender>(currentProfile?.gender || 'male');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [updatingFavs, setUpdatingFavs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentProfile) { setName(currentProfile.name); setPin(currentProfile.pin); setGender(currentProfile.gender as Gender); }
    else { setName(''); setPin(''); setGender('male'); }
    setShowPin(false);
  }, [currentProfile, mode]);

  const handleAvatarClick = () => { if (currentProfile) fileInputRef.current?.click(); };

  const handleManualRefresh = async () => {
    if (!currentProfile || refreshing) return;
    setRefreshing(true);
    try {
      const fresh = await dbService.findPlayerGlobal(currentProfile.uniqueId);
      if (fresh) {
        onProfileUpdate(fresh);
        localStorage.setItem('snake_quest_db', JSON.stringify({ users: [fresh], friends: [], chats: [], games: [] }));
      }
    } catch (e) {}
    finally { setTimeout(() => setRefreshing(false), 800); }
  };

  const copyHandle = () => {
    if (!currentProfile) return;
    navigator.clipboard.writeText(currentProfile.uniqueId);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const toggleFavourite = async (stickerId: string) => {
    if (!currentProfile || updatingFavs) return;
    const currentFavs = currentProfile.favouriteStickers || [];
    let newFavs: string[];
    
    if (currentFavs.includes(stickerId)) {
      newFavs = currentFavs.filter(id => id !== stickerId);
    } else {
      if (currentFavs.length >= 5) {
        setError("Maximum 5 favourites allowed.");
        setTimeout(() => setError(null), 3000);
        return;
      }
      newFavs = [...currentFavs, stickerId];
    }

    setUpdatingFavs(true);
    try {
      const success = await dbService.updateFavourites(currentProfile.id!, newFavs);
      if (success) {
        const updated = { ...currentProfile, favouriteStickers: newFavs };
        onProfileUpdate(updated);
        localStorage.setItem('snake_quest_db', JSON.stringify({ users: [updated], friends: [], chats: [], games: [] }));
      }
    } catch (e) {
      setError("Failed to update favourites.");
    } finally {
      setUpdatingFavs(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentProfile?.id) {
      const reader = new FileReader();
      reader.onload = (event) => setTempImage(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCropConfirm = async (croppedDataUrl: string) => {
    setTempImage(null); setUploading(true);
    try {
      await dbService.updateAvatar(currentProfile!.id!, croppedDataUrl);
      const updated = await dbService.findPlayerGlobal(currentProfile!.uniqueId);
      if (updated) { onProfileUpdate(updated); localStorage.setItem('snake_quest_db', JSON.stringify({ users: [updated], friends: [], chats: [], games: [] })); }
    } catch (err) { setError("Failed to upload image."); }
    finally { setUploading(false); }
  };

  const handleAction = async () => {
    if (currentProfile) return; 
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) { setError('Username is required'); return; }
    if (pin.length !== 4 || !/^\d+$/.test(pin)) { setError('PIN must be 4 digits'); return; }
    setSaving(true);
    try {
      if (mode === 'login') {
        const player = await dbService.findPlayerGlobal(trimmedName);
        if (player && String(player.pin) === String(pin)) { onProfileUpdate(player); localStorage.setItem('snake_quest_db', JSON.stringify({ users: [player], friends: [], chats: [], games: [] })); setShowSuccess(true); }
        else { setError('Player not found or incorrect PIN'); }
      } else {
        const profile: UserProfile = { name: trimmedName, pin, gender, uniqueId: trimmedName };
        const saved = await dbService.saveProfile(profile);
        onProfileUpdate(saved); setShowSuccess(true);
      }
    } catch (e: any) { setError(e.message.includes('USERNAME_TAKEN') ? 'Username Taken' : 'Error Occurred'); }
    finally { setSaving(false); }
  };

  const isLoggedIn = !!currentProfile;
  const winCount = currentProfile?.wins || 0;
  const lossCount = currentProfile?.losses || 0;
  const coinCount = currentProfile?.coins || 0;
  const myOwnedIds = currentProfile?.ownedStickers || [];
  const myStickers = STICKERS.filter(s => myOwnedIds.includes(s.id));
  const myFavIds = currentProfile?.favouriteStickers || [];

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-950 overflow-x-hidden relative">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-30 mix-blend-screen"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=2070')`, backgroundSize: 'cover' }} />
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-5%] left-[-5%] w-[60%] h-[60%] bg-indigo-600/20 blur-[130px] rounded-full animate-pulse" />
      </div>

      <div className="relative z-10 flex flex-col p-6 pb-48 animate-in fade-in duration-700">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        {tempImage && <CropModal imageSrc={tempImage} onConfirm={handleCropConfirm} onCancel={() => setTempImage(null)} />}
        
        {showSuccess && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-indigo-500/30 p-10 rounded-[2.5rem] text-center max-w-xs w-full shadow-2xl">
              <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-900/40"><PartyPopper size={40} className="text-white" /></div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-tight">{mode === 'login' ? 'Welcome Back!' : 'Congrats!'}</h2>
              <button onClick={() => setShowSuccess(false)} className="mt-10 w-full bg-white text-black font-black py-4 rounded-2xl active:scale-95 transition-all text-sm tracking-widest uppercase">START QUEST</button>
            </div>
          </div>
        )}

        <div className="text-center mt-12 mb-8 px-4">
          <div className="relative inline-block group">
            <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
            <div onClick={handleAvatarClick} className={`w-24 h-24 bg-slate-900/60 backdrop-blur-2xl border-2 border-indigo-500/30 rounded-3xl shadow-[0_0_40px_rgba(79,70,229,0.3)] flex items-center justify-center mx-auto rotate-3 border-white/20 relative overflow-hidden transition-all ${isLoggedIn ? 'cursor-pointer hover:scale-105 active:scale-95' : ''}`}>
              {uploading && <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center"><Loader2 size={24} className="text-white animate-spin" /></div>}
              {isLoggedIn && currentProfile?.avatarUrl ? <img src={currentProfile.avatarUrl} className="w-full h-full object-cover rounded-[1.2rem] -rotate-3" /> : (isLoggedIn ? <User size={48} className="text-white -rotate-3" /> : (mode === 'login' ? <LogIn size={48} className="text-white -rotate-3" /> : <Sparkles size={48} className="text-white -rotate-3" />))}
            </div>
            {isLoggedIn && !uploading && <button onClick={(e) => { e.stopPropagation(); handleAvatarClick(); }} className="absolute -top-3 -right-3 bg-slate-800 p-1 rounded-lg border border-white/20 text-slate-400 shadow-xl z-[70] hover:scale-110 active:scale-90 transition-all flex items-center justify-center ring-2 ring-slate-950"><Pencil size={12} strokeWidth={3} /></button>}
          </div>
          <div className="flex flex-col items-center justify-center gap-2 mt-6">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
                {isLoggedIn ? currentProfile.name : (mode === 'login' ? 'Login' : 'New Player')}
              </h1>
              {isLoggedIn && <button onClick={() => { localStorage.removeItem('snake_quest_db'); onProfileUpdate(null); window.location.reload(); }} className="p-2 bg-rose-500/20 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl border border-rose-500/20 transition-all active:scale-90 backdrop-blur-sm"><LogOut size={18} strokeWidth={3} /></button>}
            </div>
            {isLoggedIn && (
              <button onClick={copyHandle} className="group relative flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full hover:bg-white/10 transition-all active:scale-95">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">@{currentProfile.uniqueId}</span>
                <Copy size={12} className="text-slate-400 group-hover:text-white" />
                {copyFeedback && <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[8px] font-black py-1 px-3 rounded-lg shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">COPIED</div>}
              </button>
            )}
          </div>
        </div>

        {isLoggedIn && (
          <div className="flex justify-center mb-6">
            <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 flex gap-2">
              <button 
                onClick={() => setSubTab('stats')}
                className={`px-6 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${subTab === 'stats' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white'}`}
              >
                <LayoutGrid size={14} /> Stats
              </button>
              <button 
                onClick={() => setSubTab('collection')}
                className={`px-6 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${subTab === 'collection' ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:text-white'}`}
              >
                <Smile size={14} /> Stickers
              </button>
            </div>
          </div>
        )}

        <div className="bg-slate-900/40 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.6)] relative overflow-hidden group">
          {error && <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-center gap-3 text-rose-500 text-[10px] font-black uppercase tracking-wider animate-in shake duration-300 mb-6"><AlertTriangle size={16} />{error}</div>}
          
          {!isLoggedIn ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-200 uppercase tracking-[0.2em] ml-1">Player Name</label>
                <div className="relative"><User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" value={name} onChange={(e) => setName(e.target.value.replace(/\s/g, ''))} className="w-full pl-12 pr-5 py-4 rounded-2xl bg-slate-950/60 border border-slate-700 focus:border-indigo-500 outline-none transition-all text-white font-bold" placeholder="Username" /></div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-200 uppercase tracking-[0.2em] ml-1">Secret PIN</label>
                <div className="relative"><KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type={showPin ? 'text' : 'password'} inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} className="w-full pl-12 pr-12 py-4 rounded-2xl bg-slate-950/60 border border-slate-700 focus:border-indigo-500 outline-none transition-all text-white font-bold tracking-[0.5em]" placeholder="****" /><button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400">{showPin ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
              </div>
              {mode === 'create' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-200 uppercase tracking-[0.2em] ml-1">Avatar Type</label>
                  <div className="grid grid-cols-2 gap-2">{(['male', 'female'] as Gender[]).map((g) => (<button key={g} onClick={() => setGender(g)} className={`py-4 rounded-2xl text-[11px] font-black transition-all border ${gender === g ? 'bg-indigo-600 text-white border-white/40 shadow-lg' : 'bg-slate-950/50 text-slate-300 border-white/20'}`}>{g.toUpperCase()}</button>))}</div>
                </div>
              )}
              <div className="space-y-4 pt-4">
                <button onClick={handleAction} disabled={saving} className="w-full bg-white text-black font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_15px_40px_rgba(255,255,255,0.1)] uppercase tracking-[0.2em] text-[11px]">{saving ? '...' : (mode === 'login' ? 'ENTER ARENA' : 'REGISTER PLAYER')}</button>
                <button onClick={() => setMode(mode === 'create' ? 'login' : 'create')} className="w-full group text-slate-200 font-black text-[10px] uppercase tracking-[0.3em] flex flex-col items-center justify-center gap-1.5 hover:text-white transition-all duration-300">
                  <div className="flex items-center gap-2">
                    {mode === 'login' ? <UserPlus size={14} className="text-indigo-400" /> : <LogIn size={14} className="text-indigo-400" />}
                    <span>{mode === 'login' ? 'NEW TO THE ARENA?' : 'ALREADY REGISTERED?'}</span>
                  </div>
                  <span className="text-indigo-400 font-black tracking-[0.4em] group-hover:text-indigo-300 group-hover:scale-105 transition-all animate-text-glow-pulse">
                    {mode === 'login' ? 'JOIN THE SQUAD' : 'RETURN TO LOGIN'}
                  </span>
                </button>
              </div>
            </div>
          ) : subTab === 'stats' ? (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-center -mt-4 mb-2">
                 <div className="bg-amber-500/10 border border-amber-500/30 px-6 py-3 rounded-2xl flex items-center gap-3 shadow-[0_0_20px_rgba(245,158,11,0.15)] group/coins">
                   <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center shadow-lg shadow-amber-900/40 ring-1 ring-white/20 group-hover/coins:rotate-12 transition-transform">
                     <Coins size={20} className="text-white" strokeWidth={3} />
                   </div>
                   <div className="flex flex-col">
                     <span className="text-[7px] font-black text-amber-400 uppercase tracking-[0.3em] leading-tight mb-0.5">Total Coins</span>
                     <span className="text-2xl font-black text-white tabular-nums drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">{coinCount}</span>
                   </div>
                 </div>
              </div>

              <div className="flex items-center gap-2 relative">
                <div className="flex-1 bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-3xl relative overflow-hidden group/stat shadow-inner">
                   <div className="absolute -right-2 -top-2 opacity-20 group-hover/stat:scale-110 transition-transform"><Trophy size={48} className="text-emerald-500" /></div>
                   <span className="text-[8px] font-black text-emerald-400 uppercase tracking-[0.2em] block mb-1">Total Wins</span>
                   <span className="text-3xl font-black text-white tabular-nums drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">{winCount}</span>
                </div>
                
                <button 
                  onClick={handleManualRefresh}
                  className={`absolute left-1/2 -translate-x-1/2 z-20 p-2.5 bg-slate-800 rounded-full border border-white/10 text-indigo-400 hover:text-white transition-all active:scale-90 shadow-xl ${refreshing ? 'animate-spin opacity-50' : ''}`}
                >
                  <RefreshCw size={14} strokeWidth={3} />
                </button>

                <div className="flex-1 bg-rose-500/10 border border-rose-500/30 p-5 rounded-3xl relative overflow-hidden group/stat shadow-inner">
                   <div className="absolute -right-2 -top-2 opacity-20 group-hover/stat:scale-110 transition-transform"><Swords size={48} className="text-rose-500" /></div>
                   <span className="text-[8px] font-black text-rose-400 uppercase tracking-[0.2em] block mb-1">Losses</span>
                   <span className="text-3xl font-black text-white tabular-nums drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]">{lossCount}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                 <div className="flex items-center gap-3 mb-4">
                    <TrendingUp size={16} className="text-indigo-400" />
                    <h4 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Battle Records</h4>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-950/80 rounded-2xl p-4 border border-white/5">
                       <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Games Played</span>
                       <span className="text-xl font-black text-white italic">{winCount + lossCount}</span>
                    </div>
                    <div className="bg-slate-950/80 rounded-2xl p-4 border border-white/5">
                       <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Arena Rank</span>
                       <span className="text-xl font-black text-amber-400 italic">#{Math.max(1, 1000 - winCount * 10)}</span>
                    </div>
                 </div>
              </div>
            </div>
          ) : (
            <div className="animate-in slide-in-from-right-8 duration-500">
              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col gap-1">
                   <div className="flex items-center gap-2">
                      <Smile size={18} className="text-amber-400" />
                      <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Sticker Loot</h3>
                   </div>
                   <p className="text-[8px] font-black text-amber-500/80 uppercase tracking-widest">Pick 5 for In-Game Reactions</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`px-3 py-1 rounded-full border text-[9px] font-black tabular-nums transition-all ${myFavIds.length === 5 ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-slate-950 border-white/10 text-slate-400'}`}>
                    {myFavIds.length}/5 Selected
                  </span>
                </div>
              </div>

              {myStickers.length === 0 ? (
                <div className="py-12 text-center bg-slate-950/40 rounded-3xl border border-dashed border-white/10">
                   <LayoutGrid size={32} className="mx-auto text-slate-700 mb-4 opacity-50" />
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">
                     Your vault is empty.<br/>Visit the shop to unlock loot!
                   </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {myStickers.map(s => {
                    const isFav = myFavIds.includes(s.id);
                    return (
                      <div 
                        key={s.id} 
                        onClick={() => toggleFavourite(s.id)}
                        className={`bg-slate-950/60 rounded-2xl p-2 border flex flex-col items-center gap-2 group transition-all relative overflow-hidden shadow-inner cursor-pointer ${isFav ? 'border-amber-500/50 bg-amber-500/5' : 'border-white/5 hover:border-white/20'}`}
                      >
                         <div className={`absolute top-1 right-1 transition-all ${isFav ? 'text-amber-500 scale-110' : 'text-slate-700 opacity-20'}`}>
                            <Star size={10} fill={isFav ? "currentColor" : "none"} strokeWidth={3} />
                         </div>
                         <div className={`w-14 h-14 bg-black/40 rounded-xl flex items-center justify-center p-2 shadow-inner border transition-all ${isFav ? 'border-amber-500/30' : 'border-white/5'} group-hover:scale-105`}>
                            <img src={s.image} className="w-full h-full object-contain drop-shadow-lg" alt={s.name} />
                         </div>
                         <span className={`text-[7px] font-black uppercase tracking-tighter truncate w-full text-center ${isFav ? 'text-amber-400' : 'text-slate-500'}`}>{s.name}</span>
                      </div>
                    );
                  })}
                  {Array.from({ length: Math.max(0, 6 - myStickers.length) }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square bg-slate-950/20 rounded-2xl border border-dashed border-white/5 flex items-center justify-center opacity-30">
                       <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .animate-text-glow-pulse { animation: text-glow-pulse 2s infinite; }
        @keyframes text-glow-pulse { 
          0%, 100% { text-shadow: 0 0 5px rgba(99, 102, 241, 0); }
          50% { text-shadow: 0 0 15px rgba(99, 102, 241, 0.6); }
        }
        .shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      ` }} />
    </div>
  );
};

export default ProfileTab;
