import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionService } from '../../services/session.service';
import { ChatSession } from '../../models/chat.models';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-session-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './session-list.component.html',
  styleUrls: ['./session-list.component.css'],
  host: {
    '[class.collapsed]': 'collapsed'
  }
})
export class SessionListComponent implements OnInit {
  @Input() collapsed = false;
  @Output() toggleSidebar = new EventEmitter<void>();
  sessions$: Observable<ChatSession[]>;
  currentSession$: Observable<ChatSession | null>;
  userName: string | null = null;
  userEmail: string | null = null;
  constructor(private sessionService: SessionService, private authService: AuthService) {
    this.sessions$ = this.sessionService.sessions$;
    this.currentSession$ = this.sessionService.currentSession$;
    this.userName = this.authService.getUserName();
    this.userEmail = this.authService.getUserEmail();
  }

  ngOnInit(): void {}

  createNewSession(): void {
    // Clear current session to prepare for new chat
    // Session will be created when user asks first question
    this.sessionService.setCurrentSession(null);
  }

  selectSession(session: ChatSession): void {
    this.sessionService.setCurrentSession(session);
  }

  deleteSession(event: Event, sessionId: string): void {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this session?')) {
      this.sessionService.deleteSession(sessionId);
    }
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  /**
   * Get user initials from name
   * Returns first letter of first name + first letter of last name
   * Filters out text in parentheses (e.g., "(Contractor)")
   */
  getInitials(): string {
    if (!this.userName) {
      return '?';
    }
    // Remove text in parentheses
    const cleanName = this.userName.replace(/\s*\([^)]*\)\s*/g, '').trim();
    const nameParts = cleanName.split(/\s+/).filter(part => part.length > 0);
    
    if (nameParts.length === 0) {
      return '?';
    }
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    }
    const firstInitial = nameParts[0].charAt(0).toUpperCase();
    const lastInitial = nameParts[nameParts.length - 1].charAt(0).toUpperCase();
    return firstInitial + lastInitial;
  }
}

