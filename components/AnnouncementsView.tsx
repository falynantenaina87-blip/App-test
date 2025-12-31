import React, { useEffect, useState } from 'react';
import { AlertTriangle, Megaphone, Plus, Radio } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Announcement, Profile } from '../types';

interface AnnouncementsProps {
  currentUser: Profile;
}

const AnnouncementsView: React.FC<AnnouncementsProps> = ({ currentUser }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const canCreate = currentUser.role === 'professeur' || currentUser.role === 'admin';

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*, profiles(*)')
        .order('created_at', { ascending: false });
      if (data) setAnnouncements(data);
    };

    fetchAnnouncements();

    // REALTIME: Listen for new announcements without page reload
    const channel = supabase
      .channel('announcements_feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, async (payload: any) => {
         const { data } = await supabase.from('profiles').select('*').eq('id', payload.new.created_by).single();
         setAnnouncements(prev => {
             if (prev.find(a => a.id === payload.new.id)) return prev;
             return [{...payload.new, profiles: data}, ...prev];
         });
      })
      .subscribe();

    // NETTOYAGE CRITIQUE
    return () => { 
        supabase.removeChannel(channel); 
    };
  }, []);

  const createAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate) {
        alert("Accès refusé. Seul le professeur ou l'admin peut publier.");
        return;
    }

    await supabase.from('announcements').insert({
      title: newTitle,
      content: newContent,
      created_by: currentUser.id
    });
    setIsCreating(false);
    setNewTitle('');
    setNewContent('');
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] p-6 relative">
       <div className="flex justify-between items-center mb-8 relative z-10">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 border border-neon-red flex items-center justify-center bg-neon-red/10 rounded-sm">
                <AlertTriangle className="text-neon-red" size={20} />
             </div>
             <h2 className="text-2xl font-bold text-white tracking-tight">ANNONCES<span className="text-neon-red">.LOG</span></h2>
          </div>
          {/* SECURITY: Only Teacher/Admin sees the create button */}
          {canCreate && (
             <button 
               onClick={() => setIsCreating(true)}
               className="border border-neon-red text-neon-red px-4 py-2 text-xs font-mono hover:bg-neon-red hover:text-black transition-all uppercase"
             >
               + Nouvelle entrée
             </button>
          )}
       </div>

       {/* Modal Creation */}
       {isCreating && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-panel w-full max-w-lg p-6 border-neon-red shadow-neon-red relative">
               <h3 className="text-neon-red font-mono mb-4 text-lg border-b border-neon-red/20 pb-2">NOUVELLE_ALERTE</h3>
               <form onSubmit={createAnnouncement} className="space-y-4">
                  <input 
                    className="w-full bg-black/50 border border-white/10 text-white p-3 focus:border-neon-red focus:outline-none font-mono text-sm"
                    placeholder="TITRE_DU_SUJET"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                  />
                  <textarea 
                    className="w-full bg-black/50 border border-white/10 text-white p-3 h-32 focus:border-neon-red focus:outline-none font-sans text-sm"
                    placeholder="Contenu du message..."
                    value={newContent}
                    onChange={e => setNewContent(e.target.value)}
                  />
                  <div className="flex justify-end gap-3 pt-2">
                     <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-gray-500 hover:text-white text-xs font-mono">ANNULER</button>
                     <button type="submit" className="bg-neon-red text-black px-6 py-2 text-xs font-bold font-mono hover:bg-white transition-colors">PUBLIER</button>
                  </div>
               </form>
            </div>
         </div>
       )}

       {/* List or Empty State */}
       {announcements.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40 pointer-events-none">
             <div className="w-32 h-32 border-2 border-neon-red/20 rounded-full flex items-center justify-center mb-6 animate-[pulse_4s_infinite]">
                 <Megaphone size={48} className="text-neon-red opacity-50" />
             </div>
             <h3 className="text-neon-red font-mono text-lg tracking-[0.2em] mb-2">SYSTÈME SILENCIEUX</h3>
             <p className="text-gray-500 font-mono text-xs">Aucune alerte prioritaire en cours.</p>
          </div>
       ) : (
           <div className="grid gap-6 overflow-y-auto pb-20 no-scrollbar relative z-10">
              {announcements.map((ann) => (
                 <div key={ann.id} className="glass-panel p-6 relative overflow-hidden group hover:border-neon-red/50 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                       <Megaphone size={60} className="text-neon-red" />
                    </div>
                    <div className="relative z-10">
                       <div className="flex justify-between items-start mb-2">
                          <span className="bg-neon-red/10 text-neon-red text-[10px] px-2 py-1 font-mono border border-neon-red/20">
                             PRIORITÉ: HAUTE
                          </span>
                          <span className="text-gray-600 text-[10px] font-mono">
                             {new Date(ann.created_at).toLocaleDateString()}
                          </span>
                       </div>
                       <h3 className="text-xl font-bold text-white mb-3 mt-2 font-mono uppercase">{ann.title}</h3>
                       <p className="text-gray-400 text-sm leading-relaxed border-l border-neon-red/30 pl-4">{ann.content}</p>
                       <div className="mt-4 flex items-center gap-2">
                          <div className="w-5 h-5 bg-gray-800 rounded-full flex items-center justify-center text-[10px] text-gray-400">
                             {ann.profiles?.username?.[0]}
                          </div>
                          <span className="text-xs text-gray-500 font-mono">
                             AUTH: {ann.profiles?.username}
                          </span>
                       </div>
                    </div>
                 </div>
              ))}
           </div>
       )}
    </div>
  );
};

export default AnnouncementsView;