import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ChatSession, ChatMessage, Document } from '../models/chat.models';
import { environment } from '../../environments/environment';

export interface SessionApiResponse {
  sessionId: string;
  userId: string;
  title: string;
  selectedDocumentIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SessionsApiResponse {
  value?: SessionApiResponse[];
  Count?: number;
}

export interface MessageApiResponse {
  messageId: string;
  sessionId: string;
  role: string;
  content: string;
  rating: string | null;
  timestamp: string;
}

export interface DocumentApiResponse {
  documentId: string;
  fileName: string;
  fileExtension: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private apiUrl = environment.dotnetapi;
  
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) {
    console.log('DatabaseService initialized with API URL:', this.apiUrl);
  }

  getSessions(userId: string): Observable<ChatSession[]> {
    if (!this.apiUrl) {
      console.warn('Database API URL not configured');
      return of([]);
    }

    const url = `${this.apiUrl}/sessions/${encodeURIComponent(userId)}`;
    console.log(`Fetching sessions from: ${url}`);
    
    return this.http.get<SessionApiResponse[] | SessionsApiResponse>(url, this.httpOptions).pipe(
      map(response => {
        const sessions = Array.isArray(response) ? response : (response as SessionsApiResponse).value || [];
        console.log(`Received ${sessions.length} sessions from API:`, sessions);
        return sessions.map(s => this.mapSessionFromApi(s));
      }),
      catchError(error => {
        console.error('Error fetching sessions:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          url: url
        });
        // Re-throw authorization errors (401, 403) so they can be handled by the caller
        if (error.status === 401 || error.status === 403) {
          return throwError(() => error);
        }
        // For other errors, return empty array
        return of([]);
      })
    );
  }

  getSessionMessages(sessionId: string): Observable<ChatMessage[]> {
    if (!this.apiUrl) {
      console.warn('Database API URL not configured');
      return of([]);
    }

    const url = `${this.apiUrl}/sessions/${encodeURIComponent(sessionId)}/messages`;
    console.log(`Fetching messages from: ${url}`);
    
    return this.http.get<MessageApiResponse[]>(url, this.httpOptions).pipe(
      map(messages => {
        console.log(`Received ${messages.length} messages from API for session ${sessionId}`);
        return messages.map(m => this.mapMessageFromApi(m));
      }),
      catchError(error => {
        console.error('Error fetching messages:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          url: url
        });
        return of([]);
      })
    );
  }

  createSession(userId: string, sessionId: string, title: string, selectedDocumentIds?: string[]): Observable<ChatSession> {
    if (!this.apiUrl) {
      return throwError(() => new Error('Database API URL not configured'));
    }

    const requestBody = {
      SessionId: sessionId,
      UserId: userId,
      Title: title,
      SelectedDocumentIds: selectedDocumentIds || []
    };
    
    const url = `${this.apiUrl}/sessions`;
    
    console.log(`Creating session - URL: ${url}`);
    console.log(`Request body:`, JSON.stringify(requestBody, null, 2));

    return this.http.post<SessionApiResponse>(url, requestBody, this.httpOptions).pipe(
      map(response => {
        console.log('Session created successfully:', response);
        const mappedSession = this.mapSessionFromApi(response);
        if (mappedSession.id !== sessionId) {
          console.warn(`API returned different sessionId: ${mappedSession.id} (expected: ${sessionId})`);
        }
        return mappedSession;
      }),
      catchError(error => {
        const errorMessage = error.error?.message || error.error?.error || error.message || '';
        const isDuplicateKey = error.status === 409 || 
          errorMessage.includes('PRIMARY KEY constraint') || 
          errorMessage.includes('duplicate key') ||
          errorMessage.includes('already exists') ||
          JSON.stringify(error.error || {}).toLowerCase().includes('primary key constraint') ||
          JSON.stringify(error.error || {}).toLowerCase().includes('duplicate key');
        
        if (isDuplicateKey) {
          console.log('ℹ️ Session already exists in database (duplicate key detected) - this is expected and will be handled gracefully');
        } else {
          console.error('❌ Error creating session:', error);
          console.error('Error status:', error.status);
          console.error('Error statusText:', error.statusText);
          console.error('Error message:', errorMessage);
          if (error.error) {
            console.error('Error body:', JSON.stringify(error.error, null, 2));
          }
          if (error.url) {
            console.error('Error URL:', error.url);
          }
        }
        return throwError(() => error);
      })
    );
  }

  addMessage(sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): Observable<ChatMessage> {
    if (!this.apiUrl) {
      return throwError(() => new Error('Database API URL not configured'));
    }

    const messageId = this.generateId();
    const requestBody = {
      MessageId: messageId,
      Role: message.role,
      Content: message.content,
      Rating: message.rating || null
    };
    const url = `${this.apiUrl}/sessions/${encodeURIComponent(sessionId)}/messages`;
    
    console.log(`Adding message - URL: ${url}`);
    console.log(`Request body:`, JSON.stringify(requestBody, null, 2));

    return this.http.post<MessageApiResponse>(url, requestBody, this.httpOptions).pipe(
      map(response => {
        console.log('Message added successfully:', response);
        return this.mapMessageFromApi(response);
      }),
      catchError(error => {
        console.error('Error adding message:', error);
        console.error('Error status:', error.status);
        console.error('Error statusText:', error.statusText);
        console.error('Error message:', error.message);
        if (error.error) {
          console.error('Error body:', JSON.stringify(error.error, null, 2));
        }
        if (error.url) {
          console.error('Error URL:', error.url);
        }
        return throwError(() => error);
      })
    );
  }

  updateMessageRating(messageId: string, rating: 'up' | 'down' | null): Observable<void> {
    if (!this.apiUrl) {
      console.error('Database API URL not configured');
      return throwError(() => new Error('Database API URL not configured'));
    }

    const url = `${this.apiUrl}/messages/${encodeURIComponent(messageId)}/rating`;
    const body = { Rating: rating === null ? null : rating };
    console.log(`Calling API: PUT ${url}`, body);

    return this.http.put<void>(url, body, this.httpOptions).pipe(
      catchError(error => {
        console.error('Error updating message rating:', error);
        return throwError(() => error);
      })
    );
  }

  deleteSession(sessionId: string): Observable<void> {
    if (!this.apiUrl) {
      return throwError(() => new Error('Database API URL not configured'));
    }

    return this.http.delete<void>(`${this.apiUrl}/sessions/${encodeURIComponent(sessionId)}`, this.httpOptions).pipe(
      catchError(error => {
        console.error('Error deleting session:', error);
        return throwError(() => error);
      })
    );
  }

  getDocuments(): Observable<Document[]> {
    if (!this.apiUrl) {
      console.warn('Database API URL not configured');
      return of([]);
    }

    const url = `${this.apiUrl}/documents`;
    console.log(`Fetching documents from: ${url}`);
    
    return this.http.get<DocumentApiResponse[] | { value?: DocumentApiResponse[] }>(url, this.httpOptions).pipe(
      map(response => {
        const documents = Array.isArray(response) ? response : (response as { value?: DocumentApiResponse[] }).value || [];
        console.log(`Received ${documents.length} documents from API:`, documents);
        return documents.map(d => this.mapDocumentFromApi(d));
      }),
      catchError(error => {
        console.error('Error fetching documents:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          url: url
        });
        if (error.status === 404) {
          console.warn('Documents endpoint not found (404). The endpoint may not be implemented yet on the backend.');
        }
        return of([]);
      })
    );
  }

  private mapSessionFromApi(apiSession: SessionApiResponse): ChatSession {
    return {
      id: apiSession.sessionId,
      title: apiSession.title,
      messages: [],
      selectedDocumentIds: apiSession.selectedDocumentIds || [],
      createdAt: new Date(apiSession.createdAt),
      updatedAt: new Date(apiSession.updatedAt)
    };
  }

  private mapMessageFromApi(apiMessage: MessageApiResponse): ChatMessage {
    return {
      id: apiMessage.messageId,
      role: apiMessage.role as 'user' | 'assistant',
      content: apiMessage.content,
      timestamp: new Date(apiMessage.timestamp),
      rating: apiMessage.rating as 'up' | 'down' | undefined
    };
  }

  private mapDocumentFromApi(apiDocument: DocumentApiResponse): Document {
    const fileName = apiDocument.fileName || '';
    const fileExtension = apiDocument.fileExtension || '';
    const fullName = fileExtension ? `${fileName}.${fileExtension}` : fileName;
    
    return {
      id: apiDocument.documentId,
      name: fullName,
      type: fileExtension
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

