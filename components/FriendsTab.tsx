
import React, { useState, useEffect, useRef } from 'react';
import { Friend, UserProfile, ChatMessage } from '../types';
import { dbService } from '../services/dbService';
import { UserPlus, MessageCircle, ArrowLeft, Send, Users, Bell, Loader2, Sparkles, Search } from 'lucide-react';

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

  // Track unread timestamps locally
  const [lastReadTimes, setLastReadTimes] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem(`read_times_${myProfile.uniqueId}`);
    return saved ? JSON.parse(saved) : {};
  });

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
    }
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChat]);

  const refreshFriends = async () => {
    try {
      const list = await dbService.getFriends(myProfile.name);
      
      // Calculate unread status for each friend
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
         setMessages(prev => {
           if (JSON.stringify(prev) !== JSON.stringify(msgs)) return msgs;
           return prev;
         });
         
         // Update chat context if friend profile changed (e.g. online status)
         const updatedActiveFriend = friendsWithMeta.find(f => f.uniqueId === activeChat.uniqueId);
         if (updatedActiveFriend && updatedActiveFriend.lastSeen !== activeChat.lastSeen) {
           setActiveChat(updatedActiveFriend);
         }
      }
    } catch (e) {
      console.warn("Sync error...");
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
    try {
      const success = await dbService.sendFriendRequest(myProfile.name, trimmed);
      if (success) {
        alert('Friend request sent!');
        setTargetUsername('');
        refreshFriends();
      } else {
        alert('Player not found');
      }
    } catch (error) {
      alert('Player not found');
    } finally {
      setSearching(false);
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
    
    setMessages(prev => [...prev, msg]);
    setNewMsg('');
    
    try {
      await dbService.sendMessage(msg);
      // Mark as read immediately when I send a message
      setLastReadTimes(prev => {
        const next = { ...prev, [activeChat.uniqueId]: Date.now() };
        localStorage.setItem(`read_times_${myProfile.uniqueId}`, JSON.stringify(next));
        return next;
      });
    } catch (e) {
      console.error("Message delivery failed");
    } finally {
      setSending(false);
    }
  };

  const incomingRequests = friends.filter(f => f.isIncoming);
  const activeFriends = friends.filter(f => f.status === 'accepted' || (f.status === 'pending' && !f.isIncoming));

  if (activeChat) {
    const isFriendOnline = activeChat.lastSeen && (Date.now() - activeChat.lastSeen < 60000);
    
    return (
      <div className="flex flex-col h-[100dvh] bg-slate-950 animate-in slide-in-from-right-full duration-300">
        <div className="flex items-center px-6 py-4 border-b border-white/5 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
          <button onClick={() => setActiveChat(null)} className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="ml-2 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-xs border border-white/10 shadow-lg shadow-indigo-900/20">
              {activeChat.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-black text-white text-sm leading-none">{activeChat.name}</h2>
              {isFriendOnline ? (
                <span className="text-[8px] text-emerald-400 font-black uppercase tracking-widest flex items-center gap-1 mt-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  Active
                </span>
              ) : (
                <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-1 mt-1">
                  Away
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-48">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
              <Sparkles size={48} className="mb-4 text-indigo-400" />
              <p className="font-black text-[10px] uppercase tracking-widest text-slate-300">Say hello!</p>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.senderId === myProfile.name;
              return (
                <div key={m.id || m.timestamp} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                  <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-xs font-bold ${
                    isMe 
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-950/20' 
                    : 'bg-slate-900 text-slate-100 rounded-tl-none border border-slate-800'
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
            placeholder="Type message..."
            className="flex-1 bg-transparent py-3 px-4 text-sm font-medium outline-none text-white placeholder:text-slate-500 tracking-wide"
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
        <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">Social<br/><span className="text-indigo-500">Center</span></h1>
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
                    <p className="text-[8px] font-mono font-bold text-slate-300 uppercase tracking-tighter">Wants to be friends</p>
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

        {/* MODERNIZED SEARCH / ADD SECTION */}
        <div className="bg-slate-900 border border-white/5 p-6 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-3xl -mr-10 -mt-10 group-hover:bg-blue-600/20 transition-colors"></div>
          <h3 className="text-slate-200 font-black text-[10px] mb-4 uppercase tracking-widest flex items-center gap-2">
            <Search size={14} className="text-blue-400" /> Find Players
          </h3>
          <div className="flex items-center gap-3">
            <input 
              type="text" 
              value={targetUsername}
              onChange={(e) => setTargetUsername(e.target.value.replace(/\s/g, ''))}
              placeholder="Enter username..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-[13px] font-mono font-bold text-white placeholder:text-slate-600 outline-none focus:border-blue-500 transition-all tracking-wider shadow-inner"
            />
            <button 
              type="button"
              onClick={handleAddFriend}
              disabled={searching}
              aria-label="Add Friend"
              className="w-14 h-14 shrink-0 bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-2xl flex items-center justify-center transition-all duration-300 active:scale-90 hover:scale-105 disabled:opacity-50 shadow-[0_8px_20px_rgba(59,130,246,0.4)] hover:shadow-[0_12px_25px_rgba(59,130,246,0.6)] cursor-pointer"
            >
              {searching ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <UserPlus size={24} strokeWidth={2} />
              )}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">My Friends</h3>
            <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">{activeFriends.length}</span>
          </div>
          
          {activeFriends.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/30 rounded-[2.5rem] border border-dashed border-slate-800">
              <Users size={40} className="mx-auto text-slate-700 mb-4 opacity-30" />
              <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest">No friends yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeFriends.map(f => {
                const isOnline = f.lastSeen && (Date.now() - f.lastSeen < 60000);
                const hasUnread = (f.unreadCount || 0) > 0;
                
                return (
                  <div 
                    key={f.id} 
                    onClick={() => f.status === 'accepted' && setActiveChat(f)}
                    className={`bg-slate-900 p-4 rounded-2xl border border-white/5 flex items-center justify-between group transition-all duration-300 ${f.status === 'accepted' ? 'hover:bg-slate-800 active:scale-[0.98] cursor-pointer' : 'opacity-60'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-xl bg-slate-950 flex items-center justify-center text-indigo-500 font-black text-lg border border-slate-800 group-hover:border-indigo-500/30 transition-colors">
                          {f.name.charAt(0).toUpperCase()}
                        </div>
                        {hasUnread && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full border-2 border-slate-900 flex items-center justify-center animate-bounce shadow-lg shadow-indigo-900/40">
                             <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-black text-white text-sm uppercase tracking-tight">{f.name}</h4>
                        <p className="text-[8px] font-mono font-bold text-slate-300 mt-1 flex items-center gap-1.5 uppercase">
                           <span className={`w-1 h-1 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-slate-600'}`}></span>
                           @{f.uniqueId}
                        </p>
                      </div>
                    </div>
                    
                    {f.status === 'pending' ? (
                      <span className="px-3 py-1 bg-slate-950 text-slate-400 rounded-lg text-[8px] font-black border border-slate-800 uppercase tracking-widest">Waiting</span>
                    ) : (
                      <div className={`p-3 rounded-xl transition-all border ${hasUnread ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-950 text-indigo-400 border-slate-800 hover:bg-indigo-600 hover:text-white'}`}>
                        <MessageCircle size={18} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendsTab;
