import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { UserRole } from '../types';
import { ShieldAlert, KeyRound, User, Mail, Lock, AlertCircle } from 'lucide-react';

const Auth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  // Helper pour traduire les erreurs Supabase
  const translateError = (msg: string) => {
    if (msg.includes('User already registered')) return "Cet email est déjà associé à un compte.";
    if (msg.includes('Password should be at least')) return "Le mot de passe est trop court (min. 6 caractères).";
    if (msg.includes('Invalid login credentials')) return "Email ou mot de passe incorrect.";
    if (msg.includes('rate limit')) return "Trop de tentatives. Veuillez patienter.";
    return msg;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    
    try {
      if (mode === 'signup') {
        // --- 1. VALIDATION PRÉALABLE (Locale) ---
        let assignedRole: UserRole = 'eleve';
        
        // Validation Code d'accès AVANT appel réseau
        if (accessCode === 'ADMIN-G5-MASTER') {
            assignedRole = 'admin';
        } else if (accessCode === 'G5L1-2025-CHINE-X') {
            assignedRole = 'eleve';
        } else {
            throw new Error("Code d'accès invalide. Vérifiez votre carnet de liaison.");
        }

        if (password.length < 6) {
            throw new Error("Le mot de passe doit contenir au moins 6 caractères.");
        }

        if (!username.trim()) {
            throw new Error("Veuillez choisir un pseudo.");
        }

        // --- 2. AUTHENTIFICATION (Supabase Auth) ---
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password, 
        });

        if (authError) throw new Error(translateError(authError.message));

        // --- 3. CRÉATION PROFIL (Synchronisée) ---
        // Ne s'exécute que si l'étape 2 a réussi et retourné un user
        if (authData.user) {
            const { error: profileError } = await supabase.from('profiles').insert({
                id: authData.user.id,
                username: username,
                role: assignedRole,
                class_group: 'L1 G5'
            });
            
            if (profileError) {
                // Cas rare : Auth ok mais Profile fail (ex: contrainte SQL)
                console.error("Profile creation failed", profileError);
                throw new Error("Erreur lors de la création du profil. Contactez l'admin.");
            }
        } else {
            // Cas où Supabase nécessite une confirmation email (si activé)
            if (!authData.session) {
                throw new Error("Inscription réussie ! Vérifiez vos emails pour confirmer.");
            }
        }

        alert(`Bienvenue ${username}. Rôle attribué : ${assignedRole.toUpperCase()}.`);
        setMode('signin');
      } else {
        // --- LOGIN ---
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw new Error(translateError(error.message));
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
       {/* Background Ambience */}
       <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-neon-blue/10 rounded-full blur-[100px] pointer-events-none"></div>
       <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-neon-red/10 rounded-full blur-[100px] pointer-events-none"></div>

       <div className="w-full max-w-md glass-panel p-8 border border-white/10 relative z-10">
          <div className="mb-8 text-center">
             <h1 className="text-3xl font-bold text-white tracking-tighter mb-1">EDU<span className="text-gray-500">CONNECT</span></h1>
             <p className="text-xs font-mono text-neon-blue tracking-[0.2em] uppercase">Portail Sécurisé L1 G5</p>
          </div>

          {errorMsg && (
              <div className="mb-6 p-4 bg-neon-red/10 border border-neon-red text-neon-red text-sm font-mono flex items-start gap-3 rounded-sm animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="shrink-0" size={18} />
                  <span>{errorMsg}</span>
              </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
             {/* Mode Inscription : Pseudo */}
             {mode === 'signup' && (
                <div className="relative group">
                    <User className="absolute left-3 top-3 text-gray-500 group-focus-within:text-neon-blue" size={18} />
                    <input 
                      type="text" 
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="Pseudo (ex: Alex_D)"
                      className="w-full bg-black border border-white/20 text-white p-3 pl-10 font-mono text-sm focus:border-neon-blue focus:shadow-neon-blue outline-none transition-all"
                    />
                </div>
             )}

             {/* Email */}
             <div className="relative group">
                <Mail className="absolute left-3 top-3 text-gray-500 group-focus-within:text-neon-blue" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full bg-black border border-white/20 text-white p-3 pl-10 font-mono text-sm focus:border-neon-blue focus:shadow-neon-blue outline-none transition-all"
                  required
                />
             </div>

             {/* Mot de passe */}
             <div className="relative group">
                <Lock className="absolute left-3 top-3 text-gray-500 group-focus-within:text-neon-blue" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mot de passe"
                  className="w-full bg-black border border-white/20 text-white p-3 pl-10 font-mono text-sm focus:border-neon-blue focus:shadow-neon-blue outline-none transition-all"
                  required
                />
             </div>

             {/* Mode Inscription : Code Secret */}
             {mode === 'signup' && (
                <div className="relative group animate-in slide-in-from-top-2">
                    <KeyRound className="absolute left-3 top-3 text-neon-red group-focus-within:text-white" size={18} />
                    <input 
                      type="text" 
                      value={accessCode}
                      onChange={e => setAccessCode(e.target.value)}
                      placeholder="CODE D'ACCÈS CLASSE"
                      className="w-full bg-neon-red/5 border border-neon-red/30 text-neon-red p-3 pl-10 font-mono text-sm focus:border-neon-red focus:shadow-neon-red outline-none transition-all placeholder:text-neon-red/50"
                    />
                    <div className="text-[9px] text-gray-500 mt-1 font-mono flex items-center gap-1">
                        <ShieldAlert size={10} /> CODE REQUIS POUR INSCRIPTION
                    </div>
                </div>
             )}

             <button 
               disabled={loading}
               className="w-full bg-white text-black font-bold py-3 mt-4 uppercase tracking-wider hover:bg-gray-200 transition-colors disabled:opacity-50"
             >
               {loading ? 'Traitement...' : mode === 'signin' ? 'Connexion' : 'Valider Inscription'}
             </button>
          </form>

          <div className="mt-6 text-center">
             <button 
               onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setErrorMsg(null); }}
               className="text-xs text-gray-500 font-mono hover:text-white underline decoration-gray-700 underline-offset-4"
             >
                {mode === 'signin' ? "Première connexion ? S'inscrire" : "J'ai déjà un compte"}
             </button>
          </div>
          
          <div className="mt-8 pt-4 border-t border-white/5 text-[10px] text-gray-700 font-mono text-center">
             G5L1-SYSTEM v2.0
          </div>
       </div>
    </div>
  );
};

export default Auth;