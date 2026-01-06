import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionListComponent } from './components/session-list/session-list.component';
import { ChatComponent } from './components/chat/chat.component';
import { SessionService } from './services/session.service';
import { AuthService } from './services/auth.service';
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
  userName: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private sessionService: SessionService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.authState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAuthenticated => {
        this.isAuthenticated = isAuthenticated;
        this.userName = this.authService.getUserName();
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

  login(): void {
    this.authService.login().subscribe({
      next: (result) => {
        console.log('Login successful', result);
        this.isAuthenticated = true;
        this.userName = this.authService.getUserName();
      },
      error: (error) => {
        console.error('Login failed', error);
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.isAuthenticated = false;
    this.userName = null;
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

