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
  selectedRagSourceNames: string[] = [];
  allDocuments: Document[] = [];
  messageRatings: Map<string, 'up' | 'down' | null> = new Map();
  showDocumentSelector = false;

  private destroy$ = new Subject<void>();

  constructor(
    private chatService: ChatService,
    private sessionService: SessionService,
    private documentService: DocumentService
  ) {}

  ngOnInit(): void {
    this.documentService.getDocuments().subscribe(documents => {
      this.allDocuments = documents;
      this.updateRagSourceNames();
    });

    this.sessionService.currentSession$
      .pipe(takeUntil(this.destroy$))
      .subscribe(session => {
        const wasNearBottom = this.isNearBottom();
        const previousMessageCount = this.messages.length;
        
        this.currentSession = session;
        this.messages = session?.messages || [];
        
        if (session === null) {
          this.selectedDocumentIds = [];
          this.selectedRagSourceNames = [];
          this.question = '';
          this.showDocumentSelector = true;
        } else {
          const sessionDocIds = session.selectedDocumentIds || [];
          if (sessionDocIds.length > 0) {
            this.selectedDocumentIds = [sessionDocIds[0]];
          } else {
            this.selectedDocumentIds = [];
          }
          this.showDocumentSelector = false;
        }
        
        this.updateRagSourceNames();
        
        this.messageRatings.clear();
        this.messages.forEach(message => {
          if (message.rating) {
            this.messageRatings.set(message.id, message.rating);
          }
        });
        
        const newMessageAdded = this.messages.length > previousMessageCount;
        if (wasNearBottom || newMessageAdded) {
          setTimeout(() => this.scrollToBottom(), 0);
        }
      });
  }

  private updateRagSourceNames(): void {
    if (!this.selectedDocumentIds || this.selectedDocumentIds.length === 0 || this.allDocuments.length === 0) {
      this.selectedRagSourceNames = [];
      return;
    }

    const selectedDocId = this.selectedDocumentIds[0];
    const doc = this.allDocuments.find(d => d.id === selectedDocId);
    this.selectedRagSourceNames = doc?.name ? [doc.name] : [];
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setExamplePrompt(prompt: string): void {
    this.question = prompt;
    this.messageInput.nativeElement.focus();
  }

  sendMessage(): void {
    if (!this.question.trim() || this.loading) {
      return;
    }

    const questionText = this.question.trim();
    
    if (this.selectedDocumentIds.length === 0) {
      alert('Please select a RAG source document before sending a message.');
      this.showDocumentSelector = true;
      return;
    }

    let sessionToUse = this.currentSession;
    if (!sessionToUse) {
      const sessionTitle = questionText.length > 50 ? questionText.substring(0, 50) + '...' : questionText;
      sessionToUse = this.sessionService.createSession(sessionTitle, this.selectedDocumentIds);
      this.showDocumentSelector = false;
    }

    if (!sessionToUse) {
      console.error('Failed to create or get session');
      return;
    }

    const userMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
      role: 'user',
      content: questionText
    };

    this.sessionService.addMessage(sessionToUse.id, userMessage);
    this.question = '';
    this.loading = true;

    const selectedDocId = this.selectedDocumentIds[0];
    const selectedDoc = this.allDocuments.find(doc => doc.id === selectedDocId);
    const ragSourceName = selectedDoc?.name || selectedDocId;
    
    const request = {
      sessionId: sessionToUse.id,
      question: questionText,
      selectedDocumentIds: this.selectedDocumentIds,
      ragSource: ragSourceName
    };

    console.log('Sending message to n8n webhook:', request);

    this.chatService.sendMessage(request).subscribe({
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
        console.error('Error sending message to n8n:', error);
        let errorMessage = 'Sorry, I encountered an error. Please try again.';
        
        if (error.status === 0) {
          errorMessage = 'Unable to connect to the server. Please check your internet connection.';
        } else if (error.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (error.status === 404) {
          errorMessage = 'Webhook not found. Please check the configuration.';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
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
      return;
    }
    
    this.selectedDocumentIds = [documentIds[0]];
    this.showDocumentSelector = false;
    this.updateRagSourceNames();
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


  rateMessage(messageId: string, rating: 'up' | 'down'): void {
    if (!this.currentSession) {
      return;
    }

    const currentRating = this.messageRatings.get(messageId);
    let newRating: 'up' | 'down' | null;
    
    if (currentRating === rating) {
      newRating = null;
      this.messageRatings.set(messageId, null);
    } else {
      newRating = rating;
      this.messageRatings.set(messageId, rating);
    }

    this.sessionService.updateMessageRating(this.currentSession.id, messageId, newRating);
  }

  getMessageRating(messageId: string): 'up' | 'down' | null {
    return this.messageRatings.get(messageId) || null;
  }

  shouldShowRatingButton(messageId: string, rating: 'up' | 'down'): boolean {
    const currentRating = this.getMessageRating(messageId);
    return currentRating === null || currentRating === rating;
  }

}

