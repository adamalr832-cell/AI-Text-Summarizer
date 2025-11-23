
export type SummaryType = 'short' | 'medium' | 'detailed' | 'points';

export interface FlashcardData {
  question: string;
  answer: string;
}

export interface PronunciationData {
  word: string;
  pronunciation: string;
  note: string;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}

export enum View {
  SUMMARY = 'summary',
  FLASHCARDS = 'flashcards',
  PRONUNCIATION = 'pronunciation',
  INSIGHTS = 'insights',
  CHAT = 'chat',
  LIVE = 'live',
}
