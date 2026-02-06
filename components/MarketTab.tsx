
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { dbService } from '../services/dbService';
import { STICKERS, Sticker } from '../constants';
import { Coins, CheckCircle2, AlertCircle, Loader2, ShoppingBag, X } from 'lucide-react';

interface MarketTabProps {
  myProfile: UserProfile;
  onProfileUpdate: (p: UserProfile | null) => void;
}

// MarketTab component provides a store for players to buy stickers using arena coins
const MarketTab: React.FC<MarketTabProps> = ({ myProfile, onProfileUpdate }) => {
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [confirmingSticker, setConfirmingSticker] = useState<Sticker | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  const handlePurchase = async (sticker: Sticker) => {
    if (myProfile.ownedStickers?.includes(sticker.id)) return;
    if ((myProfile.coins || 0) < sticker.price) {
      setFeedback({ type: 'error', message: 'Need more coins!' });
      return;
    }

    setConfirmingSticker(null);
    setPurchasing(sticker.id);
    try {
      const success = await dbService.purchaseSticker(myProfile.uniqueId, sticker.id, sticker.price);
      if (success) {
        setFeedback({ type: 'success', message: `Added ${sticker.name}!` });
        const updated = await dbService.findPlayerGlobal(myProfile.uniqueId);
        if (updated) onProfileUpdate(updated);
      } else {
        setFeedback({ type: 'error', message: 'Failed to buy.' });
      }
    } catch (e) {
      setFeedback({ type: 'error', message: 'Connection error.' });
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[#020617] overflow-hidden relative animate-in fade-in duration-500">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] bg-amber-600/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <div className="relative z-10 px-6 py-8 border-b border-white/10 bg-slate-950/50 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-600 rounded-2xl shadow-lg shadow-amber-900/40">
              <ShoppingBag size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">Loot Shop</h1>
              <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mt-1.5">Premium Stickers</p>
              <p className="text-[7px] font-black text-white/70 uppercase tracking-[0.2em] mt-1 animate-pulse">Win Games to Earn coins</p>
            </div>
          </div>
          <div className="bg-slate-900 border border-amber-500/30 px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-xl">
            <Coins size={16} className="text-amber-500" />
            <span className="text-lg font-black text-white tabular-nums">{(myProfile.coins || 0)}</span>
          </div>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl bg-slate-900 border border-white/20 shadow-2xl animate-in slide-in-from-top-full duration-300">
          {feedback.type === 'success' ? <CheckCircle2 className="text-emerald-500" size={18} /> : <AlertCircle className="text-rose-500" size={18} />}
          <span className="text-[10px] font-black text-white uppercase tracking-widest">{feedback.message}</span>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmingSticker && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 p-6 rounded-[2rem] shadow-2xl w-full max-w-xs text-center space-y-6">
            <div className="flex flex-col items-center">
              <img src={confirmingSticker.image} className="w-20 h-20 object-contain mb-4" alt="Sticker" />
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Buy {confirmingSticker.name}?</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1 mt-1">
                Cost: <Coins size={10} className="text-amber-500" /> {confirmingSticker.price}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setConfirmingSticker(null)}
                className="py-3.5 rounded-xl bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest border border-white/5 active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => handlePurchase(confirmingSticker)}
                className="py-3.5 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-900/40 active:scale-95 transition-all"
              >
                Buy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 pb-48">
        <div className="grid grid-cols-2 gap-4">
          {STICKERS.map((sticker) => {
            const isOwned = myProfile.ownedStickers?.includes(sticker.id);
            const isPurchasing = purchasing === sticker.id;
            const canAfford = (myProfile.coins || 0) >= sticker.price;

            return (
              <div key={sticker.id} className={`bg-slate-900/60 backdrop-blur-md rounded-[2rem] border border-white/10 p-5 flex flex-col items-center group transition-all duration-300 hover:border-amber-500/40 hover:bg-slate-900/80 ${isOwned ? 'opacity-80' : ''}`}>
                <div className="relative mb-4">
                  <div className={`absolute inset-0 blur-2xl rounded-full opacity-0 group-hover:opacity-40 transition-opacity ${isOwned ? 'bg-indigo-500' : 'bg-amber-500'}`} />
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <img src={sticker.image} alt={sticker.name} className={`w-20 h-20 object-contain transition-transform duration-500 group-hover:scale-110 ${isOwned ? '' : 'grayscale-[0.5]'}`} />
                  </div>
                  {isOwned && (
                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-lg border-2 border-slate-900">
                      <CheckCircle2 size={12} strokeWidth={3} />
                    </div>
                  )}
                </div>
                
                <h3 className="text-[11px] font-black text-white uppercase tracking-wider text-center mb-1">{sticker.name}</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-1">
                  {!isOwned && <Coins size={10} className="text-amber-500" />}
                  {isOwned ? 'COLLECTED' : `${sticker.price} Coins`}
                </p>

                <button 
                  disabled={isOwned || isPurchasing}
                  onClick={() => {
                    if (canAfford) setConfirmingSticker(sticker);
                    else setFeedback({ type: 'error', message: 'Need more coins!' });
                  }}
                  className={`w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                    isOwned 
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 cursor-default' 
                      : (canAfford 
                          ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/20 hover:bg-amber-500' 
                          : 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed')
                  }`}
                >
                  {isPurchasing ? <Loader2 size={12} className="animate-spin mx-auto" /> : (isOwned ? 'OWNED' : 'BUY NOW')}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MarketTab;
