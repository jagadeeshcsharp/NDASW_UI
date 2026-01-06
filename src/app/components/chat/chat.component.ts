import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ChatService } from '../../services/chat.service';
import { SessionService } from '../../services/session.service';
import { DocumentService } from '../../services/document.service';
import { DocumentSelectorComponent } from '../document-selector/document-selector.component';
import { ChatMessage, ChatSession, Document } from '../../models/chat.models';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, DocumentSelectorComponent],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;
  @Input() sidebarCollapsed = false;

  currentSession: ChatSession | null = null;
  messages: ChatMessage[] = [];
  question = '';
  loading = false;
  selectedDocumentIds: string[] = [];
  useN8n = true; // Toggle between n8n and .NET
  selectedRagSource: string = 'None';
  ragSourceOptions: string[] = ['None'];
  selectedRagSourceNames: string[] = []; // Display names for selected RAG sources
  allDocuments: Document[] = []; // Cache all documents for name lookup
  messageRatings: Map<string, 'up' | 'down' | null> = new Map();
  showDocumentSelector = false; // Show selector for new sessions

  private destroy$ = new Subject<void>();

  constructor(
    private chatService: ChatService,
    private sessionService: SessionService,
    private documentService: DocumentService
  ) {}

  ngOnInit(): void {
    // Load all documents for name lookup
    this.documentService.getMockDocuments().subscribe(documents => {
      this.allDocuments = documents;
      const fileNames = documents.map(doc => doc.name);
      this.ragSourceOptions = ['None', ...fileNames];
      // Update RAG source names when documents are loaded
      this.updateRagSourceNames();
    });

    this.sessionService.currentSession$
      .pipe(takeUntil(this.destroy$))
      .subscribe(session => {
        const wasNearBottom = this.isNearBottom();
        const previousMessageCount = this.messages.length;
        
        this.currentSession = session;
        this.messages = session?.messages || [];
        
        // Handle new chat scenario: when session becomes null, reset everything
        if (session === null) {
          // New chat clicked - clear previous selection and question
          this.selectedDocumentIds = [];
          this.selectedRagSourceNames = [];
          this.selectedRagSource = 'None';
          this.question = ''; // Clear any typed question
          this.showDocumentSelector = true; // Show selector for new chat
        } else {
          // Existing session: use session's selectedDocumentIds if available
          const sessionDocIds = session.selectedDocumentIds || [];
          if (sessionDocIds.length > 0) {
            this.selectedDocumentIds = [sessionDocIds[0]];
          } else {
            // Session exists but has no selectedDocumentIds - clear selection
            this.selectedDocumentIds = [];
          }
          // Hide selector for existing sessions
          this.showDocumentSelector = false;
        }
        
        // Update selected RAG source based on current selectedDocumentIds
        this.updateRagSourceNames();
        
        // Set selectedRagSource for backward compatibility (used in sendMessage)
        if (this.selectedDocumentIds.length > 0 && this.allDocuments.length > 0) {
          const selectedDoc = this.allDocuments.find(doc => doc.id === this.selectedDocumentIds[0]);
          this.selectedRagSource = selectedDoc?.name || 'None';
        } else {
          this.selectedRagSource = 'None';
        }
        
        // Load ratings from messages into the Map for quick access
        this.messageRatings.clear();
        this.messages.forEach(message => {
          if (message.rating) {
            this.messageRatings.set(message.id, message.rating);
          }
        });
        
        // Only scroll to bottom if:
        // 1. User was already near the bottom, OR
        // 2. A new message was added (message count increased)
        const newMessageAdded = this.messages.length > previousMessageCount;
        if (wasNearBottom || newMessageAdded) {
          setTimeout(() => this.scrollToBottom(), 0);
        }
      });
  }

  /**
   * Update the display names for selected RAG sources based on selectedDocumentIds
   */
  private updateRagSourceNames(): void {
    if (!this.selectedDocumentIds || this.selectedDocumentIds.length === 0 || this.allDocuments.length === 0) {
      this.selectedRagSourceNames = [];
      return;
    }

    // Single selection: only take the first document
    const selectedDocId = this.selectedDocumentIds[0];
    const doc = this.allDocuments.find(d => d.id === selectedDocId);
    this.selectedRagSourceNames = doc?.name ? [doc.name] : [];
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  sendMessage(): void {
    if (!this.question.trim() || this.loading) {
      return;
    }

    const questionText = this.question.trim();
    
    // Check if RAG source is selected (mandatory - single selection)
    if (this.selectedDocumentIds.length === 0) {
      alert('Please select a RAG source document before sending a message.');
      this.showDocumentSelector = true; // Show selector if hidden
      return;
    }

    // Create session only when first question is asked
    let sessionToUse = this.currentSession;
    if (!sessionToUse) {
      // Create new session with title from first question and selectedDocumentIds
      const sessionTitle = questionText.length > 50 ? questionText.substring(0, 50) + '...' : questionText;
      sessionToUse = this.sessionService.createSession(sessionTitle, this.selectedDocumentIds);
      
      // Don't manually set currentSession - let the observable handle it
      // The createSession method already calls setCurrentSession with selectedDocumentIds
      this.showDocumentSelector = false; // Hide selector after session is created
    }

    // Ensure sessionToUse is not null (TypeScript guard)
    if (!sessionToUse) {
      console.error('Failed to create or get session');
      return;
    }

    const userMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
      role: 'user',
      content: questionText
    };

    // Add user message immediately
    this.sessionService.addMessage(sessionToUse.id, userMessage);
    this.question = '';
    this.loading = true;

    // Prepare request - include selectedRagSource (single selection)
    // The request includes all necessary information for the n8n webhook:
    // - sessionId: For maintaining conversation context
    // - question: The user's question
    // - selectedDocumentIds: Single document ID array for RAG
    // - ragSource: Document name (single selection)
    const selectedDocId = this.selectedDocumentIds[0];
    const selectedDoc = this.allDocuments.find(doc => doc.id === selectedDocId);
    const ragSourceName = selectedDoc?.name || selectedDocId;
    
    const request = {
      sessionId: sessionToUse.id,
      question: questionText,
      selectedDocumentIds: this.selectedDocumentIds,
      ragSource: ragSourceName
    };

    // Log the request for debugging (including ragSource)
    console.log('Sending message to n8n webhook:', request);

    // Use real n8n webhook API (replaced mock response)
    // The ChatService handles:
    // - Response format conversion (handles various n8n response formats)
    // - Fallback to dummy response if webhook fails
    // - Error handling and logging
    this.chatService.sendMessage(request, this.useN8n).subscribe({
      next: (response) => {
        console.log('Response from n8n:', response);
        if (!sessionToUse) {
          console.error('Session is null when trying to add assistant message');
          this.loading = false;
          return;
        }
        const assistantMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
          role: 'assistant',
          content: response.answer
        };
        this.sessionService.addMessage(sessionToUse.id, assistantMessage);
        this.loading = false;
        setTimeout(() => this.scrollToBottom(), 0);
      },
      error: (error) => {
        // Error handler for edge cases (though ChatService now returns dummy response on failure)
        // This handler provides additional error context if needed
        console.error('Error sending message to n8n:', error);
        let errorMessage = 'Sorry, I encountered an error. Please try again.';
        
        // Provide more specific error messages based on HTTP status codes
        if (error.status === 0) {
          errorMessage = 'Unable to connect to the server. Please check your internet connection.';
        } else if (error.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (error.status === 404) {
          errorMessage = 'Webhook not found. Please check the configuration.';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        // Add error message to chat history
        if (!sessionToUse) {
          console.error('Session is null when trying to add error message');
          this.loading = false;
          return;
        }
        const errorMsg: Omit<ChatMessage, 'id' | 'timestamp'> = {
          role: 'assistant',
          content: errorMessage
        };
        this.sessionService.addMessage(sessionToUse.id, errorMsg);
        this.loading = false;
      }
    });
  }

  onDocumentSelectionChange(documentIds: string[]): void {
    if (documentIds.length === 0) {
      // Don't allow clearing selection - one is required
      return;
    }
    
    // Single selection: take only the first document
    this.selectedDocumentIds = [documentIds[0]];
    
    // Hide document selector after selection
    this.showDocumentSelector = false;
    
    // Update RAG source names for display (for header)
    this.updateRagSourceNames();
    
    // Set selectedRagSource for backward compatibility
    if (this.allDocuments.length > 0) {
      const selectedDoc = this.allDocuments.find(doc => doc.id === this.selectedDocumentIds[0]);
      this.selectedRagSource = selectedDoc?.name || 'None';
    }
    
    // Note: Session will be created when user asks first question
    // We don't create session here, just store the selection in component state
  }
  
  /**
   * Check if RAG source is required (for new sessions)
   * Note: Simplified - just check if document is selected
   */
  get isRagSourceRequired(): boolean {
    return this.selectedDocumentIds.length === 0;
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  scrollToBottom(): void {
    if (this.messagesContainer) {
      const element = this.messagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  isNearBottom(): boolean {
    if (!this.messagesContainer) {
      return true;
    }
    const element = this.messagesContainer.nativeElement;
    const threshold = 100; // pixels from bottom
    return element.scrollHeight - element.scrollTop - element.clientHeight < threshold;
  }


  /**
   * Rate a message with thumbs up or down
   * When a rating is selected, only that button is shown
   * Saves the rating to localStorage via SessionService
   */
  rateMessage(messageId: string, rating: 'up' | 'down'): void {
    if (!this.currentSession) {
      return;
    }

    const currentRating = this.messageRatings.get(messageId);
    let newRating: 'up' | 'down' | null;
    
    if (currentRating === rating) {
      // Toggle off if clicking the same rating - show both buttons again
      newRating = null;
      this.messageRatings.set(messageId, null);
    } else {
      // Set the new rating - only this button will be shown
      newRating = rating;
      this.messageRatings.set(messageId, rating);
    }

    // Save rating to localStorage via SessionService
    this.sessionService.updateMessageRating(this.currentSession.id, messageId, newRating);
  }

  getMessageRating(messageId: string): 'up' | 'down' | null {
    return this.messageRatings.get(messageId) || null;
  }

  /**
   * Check if a rating button should be shown
   * Only show the selected rating, or both if none selected
   */
  shouldShowRatingButton(messageId: string, rating: 'up' | 'down'): boolean {
    const currentRating = this.getMessageRating(messageId);
    return currentRating === null || currentRating === rating;
  }

}

