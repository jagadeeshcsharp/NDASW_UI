export interface ChatRequest {
  sessionId: string;
  question: string;
  selectedDocumentIds: string[];
  ragSource?: string;
}

export interface ChatResponse {
  answer: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  rating?: 'up' | 'down';
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  ragSource?: string;
  messages: ChatMessage[];
  selectedDocumentIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: string;
  fileName: string;
  createdAt: Date;
  updatedAt: Date;
}

