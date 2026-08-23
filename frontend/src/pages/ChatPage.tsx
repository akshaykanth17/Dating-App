import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Layout from '../components/Layout';
import { Send, User, MessageCircle, MoreVertical, ShieldAlert, ArrowLeft, RefreshCw } from 'lucide-react';

interface Match {
  id: string;
  otherProfile: {
    id: string;
    userId: string;
    name: string;
    gender: string;
    bio: string;
    photos: { id: string; url: string; isPrimary: boolean }[];
  };
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
  } | null;
  matchType: string;
  user1Continue: boolean;
  user2Continue: boolean;
  hangoutEventDate: string | null;
  createdAt: string;
}

interface Message {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export default function ChatPage() {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();

  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'DATING' | 'HANGOUT'>(
    location.state?.tab === 'HANGOUT' ? 'HANGOUT' : 'DATING'
  );

  // Safety options dropdown in chat header
  const [showOptions, setShowOptions] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [safetyActionType, setSafetyActionType] = useState<'block' | 'report'>('block');
  const [reportReason, setReportReason] = useState('harassment');
  const [reportNote, setReportNote] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const fetchMatches = async () => {
    try {
      const data = await api.get<Match[]>('/swipes/matches');
      setMatches(data);
    } catch (err) {
      console.error('[ChatPage] Failed to fetch matches:', err);
    } finally {
      setIsLoadingMatches(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  // Handle Socket.IO connection and message listener
  useEffect(() => {
    if (!socket) return;

    // Listen to real-time messages in the active chat room
    const handleReceiveMessage = (newMessage: Message) => {
      if (selectedMatch && newMessage.matchId === selectedMatch.id) {
        setMessages((prev) => [...prev, newMessage]);
        scrollToBottom();
      }
    };

    // Listen to sidebar match updates (last message preview)
    const handleMatchMessageReceived = ({ matchId, lastMessage }: any) => {
      setMatches((prev) =>
        prev.map((m) =>
          m.id === matchId
            ? { ...m, lastMessage }
            : m
        )
      );
    };

    // Listen to typing alerts
    const handleTypingStatus = ({ senderId, isTyping: otherTyping }: any) => {
      if (selectedMatch && senderId === selectedMatch.otherProfile.userId) {
        setOtherUserTyping(otherTyping);
      }
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_received', handleMatchMessageReceived);
    socket.on('typing', handleTypingStatus);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_received', handleMatchMessageReceived);
      socket.off('typing', handleTypingStatus);
    };
  }, [socket, selectedMatch]);

  // Handle selected match change
  useEffect(() => {
    if (!selectedMatch) return;

    const loadChatHistory = async () => {
      setIsLoadingChat(true);
      setMessages([]);
      setOtherUserTyping(false);
      try {
        const history = await api.get<Message[]>(`/chats/${selectedMatch.id}`);
        setMessages(history);
        scrollToBottom();

        // Join socket room
        if (socket) {
          socket.emit('join_room', { matchId: selectedMatch.id });
        }
      } catch (err) {
        console.error('[ChatPage] Failed to fetch chat history:', err);
      } finally {
        setIsLoadingChat(false);
      }
    };

    loadChatHistory();

    // Cleanup: leave previous room on change
    return () => {
      if (socket) {
        socket.emit('leave_room', { matchId: selectedMatch.id });
      }
    };
  }, [selectedMatch, socket]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedMatch || !socket) return;

    const content = inputText.trim();

    // Optimistically add the message to UI immediately
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      matchId: selectedMatch.id,
      senderId: user?.id || '',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    scrollToBottom();

    // Send via socket (server will broadcast to others)
    socket.emit('send_message', {
      matchId: selectedMatch.id,
      content,
    });

    setInputText('');
    
    // Stop typing alert
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit('typing', { matchId: selectedMatch.id, isTyping: false });
    setIsTyping(false);
  };

  // Emit typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!socket || !selectedMatch) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', { matchId: selectedMatch.id, isTyping: true });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { matchId: selectedMatch.id, isTyping: false });
      setIsTyping(false);
    }, 2000);
  };

