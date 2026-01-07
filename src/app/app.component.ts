import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionListComponent } from './components/session-list/session-list.component';
import { ChatComponent } from './components/chat/chat.component';
import { SessionService } from './services/session.service';
import { AuthService } from './services/auth.service';
import { DatabaseService } from './services/database.service';
import { Subject, takeUntil } from 'rxjs';
import { take } from 'rxjs/operators';

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
  isAuthorized = false;
  userName: string | null = null;
  private destroy$ = new Subject<void>();
  private authorizationChecked = false;

  constructor(
    private sessionService: SessionService,
    private authService: AuthService,
    private databaseService: DatabaseService
  ) {}

  ngOnInit(): void {
    // Initialize automatic login on page load
    this.initializeAuthentication();

    // Subscribe to auth state changes
    this.authService.authState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAuthenticated => {
        this.isAuthenticated = isAuthenticated;
        this.userName = this.authService.getUserName();
        
        if (isAuthenticated && !this.authorizationChecked) {
          this.checkAuthorization();
        } else if (!isAuthenticated) {
          this.isAuthorized = false;
        }
      });

    const savedState = localStorage.getItem('sidebarCollapsed');
    const isMobile = window.innerWidth < 768;
    
    if (savedState !== null) {
      this.sidebarCollapsed = savedState === 'true';
    } else {
      this.sidebarCollapsed = isMobile;
    }

    // Only load sessions if authorized
    this.sessionService.sessions$
      .pipe(takeUntil(this.destroy$), take(1))
      .subscribe(sessions => {
        if (this.isAuthorized && sessions.length > 0) {
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
        if (this.isAuthorized && sessions.length === 0) {
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

  private initializeAuthentication(): void {
    // Always handle redirect promise first (in case we're returning from a redirect)
    this.authService.handleRedirectPromise().subscribe({
      next: (result) => {
        if (result) {
          console.log('Redirect handled, user authenticated');
          this.checkAuthorization();
        } else {
          // No redirect to handle, check if already authenticated
          if (this.authService.isAuthenticated()) {
            this.checkAuthorization();
          } else {
            // Attempt automatic login
            this.authService.loginSilent().subscribe({
              next: () => {
                console.log('Automatic login successful');
                this.checkAuthorization();
              },
              error: (error) => {
                // Error is expected if redirect is triggered
                // The redirect will complete and page will reload
                if (error.errorCode !== 'interaction_in_progress') {
                  console.log('Automatic silent login failed, redirecting to login');
                }
              }
            });
          }
        }
      },
      error: (error) => {
        console.error('Error handling redirect promise:', error);
        // Still try to check authentication
        if (this.authService.isAuthenticated()) {
          this.checkAuthorization();
        }
      }
    });
  }

  private checkAuthorization(): void {
    if (this.authorizationChecked) {
      return;
    }

    this.authorizationChecked = true;
    const userEmail = this.authService.getUserEmail();
    
    if (!userEmail) {
      this.isAuthorized = false;
      return;
    }

    // Check authorization by attempting to load sessions
    // If the API returns 401/403, user is not authorized
    this.databaseService.getSessions(userEmail).subscribe({
      next: (sessions) => {
        // If we can successfully fetch sessions (even if empty), user is authorized
        this.isAuthorized = true;
        // Reload sessions now that we know user is authorized
        // The session service will handle loading sessions properly
        this.sessionService.reloadSessions();
      },
      error: (error) => {
        // Check for authorization errors
        if (error.status === 401 || error.status === 403) {
          console.warn('User is not authorized to access this application');
          this.isAuthorized = false;
        } else {
          // For other errors (network, server errors), assume authorized
          // but the app may not function properly
          console.warn('Error checking authorization, assuming authorized:', error);
          this.isAuthorized = true;
          // Try to reload sessions anyway
          this.sessionService.reloadSessions();
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

