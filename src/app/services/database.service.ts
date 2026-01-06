import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ChatSession, ChatMessage } from '../models/chat.models';
import { environment } from '../../environments/environment';

export interface SessionApiResponse {
  sessionId: string;
  userId: string;
  title: string;
  selectedDocumentIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MessageApiResponse {
  messageId: string;
  sessionId: string;
  role: string;
  content: string;
  rating: string | null;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private apiUrl = environment.databaseApiUrl;
  
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  /**
   * Get all sessions for a user
   */
  getSessions(userId: string): Observable<ChatSession[]> {
    if (!this.apiUrl) {
      console.warn('Database API URL not configured');
      return of([]);
    }

    return this.http.get<SessionApiResponse[]>(`${this.apiUrl}/sessions/${encodeURIComponent(userId)}`, this.httpOptions).pipe(
      map(sessions => sessions.map(s => this.mapSessionFromApi(s))),
      catchError(error => {
        console.error('Error fetching sessions:', error);
        return of([]);
      })
    );
  }

  /**
   * Get messages for a session
   */
  getSessionMessages(sessionId: string): Observable<ChatMessage[]> {
    if (!this.apiUrl) {
      console.warn('Database API URL not configured');
      return of([]);
    }

    return this.http.get<MessageApiResponse[]>(`${this.apiUrl}/sessions/${encodeURIComponent(sessionId)}/messages`, this.httpOptions).pipe(
      map(messages => messages.map(m => this.mapMessageFromApi(m))),
      catchError(error => {
        console.error('Error fetching messages:', error);
        return of([]);
      })
    );
  }

  /**
   * Create a new session
   */
  createSession(userId: string, sessionId: string, title: string, selectedDocumentIds?: string[]): Observable<ChatSession> {
    if (!this.apiUrl) {
      return throwError(() => new Error('Database API URL not configured'));
    }

    return this.http.post<SessionApiResponse>(`${this.apiUrl}/sessions`, {
      sessionId,
      userId,
      title,
      selectedDocumentIds: selectedDocumentIds || []
    }, this.httpOptions).pipe(
      map(response => this.mapSessionFromApi(response)),
      catchError(error => {
        console.error('Error creating session:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Add a message to a session
   */
  addMessage(sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): Observable<ChatMessage> {
    if (!this.apiUrl) {
      return throwError(() => new Error('Database API URL not configured'));
    }

    const messageId = this.generateId();
    return this.http.post<MessageApiResponse>(`${this.apiUrl}/sessions/${encodeURIComponent(sessionId)}/messages`, {
      messageId,
      role: message.role,
      content: message.content,
      rating: message.rating || null
    }, this.httpOptions).pipe(
      map(response => this.mapMessageFromApi(response)),
      catchError(error => {
        console.error('Error adding message:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Update message rating
   */
  updateMessageRating(messageId: string, rating: 'up' | 'down' | null): Observable<void> {
    if (!this.apiUrl) {
      console.error('❌ Database API URL not configured');
      return throwError(() => new Error('Database API URL not configured'));
    }

    const url = `${this.apiUrl}/messages/${encodeURIComponent(messageId)}/rating`;
    // Explicitly handle null - send null string or null value
    const body = { rating: rating === null ? null : rating };
    console.log(`📡 Calling API: PUT ${url}`, body);

    return this.http.put<void>(url, body, this.httpOptions).pipe(
      catchError(error => {
        console.error('❌ Error updating message rating:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          url: url
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Update session
   * NOTE: This functionality has been removed - selected documents cannot be changed after session creation
   * Session updates are no longer supported to prevent changing RAG sources after selection
   */
  // updateSession method removed - sessions cannot be updated after creation

  /**
   * Delete a session
   */
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

  /**
   * Map API response to ChatSession model
   */
  private mapSessionFromApi(apiSession: SessionApiResponse): ChatSession {
    return {
      id: apiSession.sessionId,
      title: apiSession.title,
      messages: [], // Messages are loaded separately
      selectedDocumentIds: apiSession.selectedDocumentIds || [],
      createdAt: new Date(apiSession.createdAt),
      updatedAt: new Date(apiSession.updatedAt)
    };
  }

  /**
   * Map API response to ChatMessage model
   */
  private mapMessageFromApi(apiMessage: MessageApiResponse): ChatMessage {
    return {
      id: apiMessage.messageId,
      role: apiMessage.role as 'user' | 'assistant',
      content: apiMessage.content,
      timestamp: new Date(apiMessage.timestamp),
      rating: apiMessage.rating as 'up' | 'down' | undefined
    };
  }

  /**
   * Generate a unique ID (same format as SessionService)
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

