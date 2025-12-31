import React, { useState, useEffect } from 'react';
import { Terminal, Check, X, ChevronRight, Activity, Cpu, Sparkles, Lock, BookOpen, Lightbulb } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Quiz, Profile } from '../types';

const QuizView: React.FC<{ currentUser: Profile }> = ({ currentUser }) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [completedQuizzes, setCompletedQuizzes] = useState<Set<string>>(new Set());

  const canCreate = currentUser.role === 'professeur' || currentUser.role === 'admin';

  useEffect(() => {
    // Check results from DB
    const fetchResults = async () => {
        const { data } = await supabase.from('results').select('quiz_id').eq('student_id', currentUser.id);
        if (data) {
            const completedSet = new Set(data.map(r => r.quiz_id));
            setCompletedQuizzes(completedSet);
        }
    };
    fetchResults();

    const fetchQuizzes = async () => {
      const { data } = await supabase.from('quizzes').select('*');
      if (data) setQuizzes(data);
    };
    fetchQuizzes();
  }, [currentUser.id]);

  const saveResult = async (quizId: string, score: number, total: number) => {
    setCompletedQuizzes(prev => new Set(prev).add(quizId));
    // TYPAGE STRICT : On s'assure que score et total sont bien des nombres
    await supabase.from('results').insert({
        quiz_id: quizId,
        student_id: currentUser.id,
        score: Number(score),
        total: Number(total)
    });
  };

  if (activeQuiz) {
     return (
        <ActiveQuizSession 
            quiz={activeQuiz} 
            onExit={() => setActiveQuiz(null)} 
            onComplete={(score, total) => saveResult(activeQuiz.id, score, total)} 
        />
     );
  }

  // Simulated AI Generation: Spaced Repetition
  const handleCreateAIQuiz = () => {
    const newQuiz: Quiz = {
       id: `q-${Date.now()}`,
       title: "Révision Intelligente (IA)",
       memo: "🧠 Cette session utilise la répétition espacée. Nous allons revoir des mots que la classe a trouvés difficiles la semaine dernière.",
       created_by: currentUser.id,
       questions: [
          {
             id: 'ai-1', 
             text: 'Rappel : Comment dit-on "Famille" ?', 
             explanation: 'Famille se dit "Jiātíng" (家庭). Jia (家) signifie aussi la maison.',
             options: [{id:'a', text:'家庭 (Jiātíng)', is_correct:true}, {id:'b', text:'学校 (Xuéxiào)', is_correct:false}]
          },
          {
             id: 'ai-2',
             text: 'Quel est le chiffre porte-bonheur ?',
             explanation: 'C\'est le 8 (八 - Bā), car il rime avec "Fā" (fortune).',
             options: [{id:'a', text:'八 (Bā)', is_correct:true}, {id:'b', text:'四 (Sì)', is_correct:false}]
          }
       ]
    };
    setQuizzes(prev => [newQuiz, ...prev]);
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] p-6 relative">
       <div className="flex justify-between items-center mb-8 relative z-10">
          <div className="flex items-center gap-3">
             <Terminal className="text-neon-green" size={24} />
             <h2 className="text-2xl font-bold text-white tracking-tight">MODULES_SAVOIR<span className="text-neon-green blink">_</span></h2>
          </div>
          {canCreate && (
             <button 
               onClick={handleCreateAIQuiz}
               className="flex items-center gap-2 border border-neon-green text-neon-green px-4 py-2 text-xs font-mono hover:bg-neon-green hover:text-black transition-all uppercase"
             >
               <Sparkles size={14} /> Générer Révision IA
             </button>
          )}
       </div>

       {quizzes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-60">
             <div className="relative mb-6">
                <div className="absolute inset-0 bg-neon-green/20 blur-xl rounded-full"></div>
                <Cpu size={64} className="text-neon-green relative z-10" />
             </div>
             <h3 className="text-neon-green font-mono text-xl mb-1 tracking-widest">AUCUN MODULE</h3>
             <p className="text-gray-500 font-mono text-xs max-w-xs text-center border-t border-gray-800 pt-4 mt-2">
                Le système est en veille. Attendez les instructions du professeur.
             </p>
          </div>
       ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              {quizzes.map(quiz => {
                 const isDone = completedQuizzes.has(quiz.id);
                 return (
                 <button 
                   key={quiz.id}
                   disabled={isDone}
                   onClick={() => setActiveQuiz(quiz)}
                   className={`glass-panel p-6 text-left transition-all group relative ${isDone ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:bg-neon-green/5 hover:border-neon-green'}`}
                 >
                    <div className="absolute top-2 right-2 flex gap-1">
                       {isDone ? <Lock size={14} className="text-gray-500"/> : <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse"></div>}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <BookOpen size={14} className={isDone ? "text-gray-600" : "text-neon-green"} />
                        <span className="text-[10px] font-mono text-gray-500 uppercase">Module d'apprentissage</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-200 group-hover:text-neon-green mb-1 font-mono">{quiz.title}</h3>
                    
                    {isDone ? (
                       <div className="mt-4 inline-flex items-center gap-2 text-xs text-gray-500 border border-gray-700 px-3 py-1 rounded-sm font-mono">
                          <Check size={12} /> ACQUIS
                       </div>
                    ) : (
                       <div className="mt-4 inline-flex items-center gap-2 text-xs text-neon-green border border-neon-green/30 px-3 py-1 bg-neon-green/5 rounded-sm">
                          <Activity size={12} /> COMMENCER
                       </div>
                    )}
                 </button>
              )})}
           </div>
       )}
    </div>
  );
};

