
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { dbService } from '../services/dbService';
import { STICKERS, Sticker } from '../constants';
import { ShoppingBag, Coins, CheckCircle2, AlertCircle, Loader2, Sparkles, Star } from 'lucide-react';

interface MarketTabProps {
  myProfile: UserProfile;
  onProfileUpdate: (p: UserProfile | null) => void;
}

const MarketTab: React.FC<MarketTabProps> = ({ myProfile, onProfileUpdate }) => {
  const [purchasing, setPurchasing] = useState<string | null>(null);
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
      setFeedback({ type: 'error', message: 'Insufficient coins!' });
      return;
    }

    setPurchasing(sticker.id);
    try {
      const success = await dbService.purchaseSticker(myProfile.uniqueId, sticker.id, sticker.price);
      if (success) {
        setFeedback({ type: 'success', message: `Purchased ${sticker.name}!` });
        const updated = await dbService.findPlayerGlobal(myProfile.uniqueId);
        onProfileUpdate(updated);
      } else {
        setFeedback({ type: 'error', message: 'Purchase failed.' });
      }
    } catch (e) {
      setFeedback({ type: 'error', message: 'Network error.' });
    } finally {
      setPurchasing(null);
    }
  };

  const categories = Array.from(new Set(STICKERS.map(s => s.category)));

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-950 overflow-x-hidden relative animate-in fade-in duration-700">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-30 mix-blend-screen"
           style={{ backgroundImage: `url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=2070')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-5%] left-[-5%] w-[60%] h-[60%] bg-indigo-500/10 blur-[130px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/10 blur-[100px] rounded-full" />
      </div>

      {feedback && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[250] flex items-center gap-3 px-6 py-4 rounded-2xl bg-slate-900 border border-indigo-500/30 shadow-2xl animate-in slide-in-from-top-full duration-300">
          {feedback.type === 'success' ? <CheckCircle2 className="text-emerald-500" size={20} /> : <AlertCircle className="text-rose-500" size={20} />}
          <span className="text-xs font-black text-white uppercase tracking-widest">{feedback.message}</span>
        </div>
      )}

      <div className="relative z-10 p-6 pt-10 pb-4 flex justify-between items-end border-b border-white/10 bg-slate-950/50 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">Market<br/><span className="text-amber-400">Place</span></h1>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2 italic">Official Gaming Store</p>
        </div>
        <div className="bg-slate-900 px-3 py-2.5 rounded-2xl border border-amber-500/30 flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
          <Coins className="text-amber-400" size={16} />
          <span className="text-lg font-black text-white tabular-nums">{myProfile.coins || 0}</span>
        </div>
      </div>

      <div className="relative z-10 p-4 space-y-12 pb-48">
        {categories.map(cat => (
          <div key={cat} className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Sparkles size={14} className="text-amber-400" />
              <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em] border-b border-white/5 pb-1">{cat}</h3>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {STICKERS.filter(s => s.category === cat).map(sticker => {
                const isOwned = myProfile.ownedStickers?.includes(sticker.id);
                const canAfford = (myProfile.coins || 0) >= sticker.price;
                
                return (
                  <button 
                    key={sticker.id} 
                    disabled={isOwned || purchasing !== null}
                    onClick={() => handlePurchase(sticker)}
                    className={`bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/10 p-2 flex flex-col items-center gap-1.5 transition-all group relative overflow-hidden text-left ${isOwned ? 'opacity-90 border-emerald-500/40' : 'hover:bg-slate-900/90 active:scale-95'}`}
                  >
                    <div className="absolute top-1 right-1 z-20">
                      {isOwned ? (
                        <CheckCircle2 size={12} className="text-emerald-500" />
                      ) : (
                        <div className="bg-slate-950/80 p-0.5 rounded-md border border-white/5">
                          <Star size={8} className="text-white/20 group-hover:text-amber-400 transition-colors" />
                        </div>
                      )}
                    </div>
                    
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-950/80 flex items-center justify-center shadow-inner border border-white/5 relative p-2 overflow-hidden">
                      {purchasing === sticker.id ? (
                        <Loader2 size={20} className="text-indigo-500 animate-spin" />
                      ) : (
                        <img src={sticker.image} alt={sticker.name} className={`w-full h-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] ${!isOwned && !canAfford ? 'grayscale opacity-40' : 'group-hover:scale-115 transition-transform duration-500'}`} />
                      )}
                      {!isOwned && !canAfford && (
                        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] flex items-center justify-center">
                          <Coins size={14} className="text-amber-400/30" />
                        </div>
                      )}
                    </div>
                    
                    <div className="text-center w-full min-h-[32px] flex flex-col justify-center">
                      <h4 className="text-[8px] font-black text-white uppercase tracking-tighter line-clamp-2 px-0.5 leading-tight">{sticker.name}</h4>
                      {!isOwned && (
                        <div className="flex items-center justify-center gap-0.5 mt-1 text-amber-400">
                          <Coins size={8} strokeWidth={2.5} />
                          <span className="text-[10px] font-black tabular-nums">{sticker.price}</span>
                        </div>
                      )}
                      {isOwned && (
                        <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">OWNED</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {myProfile.ownedStickers?.length === 0 && (
          <div className="py-12 text-center bg-slate-900/20 rounded-[2.5rem] border border-dashed border-white/10">
            <ShoppingBag size={36} className="mx-auto text-slate-700 mb-4 opacity-40" />
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Tap to collect loot!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketTab;
