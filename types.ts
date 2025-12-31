export type UserRole = 'professeur' | 'eleve' | 'admin';

// Table: profiles
export interface Profile {
  id: string; // references auth.users
  username: string;
  role: UserRole;
  class_group: string; // ex: 'L1 G5'
  avatar_url?: string;
  created_at?: string;
}

// Table: messages
export interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  // Joined via Query
  profiles?: Profile; 
}

// Table: announcements
export interface Announcement {
  id: string;
  title: string;
  content: string;
  created_by: string;
  created_at: string;
  // Joined via Query
  profiles?: Profile;
}

// Table: quizzes
export interface Quiz {
  id: string;
  title: string;
  memo?: string; // LEÇON / "LE SAVAIS-TU ?"
  created_by: string;
  created_at?: string;
  questions: QuizQuestion[]; 
}

export interface QuizOption {
  id: string;
  text: string;
  is_correct: boolean;
}

export interface QuizQuestion {
  id: string;
  text: string;
  explanation?: string; // PÉDAGOGIE BIENVEILLANTE
  options: QuizOption[];
}

// Table: results (Pour la progression)
export interface Result {
  id: string;
  quiz_id: string;
  student_id: string;
  score: number;
  total: number;
  created_at: string;
}

// UI State
export type ViewType = 'chat' | 'announcements' | 'quiz';
