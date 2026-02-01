
import React, { useState, useEffect, useRef } from 'react';
import { Friend, UserProfile, ChatMessage } from '../types';
import { dbService } from '../services/dbService';
import { UserPlus, MessageCircle, ArrowLeft, Send, Users, Bell, Loader2, Search, Trash2, Frown, X, CheckCircle2, AlertCircle } from 'lucide-react';

interface FriendsTabProps {
  myProfile: UserProfile;
}

const FriendsTab: React.FC<FriendsTabProps> = ({ myProfile }) => {
  const [friends, setFriends] = useState<(Friend & { isIncoming: boolean })[]>([]);
  const [targetUsername, setTargetUsername] = useState('');
  const [activeChat, setActiveChat] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [friendToDelete, setFriendToDelete] = useState<Friend | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const [lastReadTimes, setLastReadTimes] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem(`read_times_${myProfile.uniqueId}`);
    return saved ? JSON.parse(saved) : {};
  });

  // Track if user is at the bottom of the chat
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;
  };

  useEffect(() => {
    refreshFriends();
    const interval = setInterval(refreshFriends, 5000);
    return () => clearInterval(interval);
  }, [myProfile.name, activeChat?.uniqueId]);

  useEffect(() => {
    if (activeChat) {
      const now = Date.now();
      setLastReadTimes(prev => {
        const next = { ...prev, [activeChat.uniqueId]: now };
        localStorage.setItem(`read_times_${myProfile.uniqueId}`, JSON.stringify(next));
        return next;
      });

      if (isAtBottomRef.current) {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages]);

  useEffect(() => {
    if (activeChat) {
      isAtBottomRef.current = true;
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 50);
    }
  }, [activeChat?.uniqueId]);

  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  const refreshFriends = async () => {
    try {
      const list = await dbService.getFriends(myProfile.name);
      const friendsWithMeta = await Promise.all(list.map(async (f) => {
        const msgs = await dbService.getMessages(myProfile.name, f.uniqueId);
        const lastMsg = msgs[msgs.length - 1];
        const lastRead = lastReadTimes[f.uniqueId] || 0;
        return {
          ...f,
          lastMessageTimestamp: lastMsg?.timestamp || 0,
          unreadCount: (lastMsg && lastMsg.senderId !== myProfile.name && lastMsg.timestamp > lastRead) ? 1 : 0
        };
      }));
      setFriends(friendsWithMeta);
      if (activeChat) {
         const msgs = await dbService.getMessages(myProfile.name, activeChat.uniqueId);
         if (msgs.length !== messages.length) {
            setMessages(msgs);
         }
      }
    } catch (e) { console.debug("Sync error..."); }
  };

  const handleAddFriend = async () => {
    const trimmed = targetUsername.trim();
    if (!trimmed || searching) return;
    if (trimmed.toLowerCase() === myProfile.name.toLowerCase()) {
      setFeedback({ type: 'error', message: "You cannot add yourself." });
      return;
    }
    setSearching(true);
    try {
      const success = await dbService.sendFriendRequest(myProfile.name, trimmed);
      if (success) {
        setFeedback({ type: 'success', message: 'Request Sent' });
        setTargetUsername('');
        refreshFriends();
      } else {
        setFeedback({ type: 'error', message: 'Player not found' });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Player not found' });
    } finally {
      setSearching(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMsg.trim() || !activeChat || sending) return;
    setSending(true);
    try {
      const msg: ChatMessage = {
        id: '', 
        senderId: myProfile.name,
        receiverId: activeChat.uniqueId,
        text: newMsg.trim(),
        timestamp: Date.now()
      };
      await dbService.sendMessage(msg);
      setNewMsg('');
      isAtBottomRef.current = true;
      await refreshFriends();
    } catch (e) {
      setFeedback({ type: 'error', message: 'Failed to send' });
    } finally {
      setSending(false);
    }
  };

  const handleAccept = async (friendUsername: string) => {
    await dbService.acceptFriend(myProfile.name, friendUsername);
    refreshFriends();
  };

  const incomingRequests = friends.filter(f => f.isIncoming);
  const activeFriends = friends.filter(f => f.status === 'accepted' || (f.status === 'pending' && !f.isIncoming));

  if (activeChat) {
    return (
      <div className="flex flex-col h-[100dvh] bg-slate-950 animate-in slide-in-from-right-full duration-300 relative">
        <div className="absolute inset-0 z-0">
          <div 
            className="absolute inset-0 opacity-40 mix-blend-screen brightness-[0.7]"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&q=80&w=2070')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        </div>
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center px-6 py-4 border-b border-white/5 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-50">
            <button onClick={() => setActiveChat(null)} className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors"><ArrowLeft size={20} /></button>
            <div className="ml-2 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-xs border border-white/20 shadow-lg shadow-indigo-900/30">{activeChat.name.charAt(0).toUpperCase()}</div>
              <div>
                <h2 className="font-black text-white text-sm leading-none">{activeChat.name}</h2>
              </div>
            </div>
          </div>
          <div 
            ref={chatContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-6 space-y-4 pb-72 scroll-smooth"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-30 mt-20"><p className="font-black text-[10px] uppercase tracking-widest text-slate-300">Say hello!</p></div>
            ) : (
              messages.map((m) => {
                const isMe = m.senderId === myProfile.name;
                return (
                  <div key={m.id || m.timestamp} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                    <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-xs font-bold ${isMe ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg border border-white/10' : 'bg-slate-900/90 backdrop-blur-sm text-slate-100 rounded-tl-none border border-slate-700'}`}>{m.text}</div>
                  </div>
                );
              })
            )}
            <div ref={scrollRef} />
          </div>
          <div className="fixed bottom-36 left-6 right-6 p-2 bg-slate-900/95 backdrop-blur-2xl rounded-2xl border border-white/10 flex gap-2 items-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100]">
            <input type="text" value={newMsg} onChange={(e) => setNewMsg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Type message..." className="flex-1 bg-transparent py-3 px-4 text-sm font-medium outline-none text-white placeholder:text-slate-500 tracking-wide" />
            <button disabled={!newMsg.trim() || sending} onClick={handleSendMessage} className="p-3 bg-indigo-600 text-white rounded-xl active:scale-90 disabled:opacity-50 shadow-lg shadow-indigo-900/40">
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-950 overflow-x-hidden relative animate-in fade-in duration-700">
      {/* Abstract Circular Background Layer - Matching the requested image style */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute inset-0 opacity-60 mix-blend-screen brightness-[0.7] saturate-[1.2]"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&q=80&w=2070')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute top-[-5%] right-[-10%] w-[70%] h-[70%] bg-indigo-600/30 blur-[130px] rounded-full animate-pulse" />
        <div className="absolute bottom-[5%] left-[-10%] w-[60%] h-[60%] bg-blue-500/20 blur-[110px] rounded-full" />
      </div>

      {feedback && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[250] flex items-center gap-3 px-6 py-4 rounded-2xl bg-slate-900 border border-indigo-500/30 shadow-[0_0_30px_rgba(79,70,229,0.3)] animate-in slide-in-from-top-full duration-300">
          {feedback.type === 'success' ? <CheckCircle2 className="text-emerald-500" size={20} /> : <AlertCircle className="text-rose-500" size={20} />}
          <span className="text-xs font-black text-white uppercase tracking-widest">{feedback.message}</span>
        </div>
      )}

      {friendToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-slate-900 border border-rose-500/30 p-8 rounded-[2rem] shadow-[0_0_80px_rgba(244,63,94,0.1)] text-center max-w-xs w-full">
            <div className="w-16 h-16 bg-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-500/30"><Frown size={32} className="text-rose-500" /></div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter leading-tight mb-2">Remove Friend?</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-8">Are you sure you want to remove <span className="text-white">@{friendToDelete.name}</span>?</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setFriendToDelete(null)} className="w-full bg-slate-800 text-white font-black py-4 rounded-xl active:scale-95 text-[9px] tracking-widest uppercase border border-white/5">CANCEL</button>
              <button onClick={async () => { await dbService.removeFriend(friendToDelete.id); setFriendToDelete(null); refreshFriends(); }} className="w-full bg-rose-600 text-white font-black py-4 rounded-xl shadow-lg active:scale-95 text-[9px] tracking-widest uppercase">REMOVE</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER WITH THE IMAGE BACKGROUND */}
      <div className="relative z-[60] sticky top-0 border-b border-white/10 overflow-hidden">
        {/* Background image for the header specifically */}
        <div 
          className="absolute inset-0 opacity-80 mix-blend-screen brightness-[0.8] saturate-[1.3]"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&q=80&w=2070')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
          }}
        />
        {/* Blur overlay for the header */}
        <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-2xl" />
        
        <div className="relative z-10 p-8 pb-4">
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none drop-shadow-[0_4px_15px_rgba(0,0,0,0.9)]">Social<br/><span className="text-indigo-400">Center</span></h1>
        </div>
      </div>

      <div className="relative z-10 p-6 space-y-6 pb-48 overflow-y-auto">
        {incomingRequests.length > 0 && (
          <div className="space-y-3 animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-2 px-2"><Bell size={14} className="text-rose-500 animate-bounce" /><h3 className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Incoming Requests</h3></div>
            {incomingRequests.map(f => (
              <div key={f.id} className="bg-rose-500/20 p-4 rounded-2xl border border-rose-500/30 flex items-center justify-between shadow-lg backdrop-blur-md ring-1 ring-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-500 font-black">{f.name.charAt(0).toUpperCase()}</div>
                  <h4 className="font-black text-white text-xs uppercase">{f.name}</h4>
                </div>
                <button onClick={() => handleAccept(f.uniqueId)} className="px-4 py-2 bg-rose-500 text-white rounded-lg text-[10px] font-black shadow-lg shadow-rose-900/40 active:scale-95">ACCEPT</button>
              </div>
            ))}
          </div>
        )}

        <div className="bg-slate-900/70 backdrop-blur-2xl border border-white/10 p-6 rounded-[2.5rem] shadow-2xl relative overflow-hidden group ring-1 ring-white/5">
          <h3 className="text-slate-200 font-black text-[10px] mb-4 uppercase tracking-widest flex items-center gap-2"><Search size={14} className="text-blue-400" /> Find Players</h3>
          <div className="flex items-center gap-3">
            <input type="text" value={targetUsername} onChange={(e) => setTargetUsername(e.target.value.replace(/\s/g, ''))} placeholder="Enter username..." className="flex-1 bg-slate-950/60 border border-slate-700/50 rounded-2xl px-5 py-4 text-[13px] font-mono font-bold text-white placeholder:text-slate-600 outline-none focus:border-indigo-500 transition-all tracking-wider shadow-inner" />
            <button type="button" onClick={handleAddFriend} disabled={searching} className="w-14 h-14 shrink-0 bg-indigo-600 text-white rounded-2xl flex items-center justify-center active:scale-90 disabled:opacity-50 shadow-lg shadow-indigo-900/40">{searching ? <Loader2 size={24} className="animate-spin" /> : <UserPlus size={24} />}</button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between px-2"><h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest opacity-80">My Friends</h3><span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">{activeFriends.length}</span></div>
          {activeFriends.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/30 backdrop-blur-sm rounded-[2.5rem] border border-dashed border-slate-800/50"><Users size={40} className="mx-auto text-slate-700 mb-4 opacity-30" /><p className="text-slate-500 font-black text-[10px] uppercase tracking-widest">No friends yet</p></div>
          ) : (
            <div className="space-y-2">
              {activeFriends.map(f => (
                <div key={f.id} onClick={() => f.status === 'accepted' && setActiveChat(f)} className={`bg-slate-900/60 backdrop-blur-3xl p-4 rounded-2xl border border-white/10 flex items-center justify-between group transition-all duration-300 ${f.status === 'accepted' ? 'hover:bg-indigo-900/20 hover:border-indigo-500/30 active:scale-[0.98] cursor-pointer' : 'opacity-60'}`}>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl bg-slate-950 flex items-center justify-center text-indigo-500 font-black border border-slate-800 group-hover:border-indigo-500/40 transition-all">{f.name.charAt(0).toUpperCase()}</div>
                      {(f.unreadCount || 0) > 0 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full border-2 border-slate-950 flex items-center justify-center animate-bounce shadow-lg"><div className="w-1.5 h-1.5 bg-white rounded-full"></div></div>}
                    </div>
                    <div>
                      <h4 className="font-black text-white text-sm uppercase tracking-tight">{f.name}</h4>
                      <p className="text-[8px] font-mono font-bold text-slate-400 mt-1 flex items-center gap-1.5 uppercase">
                        <span className={`w-1.5 h-1.5 rounded-full ${f.lastSeen && (Date.now() - f.lastSeen < 60000) ? 'bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-600'}`}></span>
                        {f.lastSeen && (Date.now() - f.lastSeen < 60000) ? 'Online' : 'Away'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {f.status === 'accepted' && (
                      <><div className={`p-3 rounded-xl transition-all border shadow-lg ${(f.unreadCount || 0) > 0 ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-500/20' : 'bg-slate-950 text-indigo-400 border-slate-800'} group-hover:bg-indigo-600 group-hover:text-white`}><MessageCircle size={18} /></div><button onClick={(e) => { e.stopPropagation(); setFriendToDelete(f); }} className="p-3 rounded-xl bg-slate-950 text-slate-500 border border-slate-800 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all active:scale-90"><Trash2 size={18} /></button></>
                    )}
                    {f.status === 'pending' && <span className="px-3 py-1 bg-slate-950 text-slate-500 rounded-lg text-[8px] font-black border border-slate-800 uppercase tracking-widest">Waiting</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendsTab;
