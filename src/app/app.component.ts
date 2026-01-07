import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionListComponent } from './components/session-list/session-list.component';
import { ChatComponent } from './components/chat/chat.component';
import { SessionService } from './services/session.service';
import { AuthService } from './services/auth.service';
import { Subject, takeUntil } from 'rxjs';
import { take } from 'rxjs/operators';
import { AuthenticationResult } from '@azure/msal-browser';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, SessionListComponent, ChatComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'NDASW Chatbot';
  sidebarCollapsed = false;
  isAuthenticated = false;
  hasAccess = false;
  isCheckingAccess = true;
  userName: string | null = null;
  userEmail: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private sessionService: SessionService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // First, handle redirect response if returning from authentication
    this.isCheckingAccess = true;
    this.authService.handleRedirectResponse().subscribe({
      next: (redirectResponse: AuthenticationResult | null) => {
        // Check initial authentication state (after redirect processing)
        this.isAuthenticated = this.authService.isAuthenticated();
        if (this.isAuthenticated) {
          this.userName = this.authService.getUserName();
          this.userEmail = this.authService.getUserEmail();
          this.checkAccess();
          this.isCheckingAccess = false;
        } else {
          // No redirect response or not authenticated, try auto-login
          this.autoLogin();
        }
      },
      error: (error: any) => {
        console.error('Error processing redirect response:', error);
        // Still try to check authentication state
        this.isAuthenticated = this.authService.isAuthenticated();
        if (this.isAuthenticated) {
          this.userName = this.authService.getUserName();
          this.userEmail = this.authService.getUserEmail();
          this.checkAccess();
        } else {
          this.autoLogin();
        }
        this.isCheckingAccess = false;
      }
    });

    this.authService.authState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAuthenticated => {
        this.isAuthenticated = isAuthenticated;
        this.userName = this.authService.getUserName();
        this.userEmail = this.authService.getUserEmail();
        this.checkAccess();
      });

    const savedState = localStorage.getItem('sidebarCollapsed');
    const isMobile = window.innerWidth < 768;
    
    if (savedState !== null) {
      this.sidebarCollapsed = savedState === 'true';
    } else {
      this.sidebarCollapsed = isMobile;
    }

    this.sessionService.sessions$
      .pipe(takeUntil(this.destroy$), take(1))
      .subscribe(sessions => {
        if (sessions.length > 0) {
          this.sessionService.currentSession$
            .pipe(take(1))
            .subscribe(current => {
              if (!current) {
                this.sessionService.setCurrentSession(sessions[0]);
              }
            });
        }
      });
    
    this.sessionService.sessions$
      .pipe(takeUntil(this.destroy$))
      .subscribe(sessions => {
        if (sessions.length === 0) {
          this.sessionService.currentSession$
            .pipe(take(1))
            .subscribe(current => {
              if (current) {
                this.sessionService.setCurrentSession(null);
              }
            });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  autoLogin(): void {
    this.isCheckingAccess = true;
    this.authService.autoLogin().subscribe({
      next: (result) => {
        console.log('Auto-login successful', result);
        this.isAuthenticated = true;
        this.userName = this.authService.getUserName();
        this.userEmail = this.authService.getUserEmail();
        this.checkAccess();
        this.isCheckingAccess = false;
      },
      error: (error) => {
        console.error('Auto-login failed', error);
        this.isAuthenticated = false;
        this.hasAccess = false;
        this.isCheckingAccess = false;
      }
    });
  }

  checkAccess(): void {
    const previousAccess = this.hasAccess;
    if (this.isAuthenticated) {
      // User is authorized if they have account info (email)
      this.hasAccess = this.authService.hasAccountInfo();
      // Reload sessions when access is granted (changed from false to true)
      if (this.hasAccess && !previousAccess) {
        this.sessionService.reloadSessions();
      }
    } else {
      this.hasAccess = false;
    }
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    localStorage.setItem('sidebarCollapsed', this.sidebarCollapsed.toString());
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    if (event.target.innerWidth < 768 && !this.sidebarCollapsed) {
      this.sidebarCollapsed = true;
      localStorage.setItem('sidebarCollapsed', 'true');
    }
  }
}

