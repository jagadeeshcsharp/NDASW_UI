import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, of, throwError } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { ChatSession, ChatMessage } from '../models/chat.models';
import { DatabaseService } from './database.service';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private databaseService = inject(DatabaseService);
  private authService = inject(AuthService);

  private sessionsSubject = new BehaviorSubject<ChatSession[]>([]);
  private currentSessionSubject = new BehaviorSubject<ChatSession | null>(null);
  private messagesCache = new Map<string, ChatMessage[]>();
  private pendingSessionCreations = new Set<string>();

  public sessions$ = this.sessionsSubject.asObservable();
  public currentSession$ = this.currentSessionSubject.asObservable();

  constructor() {
    this.loadSessions();
  }

  private loadSessions(): void {
    const userId = this.authService.getUserId();
    const effectiveUserId = userId || 'user@example.com';
    console.log(`Loading sessions from database for user: ${effectiveUserId}`);
    this.loadSessionsFromDatabase(effectiveUserId);
  }

  private loadSessionsFromDatabase(userId: string): void {
    console.log(`Fetching sessions from API for userId: ${userId}`);
    this.databaseService.getSessions(userId).subscribe({
      next: (sessions) => {
        console.log(`Loaded ${sessions.length} sessions from database`);
        if (sessions.length === 0) {
          this.sessionsSubject.next([]);
          return;
        }

        const messageObservables = sessions.map(session =>
          this.databaseService.getSessionMessages(session.id).pipe(
            tap(messages => {
              this.messagesCache.set(session.id, messages);
              session.messages = messages;
            }),
            catchError(error => {
              console.error(`Error loading messages for session ${session.id}:`, error);
              return of([]);
            })
          )
        );

        forkJoin(messageObservables).subscribe({
          next: () => {
            this.sessionsSubject.next(sessions);
          },
          error: (error) => {
            console.error('Error loading sessions from database:', error);
            this.sessionsSubject.next([]);
          }
        });
      },
      error: (error) => {
        console.error('Error loading sessions from database:', error);
        this.sessionsSubject.next([]);
      }
    });
  }

  createSession(title?: string, selectedDocumentIds?: string[]): ChatSession {
    const sessionId = this.generateId();
    const session: ChatSession = {
      id: sessionId,
      title: title || 'New Chat',
      messages: [],
      selectedDocumentIds: selectedDocumentIds || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const sessions = this.sessionsSubject.value;
    if (!sessions.some(s => s.id === sessionId)) {
      this.sessionsSubject.next([session, ...sessions]);
    }

    const userId = this.authService.getUserId();
    const effectiveUserId = userId || 'user@example.com';
    this.pendingSessionCreations.add(sessionId);
    this.databaseService.createSession(effectiveUserId, sessionId, session.title, selectedDocumentIds).subscribe({
      next: (createdSession) => {
        this.pendingSessionCreations.delete(sessionId);
        const sessionWithDocs = {
          ...createdSession,
          selectedDocumentIds: selectedDocumentIds || []
        };
        const currentSessions = this.sessionsSubject.value;
        const updatedSessions = currentSessions.map(s => 
          s.id === sessionId ? sessionWithDocs : s
        );
        this.sessionsSubject.next(updatedSessions);
        this.setCurrentSession(sessionWithDocs);
      },
      error: (error) => {
        this.pendingSessionCreations.delete(sessionId);
        const errorMessage = error.error?.message || '';
        if (errorMessage.includes('PRIMARY KEY constraint') || 
            errorMessage.includes('duplicate key') ||
            errorMessage.includes('already exists')) {
          console.log(`Session ${sessionId} already exists in database - continuing`);
          this.setCurrentSession(session);
        } else {
          console.error('Error creating session in database:', error);
          this.setCurrentSession(session);
        }
      }
    });
    this.setCurrentSession(session);
    return session;
  }

  private ensureSessionExists(session: ChatSession): Observable<ChatSession> {
    if (this.pendingSessionCreations.has(session.id)) {
      return new Observable(observer => {
        const maxWaitTime = 5000;
        const startTime = Date.now();
        const checkInterval = setInterval(() => {
          if (!this.pendingSessionCreations.has(session.id)) {
            clearInterval(checkInterval);
            observer.next(session);
            observer.complete();
          } else if (Date.now() - startTime > maxWaitTime) {
            clearInterval(checkInterval);
            console.warn(`Session creation timeout for ${session.id}, proceeding anyway`);
            observer.next(session);
            observer.complete();
          }
        }, 100);
      });
    }

    const userId = this.authService.getUserId();
    const effectiveUserId = userId || 'user@example.com';
    this.pendingSessionCreations.add(session.id);
    
    return this.databaseService.createSession(
      effectiveUserId,
      session.id,
      session.title,
      session.selectedDocumentIds
    ).pipe(
      map(createdSession => {
        this.pendingSessionCreations.delete(session.id);
        return {
          ...createdSession,
          selectedDocumentIds: session.selectedDocumentIds || []
        };
      }),
      catchError(error => {
        this.pendingSessionCreations.delete(session.id);
        const errorMessage = error.error?.message || '';
        if (error.status === 409 || 
            errorMessage.includes('already exists') || 
            errorMessage.includes('PRIMARY KEY constraint') ||
            errorMessage.includes('duplicate key')) {
          console.log(`Session ${session.id} already exists in database`);
          return of(session);
        }
        console.error('Error ensuring session exists:', error);
        if (errorMessage.includes('too many arguments')) {
          console.error('Backend stored procedure error - session creation failed');
          return throwError(() => new Error('Session creation failed: Backend stored procedure error'));
        }
        return throwError(() => error);
      })
    );
  }

  setCurrentSession(session: ChatSession | null): void {
    if (session && !this.messagesCache.has(session.id)) {
      this.databaseService.getSessionMessages(session.id).subscribe({
        next: (messages) => {
          this.messagesCache.set(session.id, messages);
          session.messages = messages;
          this.currentSessionSubject.next(session);
        },
        error: (error) => {
          console.error('Error loading messages:', error);
          this.currentSessionSubject.next(session);
        }
      });
    } else {
      this.currentSessionSubject.next(session);
    }
  }

  updateSession(sessionId: string, updates: Partial<ChatSession>): void {
    const currentSession = this.currentSessionSubject.value;
    let sessions = this.sessionsSubject.value;
    
    if (updates.selectedDocumentIds !== undefined) {
      const session = sessions.find(s => s.id === sessionId);
      if (session && session.messages.length > 0) {
        console.warn('Cannot update selected documents after messages are sent');
        const { selectedDocumentIds, ...restUpdates } = updates;
        updates = restUpdates;
      } else if (!session && currentSession?.id === sessionId) {
        const newSession = {
          ...currentSession,
          ...updates,
          updatedAt: new Date()
        };
        sessions = [newSession, ...sessions];
        this.sessionsSubject.next(sessions);
        this.currentSessionSubject.next(newSession);
        return;
      }
    }

    sessions = sessions.map(s =>
      s.id === sessionId
        ? { ...s, ...updates, updatedAt: new Date() }
        : s
    );
    this.sessionsSubject.next(sessions);

    const updatedSession = sessions.find(s => s.id === sessionId);
    if (updatedSession) {
      if (currentSession?.id === sessionId) {
        this.currentSessionSubject.next(updatedSession);
      }
    }

    const current = this.currentSessionSubject.value;
    if (current?.id === sessionId) {
      this.currentSessionSubject.next(updatedSession || null);
    }
  }

  addMessage(sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): void {
    const current = this.currentSessionSubject.value;
    let sessions = this.sessionsSubject.value;

    const session = sessions.find(s => s.id === sessionId) || current;

    if (!session) {
      console.error(`Session ${sessionId} not found`);
      return;
    }

    const tempMessageId = this.generateId();
    const tempMessage: ChatMessage = {
      ...message,
      id: tempMessageId,
      timestamp: new Date()
    };

    const sessionExists = sessions.some(s => s.id === sessionId);
    if (!sessionExists) {
      const newSession: ChatSession = {
        ...session,
        messages: [tempMessage],
        title: session.title && session.title !== 'New Chat' ? session.title : (message.content.substring(0, 50) || 'New Chat'),
        selectedDocumentIds: session.selectedDocumentIds || [],
        updatedAt: new Date()
      };
      sessions = [newSession, ...sessions];
      this.sessionsSubject.next(sessions);
      this.setCurrentSession(newSession);
    } else {
      sessions = sessions.map(s => {
        if (s.id === sessionId) {
          const updatedMessages = [...s.messages, tempMessage];
          return {
            ...s,
            messages: updatedMessages,
            updatedAt: new Date(),
            title: s.messages.length === 0 && message.role === 'user'
              ? message.content.substring(0, 50) || 'New Chat'
              : s.title
          };
        }
        return s;
      });
      this.sessionsSubject.next(sessions);
    }

    const currentSession = sessions.find(s => s.id === sessionId) || session;
    
    this.ensureSessionExists(currentSession).pipe(
      switchMap(() => {
        console.log(`💾 Saving message to database: sessionId=${sessionId}, role=${message.role}`);
        return this.databaseService.addMessage(sessionId, message);
      })
    ).subscribe({
      next: (savedMessage) => {
        console.log(`✅ Message saved to database: messageId=${savedMessage.id}`);
        sessions = this.sessionsSubject.value.map(s => {
          if (s.id === sessionId) {
            const updatedMessages = s.messages.map(m => 
              m.id === tempMessageId ? savedMessage : m
            );
            return {
              ...s,
              messages: updatedMessages
            };
          }
          return s;
        });
        this.sessionsSubject.next(sessions);
        
        const cachedMessages = this.messagesCache.get(sessionId) || [];
        this.messagesCache.set(sessionId, [...cachedMessages, savedMessage]);
        
        const current = this.currentSessionSubject.value;
        if (current?.id === sessionId) {
          const updatedSession = sessions.find(s => s.id === sessionId);
          if (updatedSession) {
            this.currentSessionSubject.next(updatedSession);
          }
        }
      },
      error: (error) => {
        console.error('❌ Error adding message to database:', error);
        const errorMessage = error.error?.message || '';
        if (errorMessage.includes('FOREIGN KEY') || errorMessage.includes('SessionId')) {
          console.error('Session does not exist in database. Attempting to create session first...');
          const sessionToCreate = sessions.find(s => s.id === sessionId) || session;
          this.ensureSessionExists(sessionToCreate).pipe(
            switchMap(() => {
              console.log(`💾 Retrying: Saving message to database: sessionId=${sessionId}, role=${message.role}`);
              return this.databaseService.addMessage(sessionId, message);
            })
          ).subscribe({
            next: (savedMessage) => {
              console.log(`✅ Message saved to database after retry: messageId=${savedMessage.id}`);
              sessions = this.sessionsSubject.value.map(s => {
                if (s.id === sessionId) {
                  const updatedMessages = s.messages.map(m => 
                    m.id === tempMessageId ? savedMessage : m
                  );
                  return {
                    ...s,
                    messages: updatedMessages
                  };
                }
                return s;
              });
              this.sessionsSubject.next(sessions);
              
              const cachedMessages = this.messagesCache.get(sessionId) || [];
              this.messagesCache.set(sessionId, [...cachedMessages, savedMessage]);
              
              const current = this.currentSessionSubject.value;
              if (current?.id === sessionId) {
                const updatedSession = sessions.find(s => s.id === sessionId);
                if (updatedSession) {
                  this.currentSessionSubject.next(updatedSession);
                }
              }
            },
            error: (retryError) => {
              console.error('❌ Error adding message to database after retry:', retryError);
            }
          });
        } else {
          console.error('❌ Failed to save message. Error details:', errorMessage);
        }
      }
    });

    if (current?.id === sessionId) {
      const updatedSession = sessions.find(s => s.id === sessionId);
      if (updatedSession) {
        this.currentSessionSubject.next(updatedSession);
      }
    }
  }

  deleteSession(sessionId: string): void {
    const sessions = this.sessionsSubject.value.filter(s => s.id !== sessionId);
    this.sessionsSubject.next(sessions);
    this.messagesCache.delete(sessionId);

    this.databaseService.deleteSession(sessionId).subscribe({
      error: (error) => {
        console.error('Error deleting session from database:', error);
      }
    });

    const current = this.currentSessionSubject.value;
    if (current?.id === sessionId) {
      if (sessions.length > 0) {
        this.setCurrentSession(sessions[0]);
      } else {
        this.currentSessionSubject.next(null);
      }
    }
  }

  updateMessageRating(sessionId: string, messageId: string, rating: 'up' | 'down' | null): void {
    const sessions = this.sessionsSubject.value.map(s => {
      if (s.id === sessionId) {
        const updatedMessages = s.messages.map(m => {
          if (m.id === messageId) {
            return {
              ...m,
              rating: rating || undefined
            };
          }
          return m;
        });
        return {
          ...s,
          messages: updatedMessages,
          updatedAt: new Date()
        };
      }
      return s;
    });

    this.sessionsSubject.next(sessions);

    console.log(`Saving rating to database: messageId=${messageId}, rating=${rating}`);
    this.databaseService.updateMessageRating(messageId, rating).subscribe({
      next: () => {
        console.log(`✅ Rating saved successfully to database: messageId=${messageId}, rating=${rating}`);
      },
      error: (error) => {
        console.error('❌ Error updating message rating in database:', error);
      }
    });

    const current = this.currentSessionSubject.value;
    if (current?.id === sessionId) {
      const updatedSession = sessions.find(s => s.id === sessionId);
      if (updatedSession) {
        this.currentSessionSubject.next(updatedSession);
      }
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
