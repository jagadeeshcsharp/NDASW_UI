import { Injectable, inject } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { AccountInfo, AuthenticationResult } from '@azure/msal-browser';
import { Observable, BehaviorSubject } from 'rxjs';
import { loginRequest } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private msalService = inject(MsalService);
  
  // Observable for authentication state
  private authStateSubject = new BehaviorSubject<boolean>(false);
  public authState$ = this.authStateSubject.asObservable();

  constructor() {
    // Initialize authentication state on service creation
    this.checkAndSetActiveAccount();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.msalService.instance.getActiveAccount() !== null;
  }

  /**
   * Get current authenticated account
   */
  getActiveAccount(): AccountInfo | null {
    return this.msalService.instance.getActiveAccount();
  }

  /**
   * Get current user's display name
   */
  getUserName(): string | null {
    const account = this.getActiveAccount();
    return account?.name || account?.username || null;
  }

   getUserEmail(): string | null {
    const account = this.getActiveAccount();
    return account?.username || account?.username || null;
  }

  /**
   * Get current user's ID (email or username)
   * Use this for database operations to identify the user
   */
  getUserId(): string | null {
    const account = this.getActiveAccount();
    // Use username (typically email/UPN) or objectId (if available) as user identifier
    return account?.username || account?.homeAccountId?.split('.')[0] || null;
  }

  /**
   * Login user
   */
  login(): Observable<AuthenticationResult> {
    // Ensure MSAL is initialized before attempting login
    return new Observable(observer => {
      if (!this.msalService.instance || !this.msalService.instance.getAllAccounts) {
        observer.error(new Error('MSAL not initialized'));
        return;
      }

      const loginObservable = this.msalService.loginPopup(loginRequest);
      
      loginObservable.subscribe({
        next: (result) => {
          // Update authentication state after successful login
          this.checkAndSetActiveAccount();
          observer.next(result);
          observer.complete();
        },
        error: (error) => {
          console.error('Login error:', error);
          this.authStateSubject.next(false);
          observer.error(error);
        }
      });
    });
  }

  /**
   * Login redirect (alternative to popup)
   */
  loginRedirect(): void {
    this.msalService.loginRedirect(loginRequest);
  }

  /**
   * Logout user
   */
  logout(): void {
    const account = this.msalService.instance.getActiveAccount();
    if (account) {
      this.msalService.logoutPopup({
        account: account
      }).subscribe({
        next: () => {
          // Update authentication state after logout
          this.authStateSubject.next(false);
        },
        error: (error) => {
          console.error('Logout error:', error);
          // Still update state even if there's an error
          this.authStateSubject.next(false);
        }
      });
    } else {
      // No account to logout, just update state
      this.authStateSubject.next(false);
    }
  }

  /**
   * Logout redirect (alternative to popup)
   */
  logoutRedirect(): void {
    this.msalService.logoutRedirect({
      account: this.msalService.instance.getActiveAccount()
    });
  }

  /**
   * Get access token silently
   */
  acquireTokenSilent(scopes: string[]): Observable<AuthenticationResult> {
    const account = this.getActiveAccount();
    if (!account) {
      throw new Error('No active account');
    }
    return this.msalService.acquireTokenSilent({
      ...loginRequest,
      scopes: scopes,
      account: account
    });
  }

  /**
   * Check and set active account
   */
  private checkAndSetActiveAccount(): void {
    const accounts = this.msalService.instance.getAllAccounts();
    if (accounts.length > 0) {
      this.msalService.instance.setActiveAccount(accounts[0]);
      this.authStateSubject.next(true);
    } else {
      this.authStateSubject.next(false);
    }
  }

  /**
   * Initialize authentication state
   */
  initialize(): void {
    this.checkAndSetActiveAccount();
  }
}