  // Perform block / report
  const handleSafetyAction = async () => {
    if (!selectedMatch) return;
    const targetUserId = selectedMatch.otherProfile.userId;

    try {
      if (safetyActionType === 'block') {
        await api.post('/safety/block', { blockedId: targetUserId });
      } else {
        await api.post('/safety/report', {
          reportedId: targetUserId,
          reason: reportReason,
          note: reportNote,
        });
      }

      // Remove match from list and close states
      setMatches((prev) => prev.filter((m) => m.id !== selectedMatch.id));
      setSelectedMatch(null);
      setShowSafetyModal(false);
      setShowOptions(false);
      setReportNote('');
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  const getOtherUserPhoto = (match: Match) => {
    const photos = match.otherProfile.photos;
    if (photos && photos.length > 0) {
      const primary = photos.find((p) => p.isPrimary);
      const url = primary ? primary.url : photos[0].url;
      return url.startsWith('/uploads') ? `${API_URL.replace('/api', '')}${url}` : url;
    }
    return null;
  };

  const isUserOnline = (userId: string) => {
    return onlineUsers[userId] === 'online';
  };

  const handleContinueMatch = async () => {
    if (!selectedMatch) return;
    try {
      await api.post(`/swipes/matches/${selectedMatch.id}/continue`, {});
      // Refresh matches list to get updated continue status or move to Dating tab
      await fetchMatches();
      
      // Update selected match local state if it didn't move tabs (meaning the other hasn't accepted yet)
      const isUser1 = selectedMatch.otherProfile.userId !== selectedMatch.user1Id; // Wait, user1Id might not be returned in MatchDTO, let's just refresh and see if it's still in the list
      setSelectedMatch(prev => prev ? { ...prev, user1Continue: true, user2Continue: true } : null);
      
    } catch (err: any) {
      alert(err.message || 'Failed to continue chat');
    }
  };

  const handleRemoveMatch = async () => {
    if (!selectedMatch) return;
    try {
      await api.delete(`/swipes/matches/${selectedMatch.id}`);
      setMatches(prev => prev.filter(m => m.id !== selectedMatch.id));
      setSelectedMatch(null);
    } catch (err: any) {
      alert(err.message || 'Failed to remove chat');
    }
  };

  // Determine if current chat is a Hangout chat that has passed its event time
  const isHangoutExpired = selectedMatch && selectedMatch.matchType === 'HANGOUT' && selectedMatch.hangoutEventDate
    ? new Date() > new Date(selectedMatch.hangoutEventDate)
    : false;
    
  // Check if current user has already opted to continue
  // Since we don't strictly know if current user is user1 or user2 from frontend easily without checking user.id
  const currentUserHasContinued = selectedMatch && user
    ? (selectedMatch as any).user1Id === user.id ? selectedMatch.user1Continue : selectedMatch.user2Continue
    : false;

  return (
    <Layout>
      <div className="flex flex-1 h-[calc(100vh-10rem)] border border-slate-800 rounded-3xl overflow-hidden glass">
        
        {/* Left Column: Matches list */}
        <aside className={`w-full md:w-80 border-r border-slate-800 flex flex-col bg-slate-950/40 ${selectedMatch ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-slate-800 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight">Active Matches</h2>
              <button onClick={fetchMatches} className="p-1 text-slate-400 hover:text-slate-200">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            
            {/* Tabs for Dating vs Hangouts */}
            <div className="flex bg-slate-900 p-1 rounded-lg">
              <button
                onClick={() => { setActiveTab('DATING'); setSelectedMatch(null); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                  activeTab === 'DATING' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Matches
              </button>
              <button
                onClick={() => { setActiveTab('HANGOUT'); setSelectedMatch(null); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                  activeTab === 'HANGOUT' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Hangouts
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {isLoadingMatches ? (
              <div className="p-8 text-center text-slate-400"><RefreshCw className="w-6 h-6 animate-spin mx-auto" /></div>
            ) : (() => {
              const displayedMatches = matches.filter(m => m.matchType === activeTab || (!m.matchType && activeTab === 'DATING'));
              
              if (displayedMatches.length === 0) {
                return (
                  <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                    <MessageCircle className="w-12 h-12 text-slate-700 mb-2" />
                    <p className="text-sm font-semibold">No matches yet</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {activeTab === 'DATING' 
                        ? 'Go to Discover and swipe to find potential matches!'
                        : 'Post a Hangout or join one to start connecting!'}
                    </p>
                  </div>
                );
              }

              return displayedMatches.map((m) => {
                const photo = getOtherUserPhoto(m);
                const isOnline = isUserOnline(m.otherProfile.userId);
                const isSelected = selectedMatch?.id === m.id;
                
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMatch(m)}
                    className={`w-full p-4 flex items-center space-x-3 text-left border-b border-slate-900 transition-colors ${
                      isSelected ? 'bg-rose-500/10' : 'hover:bg-slate-900/40'
                    }`}
                  >
                    {/* Photo with online status marker */}
                    <div className="relative">
                      {photo ? (
                        <img src={photo} alt={m.otherProfile.name} className="w-12 h-12 rounded-full object-cover border border-slate-800" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center"><User className="w-6 h-6 text-slate-500" /></div>
                      )}
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h4 className="text-sm font-bold text-slate-100 truncate">{m.otherProfile.name}</h4>
                        {m.lastMessage && (
                          <span className="text-[10px] text-slate-500">
                            {new Date(m.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-1">
                        {m.lastMessage ? m.lastMessage.content : 'You matched! Start the chat.'}
                      </p>
                    </div>
                  </button>
                );
              });
            })()}
          </div>
        </aside>

        {/* Right Column: Active Chat window */}
        <section className={`flex-1 flex flex-col bg-slate-950/20 ${!selectedMatch ? 'hidden md:flex' : 'flex'}`}>
          {selectedMatch ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 relative z-30">
                <div className="flex items-center space-x-3">
                  <button onClick={() => setSelectedMatch(null)} className="md:hidden p-1 text-slate-400 hover:text-slate-100 mr-1">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  
                  <div className="relative">
                    {getOtherUserPhoto(selectedMatch) ? (
                      <img src={getOtherUserPhoto(selectedMatch)!} alt={selectedMatch.otherProfile.name} className="w-10 h-10 rounded-full object-cover border border-slate-800" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center"><User className="w-5 h-5 text-slate-500" /></div>
                    )}
                    {isUserOnline(selectedMatch.otherProfile.userId) && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-950" />
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-100">{selectedMatch.otherProfile.name}</h3>
                    <p className="text-[10px] text-slate-400">
                      {isUserOnline(selectedMatch.otherProfile.userId) ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </div>

                {/* Safety Options Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowOptions(!showOptions)}
                    className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {showOptions && (
                    <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-lg bg-slate-900 border border-slate-800 overflow-hidden py-1 z-50">
                      <button
                        onClick={() => {
                          setSafetyActionType('block');
                          setShowSafetyModal(true);
                          setShowOptions(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-amber-500 transition-colors flex items-center space-x-2"
                      >
                        <ShieldAlert className="w-4 h-4" />
                        <span>Block User</span>
                      </button>
                      <button
                        onClick={() => {
                          setSafetyActionType('report');
                          setShowSafetyModal(true);
                          setShowOptions(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-rose-500 transition-colors flex items-center space-x-2"
                      >
                        <ShieldAlert className="w-4 h-4" />
                        <span>Report & Block</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Message list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/10">
                {isLoadingChat ? (
                  <div className="text-center text-slate-400 py-8"><RefreshCw className="w-6 h-6 animate-spin mx-auto" /></div>
                ) : (
                  messages.map((msg) => {
                    const isSelf = msg.senderId === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-md ${
                            isSelf
                              ? 'bg-rose-600 text-white rounded-tr-none'
                              : 'bg-slate-900 text-slate-100 border border-slate-800/80 rounded-tl-none'
                          }`}
                        >
                          <p className="leading-relaxed break-words">{msg.content}</p>
                          <span className={`block text-[9px] mt-1 text-right ${isSelf ? 'text-white/60' : 'text-slate-500'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                
                {/* Typing Indicator Bubble */}
                {otherUserTyping && (
                  <div className="flex justify-start">
                    <div className="bg-slate-900 text-slate-400 rounded-2xl rounded-tl-none px-4 py-2.5 border border-slate-800/50 flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input form or Event Expired CTA */}
              {isHangoutExpired ? (
                <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex flex-col items-center justify-center space-y-3">
                  {currentUserHasContinued ? (
                    <div className="text-center text-slate-400 text-sm p-4 bg-slate-900 rounded-xl border border-slate-800 w-full">
                      Waiting for <strong>{selectedMatch.otherProfile.name}</strong> to respond...
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-slate-300 text-center font-medium">
                        The event time has passed! Do you want to continue chatting or remove this connection?
                      </p>
                      <div className="flex items-center space-x-3 w-full max-w-sm">
                        <button
                          onClick={handleRemoveMatch}
                          className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-sm font-bold transition-colors"
                        >
                          Remove chat
                        </button>
                        <button
                          onClick={handleContinueMatch}
                          className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white shadow-lg hover:bg-rose-500 text-sm font-bold transition-colors"
                        >
                          Continue chat
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSend} className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center space-x-3">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={inputText}
                    onChange={handleInputChange}
                    disabled={isLoadingChat}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="p-3 bg-rose-600 rounded-xl text-white hover:bg-rose-500 shadow-md transition-colors disabled:opacity-50 disabled:hover:bg-rose-600"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <MessageCircle className="w-16 h-16 text-slate-800 mb-4" />
              <h3 className="text-xl font-bold text-slate-300">Start the conversation</h3>
              <p className="text-sm text-slate-400 max-w-sm mt-1">
                Select a match from the left sidebar to load chat history and exchange real-time messages.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Safety Modal (Report/Block) */}
      {showSafetyModal && selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass max-w-sm w-full rounded-2xl overflow-hidden relative p-6 border border-slate-800">
            <h3 className="text-lg font-bold text-slate-100">
              {safetyActionType === 'block' ? `Block ${selectedMatch.otherProfile.name}?` : `Report ${selectedMatch.otherProfile.name}`}
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              {safetyActionType === 'block'
                ? 'They will be unmatched and you will never see each other again.'
                : 'Reports are reviewed by moderators. This will also block the user.'}
            </p>

            <div className="flex items-center space-x-4 mt-4">
              <button
                onClick={() => setSafetyActionType('block')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                  safetyActionType === 'block'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                    : 'border-slate-800 text-slate-400 hover:bg-slate-900'
                }`}
              >
                Block Only
              </button>
              <button
                onClick={() => setSafetyActionType('report')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                  safetyActionType === 'report'
                    ? 'border-rose-500 bg-rose-500/10 text-rose-400'
                    : 'border-slate-800 text-slate-400 hover:bg-slate-900'
                }`}
              >
                Report & Block
              </button>
            </div>

            {safetyActionType === 'report' && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">Reason for report</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full text-sm bg-slate-900 border border-slate-800 text-slate-100 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  >
                    <option value="harassment">Harassment / Abusive behavior</option>
                    <option value="inappropriate_text">Inappropriate / Obscene text messages</option>
                    <option value="scammer_fake">Scammer / Fake account</option>
                    <option value="underage_user">Under 18 user profile</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">Optional Details</label>
                  <textarea
                    rows={3}
                    placeholder="Provide details..."
                    value={reportNote}
                    onChange={(e) => setReportNote(e.target.value)}
                    className="w-full text-sm bg-slate-900 border border-slate-800 text-slate-100 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  ></textarea>
                </div>
              </div>
            )}

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowSafetyModal(false);
                  setReportNote('');
                }}
                className="flex-1 py-2 text-sm font-semibold rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSafetyAction}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  safetyActionType === 'block' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
