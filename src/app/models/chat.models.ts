/**
 * Chat Request Model
 * 
 * This interface defines the structure of requests sent to the n8n webhook or .NET API.
 * 
 * Fields:
 * - sessionId: Unique identifier for the chat session
 * - question: The user's question/message
 * - selectedDocumentIds: Array of selected document IDs for RAG (Retrieval Augmented Generation)
 * - ragSource: Optional field for specifying a specific RAG source/document
 * 
 * @since 1.0.0
 */
export interface ChatRequest {
  sessionId: string;
  question: string;
  selectedDocumentIds: string[];
  ragSource?: string; // Optional RAG source field - added for document-specific queries
}

export interface ChatResponse {
  answer: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  rating?: 'up' | 'down'; // User rating for assistant messages (thumbs up/down)
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
  type?: string; // Optional: File extension: 'pdf', 'docx', 'txt', 'xlsx', etc.
  path?: string;
}

