import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { Send, Hash, Radio, BellRing, Languages, Trash2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Message, Profile } from '../types';

interface ChatViewProps {
  currentUser: Profile;
}

// Simple Pinyin dictionary for demo purposes
const pinyinDict: Record<string, string> = {
    '你好': 'Nǐ hǎo',
    '我是学生': 'Wǒ shì xuésheng',
    '谢谢': 'Xièxiè',
    '老师': 'Lǎoshī',
    '汉字': 'Hànzì',
    '不客气': 'Bù kèqì'
};

const ChatView: React.FC<ChatViewProps> = ({ currentUser }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [showPinyin, setShowPinyin] = useState<Record<string, boolean>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  // Helper: Detect Chinese Characters
  const hasChinese = (text: string) => /[\u4e00-\u9fa5]/.test(text);

  // Helper: Try to convert to pinyin (Mock implementation)
  const getPinyin = (text: string) => {
      // Check our mini dictionary first
      for (const [key, value] of Object.entries(pinyinDict)) {
          if (text.includes(key)) return text.replace(key, `${key} (${value})`);
      }
      return "Pinyin mode active (Data missing)";
  };

  const togglePinyin = (msgId: string) => {
      setShowPinyin(prev => ({...prev, [msgId]: !prev[msgId]}));
  };

  // Auto-scroll logic: Corrected to depend on messages length
  const scrollToBottom = () => {
    // Utilisation de setTimeout pour garantir que le DOM est peint
    setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  // Scroll automatique lors de l'arrivée de nouveaux messages
  useLayoutEffect(() => {
    scrollToBottom();
  }, [messages.length]); 

  useEffect(() => {
    // Initial fetch
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*, profiles(*)')
        .order('created_at', { ascending: true });
      
      if (data) {
          setMessages(data);
      }
    };

    fetchMessages();

    // Realtime subscription with Clean Cleanup
    const channel = supabase
      .channel('chat_room')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async (payload: any) => {
        
        if (payload.eventType === 'INSERT') {
            const { data: profileData } = await supabase.from('profiles').select('*').eq('id', payload.new.sender_id).single();
            const newMsg = { ...payload.new, profiles: profileData };
            
            setMessages(prev => {
              const isMyMessage = newMsg.sender_id === currentUser.id;
              if (isMyMessage) {
                 // Check for optimistic ID match
                 const hasTemp = prev.some(m => m.id.startsWith('temp-'));
                 if (hasTemp) {
                   return prev.map(m => (m.id.startsWith('temp-') && m.content === newMsg.content) ? newMsg : m);
                 }
              }
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
        } else if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
      })
      .subscribe();

    // Nettoyage impératif pour éviter fuites mémoire
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser.id]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const content = input;
    setInput('');

    // Optimistic UI
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      content,
      sender_id: currentUser.id,
      created_at: new Date().toISOString(),
      profiles: currentUser
    };

    setMessages(prev => [...prev, optimisticMsg]);
    
    const { error } = await supabase.from('messages').insert({
      content,
      sender_id: currentUser.id
    });

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      alert("Erreur réseau : Impossible d'envoyer le message.");
    }
  };

  const deleteMessage = async (id: string) => {
      if (currentUser.role !== 'admin') return;
      
      // Optimistic delete
      setMessages(prev => prev.filter(m => m.id !== id));
      
      const { error } = await supabase.from('messages').delete().eq('id', id);
      if (error) {
          alert("Erreur lors de la suppression");
          // Re-fetch messages or revert in a real app would be better, but mock handles it simpler
      }
  };

  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="flex flex-col h-full bg-[#050505]">
      {/* Header */}
      <div className="h-16 border-b border-neon-blue/20 bg-black/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex items-center">
          <Hash className="text-neon-blue mr-3" size={20} />
          <div>
            <h2 className="text-neon-blue font-mono font-bold tracking-wider">L1_MANDARIN_G5</h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neon-blue animate-pulse"></span>
              <span className="text-[10px] text-neon-blue/70 uppercase tracking-widest">Flux Direct</span>
            </div>
          </div>
        </div>
        <div className="text-[10px] font-mono text-gray-500 border border-white/10 px-2 py-1 rounded">
          80 ÉTUDIANTS
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar relative">
        {messages.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-50">
             <div className="w-24 h-24 rounded-full border border-neon-blue/30 bg-neon-blue/5 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(0,240,255,0.1)]">
                <Radio size={40} className="text-neon-blue animate-pulse" />
             </div>
             <p className="text-neon-blue font-mono text-sm tracking-widest uppercase">Aucune transmission</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.sender_id === currentUser.id;
            const isOptimistic = msg.id.startsWith('temp-');
            const isProfMention = msg.content.includes('@prof');
            const containsChinese = hasChinese(msg.content);
            const showPinyinForThis = showPinyin[msg.id];
            
            // Check roles for display
            const isSenderAdminOrProf = msg.profiles?.role === 'professeur' || msg.profiles?.role === 'admin';

            return (
              <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isOptimistic ? 'opacity-70' : 'opacity-100'} transition-all group/row relative`}>
                
                {/* Admin Delete Button */}
                {isAdmin && !isOptimistic && (
                    <button 
                        onClick={() => deleteMessage(msg.id)}
                        className={`absolute top-1/2 -translate-y-1/2 p-2 text-gray-600 hover:text-neon-red opacity-0 group-hover/row:opacity-100 transition-opacity ${isMe ? '-left-8' : '-right-8'}`}
                        title="Supprimer (Admin)"
                    >
                        <Trash2 size={14} />
                    </button>
                )}

                <div className={`max-w-[80%] ${isMe ? 'order-1' : 'order-2'}`}>
                  
                  {/* Avatar & Content Wrapper */}
                  <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                     <div className={`w-8 h-8 rounded border flex items-center justify-center font-mono text-xs shrink-0 ${
                       isSenderAdminOrProf ? 'border-neon-red text-neon-red bg-neon-red/10' : 
                       isMe ? 'border-neon-blue bg-neon-blue/10 text-neon-blue' : 'border-gray-700 bg-gray-800 text-gray-400'
                     }`}>
                       {msg.profiles?.username?.[0] || '?'}
                     </div>

                     <div className={`glass-panel px-4 py-3 rounded-sm border-l-2 relative group/msg ${
                       isProfMention ? 'border-neon-yellow shadow-[0_0_15px_rgba(252,238,10,0.15)]' :
                       isMe ? 'border-l-neon-blue' : 'border-l-gray-600'
                     }`}>
                        {/* Mention Alert Icon */}
                        {isProfMention && (
                           <div className="absolute -top-3 -right-2 bg-neon-yellow text-black rounded-full p-1 animate-bounce">
                              <BellRing size={12} />
                           </div>
                        )}

                        {!isMe && (
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-mono uppercase ${isSenderAdminOrProf ? 'text-neon-red font-bold' : 'text-gray-500'}`}>
                              {msg.profiles?.username}
                            </span>
                            {isSenderAdminOrProf && <span className="bg-neon-red text-black text-[8px] px-1 font-bold">STAFF</span>}
                          </div>
                        )}
                        
                        {/* Message Content */}
                        <div className="flex flex-col">
                             {/* Pinyin Overlay */}
                             {containsChinese && showPinyinForThis && (
                                 <span className="text-neon-yellow font-mono text-xs mb-1 block">
                                     {getPinyin(msg.content)}
                                 </span>
                             )}
                             <p className={`text-sm text-gray-200 font-light leading-relaxed ${containsChinese ? 'font-serif text-lg tracking-wide' : ''}`}>
                                {msg.content}
                             </p>
                        </div>
                        
                        {/* Mandarin Helper Toggle */}
                        {containsChinese && (
                           <button 
                             onClick={() => togglePinyin(msg.id)}
                             className="mt-2 pt-2 border-t border-white/5 flex items-center gap-1 text-[10px] text-gray-500 hover:text-neon-yellow transition-colors font-mono w-full"
                           >
                              <Languages size={10} />
                              <span>{showPinyinForThis ? 'CACHER PINYIN' : 'AIDE PINYIN (拼)'}</span>
                           </button>
                        )}
                     </div>
                  </div>
                  <div className={`text-[9px] text-gray-600 mt-1 font-mono ${isMe ? 'text-right' : 'text-left'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/5 bg-black">
        <form onSubmit={sendMessage} className="relative group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez une question ou tapez @prof..."
            className="w-full bg-[#0A0A0A] border border-white/10 text-gray-300 px-4 py-4 pr-12 rounded-sm focus:outline-none focus:border-neon-blue focus:shadow-neon-blue transition-all font-mono text-sm placeholder:text-gray-700"
          />
          <button 
            type="submit"
            className="absolute right-2 top-2 p-2 text-gray-500 hover:text-neon-blue transition-colors"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatView;