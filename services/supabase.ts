import { createClient } from '@supabase/supabase-js';
import { Profile, Message, Announcement, Quiz } from '../types';

// --- CONFIGURATION ---
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

// Check if env vars are present
const isConfigured = supabaseUrl && supabaseAnonKey;

// --- REAL CLIENT OR FALLBACK ---
let supabaseClient: any;

if (isConfigured) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn("⚠️ Supabase Env Vars missing. Using In-Memory Mock for UI Demo.");
  // --- MOCK FALLBACK ---
  let MOCK_PROFILES: Profile[] = [
    { id: 'u1', username: 'LaoShi_Wang', role: 'professeur', class_group: 'L1 G5', avatar_url: '' },
    { id: 'u2', username: 'Alex_Dupont', role: 'eleve', class_group: 'L1 G5', avatar_url: '' },
    { id: 'u3', username: 'Sophie_Martin', role: 'eleve', class_group: 'L1 G5', avatar_url: '' },
  ];
  
  let MOCK_MESSAGES: Message[] = [
    { id: 'm1', content: '你好! Bonjour à tous, préparez-vous pour le test de vocabulaire.', sender_id: 'u1', created_at: new Date(Date.now() - 100000).toISOString(), profiles: MOCK_PROFILES[0] },
    { id: 'm2', content: 'LaoShi, est-ce que le Pinyin sera affiché ? @prof', sender_id: 'u2', created_at: new Date(Date.now() - 50000).toISOString(), profiles: MOCK_PROFILES[1] },
    { id: 'm3', content: 'Non, uniquement les Hanzi (汉字).', sender_id: 'u1', created_at: new Date(Date.now() - 10000).toISOString(), profiles: MOCK_PROFILES[0] },
  ];

  const MOCK_ANNOUNCEMENTS: Announcement[] = [
    { id: 'a1', title: 'EXAMEN HSK 1 - SALLE 304', content: 'N\'oubliez pas vos cartes étudiantes. Le test commence à 14h00 précises. Sujet : Salutations et Nombres.', created_by: 'u1', created_at: new Date().toISOString(), profiles: MOCK_PROFILES[0] }
  ];

  const MOCK_QUIZZES: Quiz[] = [
    { 
      id: 'q1', 
      title: 'Module 1 : Salutations & Politesse', 
      memo: '💡 Le savais-tu ? En Chine, on ne dit pas toujours "Bonjour" (Nǐ hǎo). Entre amis, on demande souvent "As-tu mangé ?" (Nǐ chī le ma ?). C\'est une marque d\'attention !',
      created_by: 'u1', 
      questions: [
        { 
          id: 'qq1', 
          text: 'Comment dit-on "Merci" ?', 
          explanation: 'On utilise "Xièxiè" (谢谢). Attention au ton neutre sur la deuxième syllabe !',
          options: [
            {id:'o1', text:'谢谢 (Xièxiè)', is_correct:true}, 
            {id:'o2', text:'再见 (Zàijiàn)', is_correct:false},
            {id:'o3', text:'你好 (Nǐ hǎo)', is_correct:false}
          ]
        },
        { 
          id: 'qq2', 
          text: 'Que répond-on à "Merci" ?', 
          explanation: '"Bù kèqì" (不客气) signifie littéralement "Ne sois pas poli" / "Pas de quoi".',
          options: [
            {id:'o1', text:'不客气 (Bù kèqì)', is_correct:true}, 
            {id:'o2', text:'对不起 (Duìbùqǐ)', is_correct:false}
          ]
        }
      ] 
    },
    { 
      id: 'q2', 
      title: 'Module 2 : Les Chiffres (1-10)', 
      memo: '🖐️ Mémo Culture : Les Chinois comptent jusqu\'à 10 avec une seule main ! Le chiffre 6 (六) ressemble à un geste de téléphone, et le 10 (十) se fait en croisant l\'index et le majeur ou avec deux mains.',
      created_by: 'u1', 
      questions: [
        { 
          id: 'qq3', 
          text: 'Quel caractère correspond au chiffre 4 (Sì) ?', 
          explanation: 'Le chiffre 4 (四 - Sì) se prononce presque comme le mot "mort" (死 - Sǐ). C\'est un chiffre porte-malheur !',
          options: [
            {id:'o1', text:'四', is_correct:true}, 
            {id:'o2', text:'六', is_correct:false},
            {id:'o3', text:'八', is_correct:false}
          ]
        }
      ] 
    }
  ];

  // Simulated Client
  supabaseClient = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithPassword: async ({ email }: any) => {
        // Mock Login: Email "prof" -> Prof, else Student
        const user = email.includes('prof') ? MOCK_PROFILES[0] : MOCK_PROFILES[1];
        return { data: { user: { id: user.id, email }, session: { user: { id: user.id, email } } }, error: null };
      },
      signUp: async ({ email, options }: any) => {
         const role = options?.data?.role || 'eleve';
         const user = { id: `u-${Date.now()}`, email };
         // In a real flow, the Auth component handles profile creation, but here in mock we simulate auth success
         return { data: { user, session: { user } }, error: null };
      },
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    from: (table: string) => ({
      select: (query?: string) => {
        return {
          order: () => ({
            eq: () => ({ data: table === 'messages' ? MOCK_MESSAGES : table === 'announcements' ? MOCK_ANNOUNCEMENTS : table === 'quizzes' ? MOCK_QUIZZES : table === 'results' ? [] : MOCK_PROFILES, error: null }),
             data: table === 'messages' ? MOCK_MESSAGES : table === 'announcements' ? MOCK_ANNOUNCEMENTS : table === 'quizzes' ? MOCK_QUIZZES : table === 'results' ? [] : MOCK_PROFILES, error: null 
          }),
          eq: (col:string, val:any) => ({
             single: () => ({ data: MOCK_PROFILES.find(p => p.id === val), error: null }),
             data: MOCK_PROFILES.filter(p => p[col as keyof Profile] === val)
          }),
          data: table === 'messages' ? MOCK_MESSAGES : table === 'announcements' ? MOCK_ANNOUNCEMENTS : table === 'quizzes' ? MOCK_QUIZZES : MOCK_PROFILES,
          error: null
        }
      },
      insert: async (data: any) => {
        console.log(`[Mock DB] Insert into ${table}:`, data);
        if (table === 'profiles') {
             MOCK_PROFILES.push(data);
        }
        return { error: null };
      },
      delete: () => ({
          eq: (col: string, val: any) => {
              if (table === 'messages') {
                  MOCK_MESSAGES = MOCK_MESSAGES.filter(m => m.id !== val);
              }
              return { error: null };
          }
      })
    }),
    channel: () => ({
      on: () => ({ subscribe: () => {} })
    })
  };
}

export const supabase = supabaseClient;
