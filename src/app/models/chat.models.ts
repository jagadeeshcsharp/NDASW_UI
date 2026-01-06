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
  title: string;
  messages: ChatMessage[];
  selectedDocumentIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: string;
  name: string;
  type?: string;
  path?: string;
}

