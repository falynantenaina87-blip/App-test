import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabase';
import { Profile, ViewType } from './types';
import Auth from './components/Auth';
import ChatView from './components/ChatView';
import AnnouncementsView from './components/AnnouncementsView';
import QuizView from './components/QuizView';
import { MessageSquare, Bell, Cpu, LogOut, Grid } from 'lucide-react';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [view, setView] = useState<ViewType>('chat');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Get Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id, session.user.email);
      else setIsLoading(false);
    });

    // 2. Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id, session.user.email);
      else setCurrentUser(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, email?: string) => {
    // In real supabase, we fetch from 'profiles'. 
    // Since we handle mock data in service layer too, this works for both.
    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!data && email) {
        // Fallback for mock if specific user not in static list
        data = { id: userId, username: email.split('@')[0], role: 'eleve' };
    }

    if (data) setCurrentUser(data);
    setIsLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setView('chat');
  };

  if (isLoading) return <div className="min-h-screen bg-black flex items-center justify-center text-neon-blue font-mono animate-pulse">INITIALIZING_SYSTEM...</div>;

  if (!session || !currentUser) {
    return <Auth />;
  }

  return (
    <div className="flex h-screen bg-[#050505] text-gray-200 overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="w-64 border-r border-white/10 hidden md:flex flex-col bg-black/50 backdrop-blur-xl z-20">
         <div className="p-6 border-b border-white/5">
            <h1 className="font-bold text-white text-xl tracking-tighter">EDU<span className="text-gray-600">CONNECT</span></h1>
         </div>
         
         <nav className="flex-1 p-4 space-y-2">
            <NavButton 
               active={view === 'chat'} 
               onClick={() => setView('chat')} 
               icon={<MessageSquare size={18} />} 
               label="COMMUNICATIONS" 
               color="blue"
            />
            <NavButton 
               active={view === 'announcements'} 
               onClick={() => setView('announcements')} 
               icon={<Bell size={18} />} 
               label="ALERTS & LOGS" 
               color="red"
            />
            <NavButton 
               active={view === 'quiz'} 
               onClick={() => setView('quiz')} 
               icon={<Cpu size={18} />} 
               label="EVALUATION" 
               color="green"
            />
         </nav>

         <div className="p-4 border-t border-white/5">
            <div className="flex items-center gap-3 mb-4 px-2">
               <div className="w-8 h-8 bg-white/10 rounded-sm flex items-center justify-center font-mono text-xs border border-white/10">
                  {currentUser.username[0].toUpperCase()}
               </div>
               <div className="overflow-hidden">
                  <p className="text-sm font-bold text-white truncate">{currentUser.username}</p>
                  <p className="text-[10px] font-mono text-gray-500 uppercase">{currentUser.role}</p>
               </div>
            </div>
            <button 
               onClick={handleLogout}
               className="w-full flex items-center gap-2 text-gray-500 hover:text-white text-xs font-mono px-2 py-2 transition-colors"
            >
               <LogOut size={14} /> DECONNEXION
            </button>
         </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-black/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-4 z-50">
         <span className="font-bold text-white">EDU<span className="text-gray-600">CO</span></span>
         <button onClick={handleLogout}><LogOut size={18} className="text-gray-500" /></button>
      </div>

      {/* Main Content */}
      <main className="flex-1 relative md:static pt-14 md:pt-0">
         {view === 'chat' && <ChatView currentUser={currentUser} />}
         {view === 'announcements' && <AnnouncementsView currentUser={currentUser} />}
         {view === 'quiz' && <QuizView currentUser={currentUser} />}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-black border-t border-white/10 grid grid-cols-3 z-50">
         <button onClick={() => setView('chat')} className={`flex flex-col items-center justify-center ${view === 'chat' ? 'text-neon-blue' : 'text-gray-600'}`}>
            <MessageSquare size={20} />
         </button>
         <button onClick={() => setView('announcements')} className={`flex flex-col items-center justify-center ${view === 'announcements' ? 'text-neon-red' : 'text-gray-600'}`}>
            <Bell size={20} />
         </button>
         <button onClick={() => setView('quiz')} className={`flex flex-col items-center justify-center ${view === 'quiz' ? 'text-neon-green' : 'text-gray-600'}`}>
            <Cpu size={20} />
         </button>
      </nav>
    </div>
  );
};

interface NavButtonProps {
   active: boolean;
   onClick: () => void;
   icon: React.ReactNode;
   label: string;
   color: 'blue' | 'red' | 'green';
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label, color }) => {
   const colorClasses = {
      blue: 'border-neon-blue text-neon-blue bg-neon-blue/5 shadow-[0_0_10px_rgba(0,240,255,0.2)]',
      red: 'border-neon-red text-neon-red bg-neon-red/5 shadow-[0_0_10px_rgba(255,0,60,0.2)]',
      green: 'border-neon-green text-neon-green bg-neon-green/5 shadow-[0_0_10px_rgba(10,255,96,0.2)]'
   };

   return (
      <button
         onClick={onClick}
         className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm border transition-all duration-300 font-mono text-xs tracking-wider ${
            active ? colorClasses[color] : 'border-transparent text-gray-500 hover:text-white hover:bg-white/5'
         }`}
      >
         {icon}
         {label}
      </button>
   );
};

export default App;
