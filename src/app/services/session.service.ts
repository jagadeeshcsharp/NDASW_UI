import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
import { ChatSession, ChatMessage } from '../models/chat.models';
import { DatabaseService } from './database.service';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

const STORAGE_KEY = 'chatbot_sessions';

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private databaseService = inject(DatabaseService);
  private authService = inject(AuthService);
  private useDatabase = environment.useDatabase && !!environment.databaseApiUrl;

  private sessionsSubject = new BehaviorSubject<ChatSession[]>([]);
  private currentSessionSubject = new BehaviorSubject<ChatSession | null>(null);
  private messagesCache = new Map<string, ChatMessage[]>();

  public sessions$ = this.sessionsSubject.asObservable();
  public currentSession$ = this.currentSessionSubject.asObservable();

  constructor() {
    this.loadSessions();
  }

  /**
   * Load sessions from database or localStorage
   */
  private loadSessions(): void {
    if (this.useDatabase) {
      const userId = this.authService.getUserId();
      // For development/testing: use test user if not authenticated
      const effectiveUserId = userId || 'user@example.com';
      if (userId || !environment.production) {
        // Use database if authenticated, or if in development mode (for testing)
        console.log(`Loading sessions from database for user: ${effectiveUserId}`);
        this.loadSessionsFromDatabase(effectiveUserId);
      } else {
        // User not authenticated in production, use localStorage as fallback
        console.log('User not authenticated in production, using localStorage');
        this.loadSessionsFromLocalStorage();
      }
    } else {
      console.log('Database disabled, using localStorage');
      this.loadSessionsFromLocalStorage();
    }
  }

  /**
   * Load sessions from Azure SQL database
   */
  private loadSessionsFromDatabase(userId: string): void {
    console.log(`Fetching sessions from API for userId: ${userId}`);
    this.databaseService.getSessions(userId).subscribe({
      next: (sessions) => {
        console.log(`Loaded ${sessions.length} sessions from database`);
        // Load messages for each session in parallel (cost-effective batch operation)
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
            // All sessions now have their messages loaded
            this.sessionsSubject.next(sessions);
          },
          error: (error) => {
            console.error('Error loading sessions from database:', error);
            // Fallback to localStorage on error
            this.loadSessionsFromLocalStorage();
          }
        });
      },
      error: (error) => {
        console.error('Error loading sessions from database:', error);
        // Fallback to localStorage on error
        this.loadSessionsFromLocalStorage();
      }
    });
  }

  /**
   * Load sessions from localStorage (fallback)
   */
  private loadSessionsFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const sessions = JSON.parse(stored).map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
          messages: s.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
        }));
        this.sessionsSubject.next(sessions);
      }
    } catch (error) {
      console.error('Error loading sessions from localStorage:', error);
      this.sessionsSubject.next([]);
    }
  }

  /**
   * Save sessions to database or localStorage
   */
  private saveSession(session: ChatSession): void {
    if (this.useDatabase) {
      const userId = this.authService.getUserId();
      if (userId) {
        this.saveSessionToDatabase(session, userId);
      } else {
        // User not authenticated, use localStorage as fallback
        this.saveSessionsToLocalStorage();
      }
    } else {
      this.saveSessionsToLocalStorage();
    }
  }

  /**
   * Save session to database
   * NOTE: Selected documents are set during session creation and cannot be changed
   */
  private saveSessionToDatabase(session: ChatSession, userId: string): void {
    // Selected documents are set during session creation and cannot be updated
    // Only update local state if using localStorage fallback
    if (!this.useDatabase) {
      this.saveSessionsToLocalStorage();
    }
  }

  /**
   * Save all sessions to localStorage
   */
  private saveSessionsToLocalStorage(): void {
    try {
      const sessions = this.sessionsSubject.value;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error('Error saving sessions to localStorage:', error);
    }
  }

  /**
   * Create a new session
   */
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

    if (this.useDatabase) {
      const userId = this.authService.getUserId();
      // For development/testing: use test user if not authenticated
      const effectiveUserId = userId || (environment.production ? null : 'user@example.com');
      if (effectiveUserId) {
        this.databaseService.createSession(effectiveUserId, sessionId, session.title, selectedDocumentIds).subscribe({
          next: (createdSession) => {
            // Update the created session with selectedDocumentIds
            const sessionWithDocs = {
              ...createdSession,
              selectedDocumentIds: selectedDocumentIds || []
            };
            // Update session in the list if it exists
            const sessions = this.sessionsSubject.value;
            const updatedSessions = sessions.map(s => 
              s.id === sessionId ? sessionWithDocs : s
            );
            if (!sessions.some(s => s.id === sessionId)) {
              updatedSessions.unshift(sessionWithDocs);
            }
            this.sessionsSubject.next(updatedSessions);
            this.setCurrentSession(sessionWithDocs);
          },
          error: (error) => {
            console.error('Error creating session in database:', error);
            // Fallback: add to local state
            this.setCurrentSession(session);
          }
        });
        return session; // Return immediately, will be set as current when API responds
      }
    }

    // Use localStorage or not authenticated
    this.setCurrentSession(session);
    return session;
  }

  /**
   * Move session to top (local operation only, order managed by database)
   */
  moveSessionToTop(sessionId: string): void {
    const sessions = this.sessionsSubject.value;
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    
    if (sessionIndex > 0 && !this.useDatabase) {
      // Only reorder if using localStorage (database manages order by UpdatedAt)
      const session = sessions[sessionIndex];
      const updatedSessions = [
        session,
        ...sessions.slice(0, sessionIndex),
        ...sessions.slice(sessionIndex + 1)
      ];
      this.sessionsSubject.next(updatedSessions);
      this.saveSessionsToLocalStorage();
    }
  }

  /**
   * Set current session
   */
  setCurrentSession(session: ChatSession | null): void {
    if (session && this.useDatabase && !this.messagesCache.has(session.id)) {
      // Load messages if not cached
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

  /**
   * Update session metadata
   * NOTE: Selected documents can only be set during initial session creation (when no messages exist)
   */
  updateSession(sessionId: string, updates: Partial<ChatSession>): void {
    const currentSession = this.currentSessionSubject.value;
    let sessions = this.sessionsSubject.value;
    
    // Allow updating selectedDocumentIds only if session has no messages (new session)
    if (updates.selectedDocumentIds !== undefined) {
      const session = sessions.find(s => s.id === sessionId);
      if (session && session.messages.length > 0) {
        console.warn('Cannot update selected documents after messages are sent');
        const { selectedDocumentIds, ...restUpdates } = updates;
        updates = restUpdates;
      } else if (!session && currentSession?.id === sessionId) {
        // If session is not in the list yet (new session), add it when documents are selected
        const newSession = {
          ...currentSession,
          ...updates,
          updatedAt: new Date()
        };
        sessions = [newSession, ...sessions];
        this.sessionsSubject.next(sessions);
        
        // Update current session
        this.currentSessionSubject.next(newSession);
        
        // Save to localStorage if not using database
        if (!this.useDatabase) {
          this.saveSession(newSession);
        }
        
        return; // Early return since we've handled the update
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
      // Update current session if it's the one being updated
      if (currentSession?.id === sessionId) {
        this.currentSessionSubject.next(updatedSession);
      }
      
      // Save to localStorage if not using database
      if (!this.useDatabase) {
        this.saveSession(updatedSession);
      }
    }

    const current = this.currentSessionSubject.value;
    if (current?.id === sessionId) {
      this.currentSessionSubject.next(updatedSession || null);
    }
  }

  /**
   * Add a message to a session
   */
  addMessage(sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): void {
    const current = this.currentSessionSubject.value;
    let sessions = this.sessionsSubject.value;

    // Check if session exists in the list
    const sessionExists = sessions.some(s => s.id === sessionId);

    // If session doesn't exist in list and this is the first user message, add it to the list
    if (!sessionExists && message.role === 'user' && current?.id === sessionId) {
      const messageId = this.generateId();
      const newMessage: ChatMessage = {
        ...message,
        id: messageId,
        timestamp: new Date()
      };

      const newSession: ChatSession = {
        ...current,
        messages: [newMessage],
        // Use existing title if set, otherwise use first 50 chars of message
        title: current.title && current.title !== 'New Chat' ? current.title : (message.content.substring(0, 50) || 'New Chat'),
        // Preserve selectedDocumentIds from current session
        selectedDocumentIds: current.selectedDocumentIds || [],
        updatedAt: new Date()
      };

      if (this.useDatabase) {
        const userId = this.authService.getUserId();
        // For development/testing: use test user if not authenticated
        const effectiveUserId = userId || (environment.production ? null : 'user@example.com');
        if (effectiveUserId) {
          // Save message to database - this will return the actual messageId from database
          console.log(`💾 Saving first message to database: sessionId=${sessionId}, role=${message.role}`);
          this.databaseService.addMessage(sessionId, message).subscribe({
            next: (savedMessage) => {
              console.log(`✅ First message saved to database: messageId=${savedMessage.id}`);
              // Replace temporary message with saved message (which has the correct ID from database)
              const updatedNewSession: ChatSession = {
                ...newSession,
                messages: [savedMessage] // Use the saved message with correct ID
              };
              this.messagesCache.set(sessionId, [savedMessage]);
              sessions = [updatedNewSession, ...sessions];
              this.sessionsSubject.next(sessions);
              this.setCurrentSession(updatedNewSession);
            },
            error: (error) => {
              console.error('❌ Error adding first message to database:', error);
              // Fallback: add locally
              sessions = [newSession, ...sessions];
              this.sessionsSubject.next(sessions);
              this.saveSessionsToLocalStorage();
              this.setCurrentSession(newSession);
            }
          });
        } else {
          // Not authenticated, use localStorage
          sessions = [newSession, ...sessions];
          this.sessionsSubject.next(sessions);
          this.saveSessionsToLocalStorage();
          this.setCurrentSession(newSession);
        }
      } else {
        // Using localStorage
        sessions = [newSession, ...sessions];
        this.sessionsSubject.next(sessions);
        this.saveSessionsToLocalStorage();
        this.setCurrentSession(newSession);
      }
      return;
    }

    // Update the session with the new message (session already exists in list)
    // Generate temporary ID for immediate UI update
    const tempMessageId = this.generateId();
    const tempMessage: ChatMessage = {
      ...message,
      id: tempMessageId,
      timestamp: new Date()
    };

    // Update UI immediately with temporary message
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

    if (this.useDatabase) {
      const userId = this.authService.getUserId();
      // For development/testing: use test user if not authenticated
      const effectiveUserId = userId || (environment.production ? null : 'user@example.com');
      if (effectiveUserId) {
        // Save message to database - this will return the actual messageId from database
        console.log(`💾 Saving message to database: sessionId=${sessionId}, role=${message.role}`);
        this.databaseService.addMessage(sessionId, message).subscribe({
          next: (savedMessage) => {
            console.log(`✅ Message saved to database: messageId=${savedMessage.id}`);
            // Replace temporary message with saved message (which has the correct ID from database)
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
            
            // Update cache with correct message ID
            const cachedMessages = this.messagesCache.get(sessionId) || [];
            this.messagesCache.set(sessionId, [...cachedMessages, savedMessage]);
            
            // Update current session if it's the one being modified
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
            // Keep the temporary message in UI, but log the error
            // Fallback to localStorage
            this.saveSessionsToLocalStorage();
          }
        });
        // Update session metadata
        const updatedSession = sessions.find(s => s.id === sessionId);
        if (updatedSession) {
          this.saveSession(updatedSession);
        }
      } else {
        this.saveSessionsToLocalStorage();
      }
    } else {
      this.saveSessionsToLocalStorage();
    }

    // Move session to top when a user message is added
    if (message.role === 'user' && !this.useDatabase) {
      this.moveSessionToTop(sessionId);
    }

    // Update current session if it's the one being modified
    if (current?.id === sessionId) {
      const updatedSession = sessions.find(s => s.id === sessionId);
      if (updatedSession) {
        this.currentSessionSubject.next(updatedSession);
      }
    }
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): void {
    const sessions = this.sessionsSubject.value.filter(s => s.id !== sessionId);
    this.sessionsSubject.next(sessions);
    this.messagesCache.delete(sessionId);

    if (this.useDatabase) {
      this.databaseService.deleteSession(sessionId).subscribe({
        error: (error) => {
          console.error('Error deleting session from database:', error);
          // Fallback to localStorage
          this.saveSessionsToLocalStorage();
        }
      });
    } else {
      this.saveSessionsToLocalStorage();
    }

    const current = this.currentSessionSubject.value;
    if (current?.id === sessionId) {
      // If deleted session was current, set to first remaining session or null
      if (sessions.length > 0) {
        this.setCurrentSession(sessions[0]);
      } else {
        // All sessions deleted - clear current session to allow new chat
        this.currentSessionSubject.next(null);
      }
    }
  }

  /**
   * Update selected documents for a session
   * NOTE: This functionality has been removed - selected documents cannot be changed after session creation
   */
  updateSelectedDocuments(sessionId: string, documentIds: string[]): void {
    // Selected documents cannot be changed after session creation
    console.warn('Cannot update selected documents after session creation');
  }

  /**
   * Update message rating
   */
  updateMessageRating(sessionId: string, messageId: string, rating: 'up' | 'down' | null): void {
    // Update local state immediately
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

    if (this.useDatabase) {
      // Save rating to database
      console.log(`Saving rating to database: messageId=${messageId}, rating=${rating}`);
      this.databaseService.updateMessageRating(messageId, rating).subscribe({
        next: () => {
          console.log(`✅ Rating saved successfully to database: messageId=${messageId}, rating=${rating}`);
        },
        error: (error) => {
          console.error('❌ Error updating message rating in database:', error);
          // Fallback to localStorage
          this.saveSessionsToLocalStorage();
        }
      });
    } else {
      this.saveSessionsToLocalStorage();
    }

    // Update current session if it's the one being modified
    const current = this.currentSessionSubject.value;
    if (current?.id === sessionId) {
      const updatedSession = sessions.find(s => s.id === sessionId);
      if (updatedSession) {
        this.currentSessionSubject.next(updatedSession);
      }
    }
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