interface ActiveSessionProps {
    quiz: Quiz;
    onExit: () => void;
    onComplete: (score: number, total: number) => void;
}

const ActiveQuizSession: React.FC<ActiveSessionProps> = ({ quiz, onExit, onComplete }) => {
   const [step, setStep] = useState<'memo' | 'question' | 'finish'>('memo');
   const [qIndex, setQIndex] = useState(0);
   const [selected, setSelected] = useState<string | null>(null);
   const [isValidated, setIsValidated] = useState(false);
   const [score, setScore] = useState(0);
   
   // Current question logic
   const question = quiz.questions[qIndex];
   const isLast = qIndex === quiz.questions.length - 1;

   // Start Quiz after Memo
   const startQuiz = () => setStep('question');

   const handleValidate = () => {
      setIsValidated(true);
      const correct = question.options.find(o => o.is_correct);
      if (correct?.id === selected) setScore(s => s + 1);
   };

   const next = () => {
      if (isLast) {
         setStep('finish');
         const finalScore = (question.options.find(o => o.is_correct)?.id === selected) ? score + 1 : score;
         onComplete(finalScore, quiz.questions.length);
      } else {
         setQIndex(i => i + 1);
         setSelected(null);
         setIsValidated(false);
      }
   };

   // --- STEP 1: MEMO / LE SAVIEZ-VOUS ---
   if (step === 'memo') {
       return (
           <div className="h-full flex flex-col items-center justify-center bg-[#050505] p-8 text-center relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-neon-green to-transparent"></div>
               <div className="max-w-xl glass-panel p-8 border-t-0 border-neon-green relative">
                   <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#050505] p-3 rounded-full border border-neon-green text-neon-green">
                       <Lightbulb size={32} />
                   </div>
                   <h2 className="text-2xl text-white font-bold mt-6 mb-4 font-mono tracking-tight">AVANT DE COMMENCER</h2>
                   <div className="text-gray-300 font-sans text-lg leading-relaxed mb-8">
                       {quiz.memo || "Préparez-vous à tester vos connaissances. Prenez votre temps, l'important est d'apprendre !"}
                   </div>
                   <button onClick={startQuiz} className="bg-neon-green text-black font-bold font-mono px-8 py-3 hover:bg-white transition-colors uppercase tracking-wider shadow-[0_0_20px_rgba(10,255,96,0.2)]">
                       J'ai compris, c'est parti !
                   </button>
               </div>
           </div>
       );
   }

   // --- STEP 3: FINISH ---
   if (step === 'finish') {
      const percentage = Math.round((score / quiz.questions.length) * 100);
      return (
         <div className="h-full flex flex-col items-center justify-center bg-[#050505] p-8 text-center relative overflow-hidden">
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <div className="w-[500px] h-[500px] bg-neon-green/10 rounded-full blur-[100px] animate-pulse"></div>
             </div>
             
            <div className="w-32 h-32 rounded-full border-2 border-neon-green flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(10,255,96,0.3)] bg-neon-green/10 z-10 animate-[bounce_1s_ease-out]">
               <span className="text-4xl font-mono text-neon-green font-bold">{percentage}%</span>
            </div>
            
            <h2 className="text-3xl text-white font-bold mb-2 z-10">太棒了 ! (Tàibàngle)</h2>
            <p className="text-neon-green mb-8 font-mono text-sm z-10 uppercase tracking-widest">SAVOIR AUGMENTÉ</p>
            <p className="text-gray-400 max-w-md mb-8 z-10">Bravo ! Tu as terminé ce module. Continue comme ça pour maîtriser le Mandarin.</p>
            
            <button onClick={onExit} className="bg-white text-black font-bold font-mono px-8 py-3 hover:bg-neon-green transition-colors z-10 shadow-lg">
               RETOUR AU QG
            </button>
         </div>
      );
   }

   // --- STEP 2: QUESTION ---
   const isCorrect = isValidated && question.options.find(o => o.is_correct)?.id === selected;

   return (
      <div className="h-full flex flex-col bg-[#050505] p-6 relative">
         <div className="mb-8 flex justify-between items-end border-b border-white/10 pb-4">
            <div>
               <span className="text-neon-green text-xs font-mono block mb-1">MODULE D'APPRENTISSAGE</span>
               <h2 className="text-xl text-white font-bold max-w-md">{question.text}</h2>
            </div>
            <div className="text-right">
               <span className="text-4xl font-mono text-white/10 font-bold">{qIndex + 1}</span>
               <span className="text-sm text-gray-600 font-mono">/{quiz.questions.length}</span>
            </div>
         </div>

         <div className="space-y-3 flex-1 overflow-y-auto">
            {question.options.map(opt => {
               let stateClass = "border-white/10 hover:border-white/30 text-gray-300";
               if (selected === opt.id && !isValidated) stateClass = "border-neon-yellow text-neon-yellow bg-neon-yellow/5";
               
               if (isValidated) {
                  if (opt.is_correct) stateClass = "border-neon-green text-neon-green bg-neon-green/10";
                  else if (selected === opt.id) stateClass = "border-neon-red text-neon-red bg-neon-red/10";
                  else stateClass = "opacity-20 border-transparent";
               }

               return (
                  <button
                     key={opt.id}
                     disabled={isValidated}
                     onClick={() => setSelected(opt.id)}
                     className={`w-full p-5 border text-left font-mono text-sm transition-all duration-300 flex justify-between items-center ${stateClass}`}
                  >
                     <span className="font-sans text-lg">{opt.text}</span>
                     {isValidated && opt.is_correct && <Check size={16} />}
                     {isValidated && !opt.is_correct && selected === opt.id && <X size={16} />}
                  </button>
               )
            })}

            {/* FEEDBACK SECTION */}
            {isValidated && (
                <div className={`mt-6 p-4 border-l-2 ${isCorrect ? 'border-neon-green bg-neon-green/5' : 'border-neon-red bg-neon-red/5'} animate-in slide-in-from-bottom-2 fade-in duration-500`}>
                    <h4 className={`font-mono font-bold mb-1 ${isCorrect ? 'text-neon-green' : 'text-neon-red'}`}>
                        {isCorrect ? 'EXCELLENT ! (太棒了)' : 'AÏE, PRESQUE ! (加油)'}
                    </h4>
                    <p className="text-gray-300 text-sm leading-relaxed">
                        {isCorrect 
                            ? "Tu as bien retenu la leçon. Continue comme ça !" 
                            : question.explanation || "Regarde bien la bonne réponse en vert."}
                    </p>
                </div>
            )}
         </div>

         <div className="pt-6">
            {!isValidated ? (
               <button 
                  disabled={!selected}
                  onClick={handleValidate}
                  className="w-full bg-white text-black font-bold font-mono py-4 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase tracking-wider"
               >
                  Vérifier
               </button>
            ) : (
               <button 
                  onClick={next}
                  className="w-full bg-neon-green text-black font-bold font-mono py-4 hover:bg-white transition-colors flex items-center justify-center gap-2 uppercase tracking-wider shadow-[0_0_15px_rgba(10,255,96,0.3)]"
               >
                  {isLast ? 'Voir mes résultats' : 'Question Suivante'} <ChevronRight size={16} />
               </button>
            )}
         </div>
      </div>
   );
};

export default QuizView;