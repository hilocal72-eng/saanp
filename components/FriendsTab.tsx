
import React, { useState, useEffect, useRef } from 'react';
import { Friend, UserProfile, ChatMessage } from '../types';
import { dbService } from '../services/dbService';
import { UserPlus, MessageCircle, ArrowLeft, Send, Users, Bell, Loader2, Sparkles } from 'lucide-react';

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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    refreshFriends();
    const interval = setInterval(refreshFriends, 5000);
    return () => clearInterval(interval);
  }, [myProfile.name, activeChat?.uniqueId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const refreshFriends = async () => {
    try {
      const list = await dbService.getFriends(myProfile.name);
      setFriends(list);
      
      // If we are currently in a chat, fetch messages for that specific user
      if (activeChat) {
         const msgs = await dbService.getMessages(myProfile.name, activeChat.uniqueId);
         setMessages(prev => {
           // Only update state if the messages actually changed to prevent jitter
           if (JSON.stringify(prev) !== JSON.stringify(msgs)) return msgs;
           return prev;
         });
      }
    } catch (e) {
      console.warn("Sync error - retrying...");
    }
  };

  const handleAddFriend = async () => {
    const trimmed = targetUsername.trim();
    if (!trimmed || searching) return;
    if (trimmed === myProfile.name) {
      alert("You cannot add yourself.");
      return;
    }
    setSearching(true);
    const success = await dbService.sendFriendRequest(myProfile.name, trimmed);
    setSearching(false);
    if (success) {
      alert('Request sent to @' + trimmed);
      setTargetUsername('');
      refreshFriends();
    } else {
      alert('User not found. Ensure they have created a profile.');
    }
  };

  const handleAccept = async (friendUsername: string) => {
    await dbService.acceptFriend(myProfile.name, friendUsername);
    refreshFriends();
  };

  const handleSendMessage = async () => {
    if (!newMsg.trim() || !activeChat || sending) return;
    setSending(true);
    const msg: ChatMessage = {
      id: Date.now().toString(),
      senderId: myProfile.name,
      receiverId: activeChat.uniqueId,
      text: newMsg,
      timestamp: Date.now()
    };
    
    // Optimistic Update: Add to local state first
    setMessages(prev => [...prev, msg]);
    setNewMsg('');
    
    try {
      await dbService.sendMessage(msg);
    } catch (e) {
      console.error("Failed to send message to Airtable");
    } finally {
      setSending(false);
    }
  };

  const incomingRequests = friends.filter(f => f.isIncoming);
  const activeFriends = friends.filter(f => f.status === 'accepted' || (f.status === 'pending' && !f.isIncoming));

  if (activeChat) {
    return (
      <div className="flex flex-col h-[100dvh] bg-slate-950 animate-in slide-in-from-right-full duration-300">
        <div className="flex items-center px-6 py-4 border-b border-white/5 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
          <button onClick={() => setActiveChat(null)} className="p-2 -ml-2 text-slate-500 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="ml-2 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-xs border border-white/10 shadow-lg shadow-indigo-900/20">
              {activeChat.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-black text-white text-sm leading-none">{activeChat.name}</h2>
              <span className="text-[8px] text-emerald-500 font-black uppercase tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                Connection Established
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-48">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
              <Sparkles size={48} className="mb-4" />
              <p className="font-black text-[10px] uppercase tracking-widest">Start the conversation</p>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.senderId === myProfile.name;
              return (
                <div key={m.id || m.timestamp} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                  <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-xs font-bold ${
                    isMe 
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-950/20' 
                    : 'bg-slate-900 text-slate-300 rounded-tl-none border border-slate-800'
                  }`}>
                    {m.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={scrollRef} />
        </div>

        <div className="fixed bottom-24 left-6 right-6 p-2 bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-white/10 flex gap-2 items-center shadow-2xl">
          <input 
            type="text" 
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="TYPE YOUR MESSAGE..."
            className="flex-1 bg-transparent py-3 px-4 text-[10px] font-black uppercase outline-none text-white placeholder:text-slate-600 tracking-wider"
          />
          <button 
            disabled={!newMsg.trim() || sending}
            onClick={handleSendMessage}
            className="p-3 bg-indigo-600 text-white rounded-xl active:scale-90 disabled:opacity-50 transition-all shadow-lg shadow-indigo-900/40"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 animate-in fade-in duration-500">
      <div className="p-8 pb-4 sticky top-0 z-10 bg-slate-950/90 backdrop-blur-md">
        <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">Friends<br/><span className="text-indigo-500">Nexus</span></h1>
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mt-2">Active Social Links</p>
      </div>

      <div className="p-6 space-y-6 pb-40 overflow-y-auto">
        {incomingRequests.length > 0 && (
          <div className="space-y-3 animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-2 px-2">
              <Bell size={14} className="text-rose-500 animate-bounce" />
              <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Incoming Requests</h3>
            </div>
            {incomingRequests.map(f => (
              <div key={f.id} className="bg-rose-500/10 p-4 rounded-2xl border border-rose-500/20 flex items-center justify-between shadow-[0_0_20px_rgba(244,63,94,0.05)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-500 font-black">
                    {f.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-black text-white text-xs uppercase">{f.name}</h4>
                    <p className="text-[8px] font-mono font-bold text-slate-500 uppercase tracking-tighter">Connection Requested</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleAccept(f.uniqueId)}
                  className="px-4 py-2 bg-rose-500 text-white rounded-lg text-[10px] font-black shadow-lg shadow-rose-900/40 active:scale-95"
                >
                  ACCEPT
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="bg-slate-900 border border-white/5 p-6 rounded-[2rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 blur-3xl -mr-10 -mt-10 group-hover:bg-indigo-600/20 transition-colors"></div>
          <h3 className="text-white font-black text-[10px] mb-4 uppercase tracking-widest flex items-center gap-2">
            <UserPlus size={14} className="text-indigo-500" /> Establish Link
          </h3>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={targetUsername}
              onChange={(e) => setTargetUsername(e.target.value.replace(/\s/g, ''))}
              placeholder="PLAYER USERNAME"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-[10px] font-mono font-black text-white placeholder:text-slate-700 outline-none focus:border-indigo-500 transition-all uppercase tracking-widest"
            />
            <button 
              onClick={handleAddFriend}
              disabled={searching}
              className="px-6 bg-white text-black rounded-xl font-black text-[10px] active:scale-95 disabled:opacity-50 shadow-xl"
            >
              {searching ? <Loader2 size={12} className="animate-spin" /> : 'SYNC'}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Active Links</h3>
            <span className="text-[10px] font-black text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full">{activeFriends.length}</span>
          </div>
          
          {activeFriends.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/30 rounded-[2.5rem] border border-dashed border-slate-800">
              <Users size={40} className="mx-auto text-slate-800 mb-4 opacity-20" />
              <p className="text-slate-700 font-black text-[10px] uppercase tracking-widest">No Active Connections</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeFriends.map(f => (
                <div 
                  key={f.id} 
                  onClick={() => f.status === 'accepted' && setActiveChat(f)}
                  className={`bg-slate-900 p-4 rounded-2xl border border-white/5 flex items-center justify-between group transition-all duration-300 ${f.status === 'accepted' ? 'hover:bg-slate-800 active:scale-[0.98] cursor-pointer' : 'opacity-60'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-950 flex items-center justify-center text-indigo-500 font-black text-lg border border-slate-800 group-hover:border-indigo-500/30 transition-colors">
                      {f.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-black text-white text-sm uppercase tracking-tight">{f.name}</h4>
                      <p className="text-[8px] font-mono font-bold text-slate-600 mt-1 flex items-center gap-1.5 uppercase">
                         <span className={`w-1 h-1 rounded-full ${f.status === 'accepted' ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`}></span>
                         @{f.uniqueId}
                      </p>
                    </div>
                  </div>
                  
                  {f.status === 'pending' ? (
                    <span className="px-3 py-1 bg-slate-950 text-slate-600 rounded-lg text-[8px] font-black border border-slate-800 uppercase tracking-widest">Requested</span>
                  ) : (
                    <div className="p-3 bg-slate-950 text-indigo-500 hover:text-white rounded-xl transition-all border border-slate-800 group-hover:bg-indigo-600 group-hover:text-white">
                      <MessageCircle size={18} />
                    </div>
                  )}
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
