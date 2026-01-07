import { Injectable, inject } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { AccountInfo, AuthenticationResult } from '@azure/msal-browser';
import { Observable, BehaviorSubject, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { loginRequest } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private msalService = inject(MsalService);
  private authStateSubject = new BehaviorSubject<boolean>(false);
  public authState$ = this.authStateSubject.asObservable();
  private redirectHandled = false;

  constructor() {
    // Redirect handling will be done when explicitly called
  }

  handleRedirectResponse(): Observable<AuthenticationResult | null> {
    if (this.redirectHandled) {
      return new Observable(observer => {
        observer.next(null);
        observer.complete();
      });
    }

    this.redirectHandled = true;
    return from(this.msalService.instance.handleRedirectPromise()).pipe(
      map((response) => {
        if (response) {
          console.log('Redirect response received:', response);
          this.checkAndSetActiveAccount();
          return response;
        } else {
          // No redirect response, check for existing accounts
          this.checkAndSetActiveAccount();
          return null;
        }
      }),
      catchError((error) => {
        console.error('Error handling redirect response:', error);
        this.checkAndSetActiveAccount();
        return from([null]);
      })
    );
  }

  isAuthenticated(): boolean {
    return this.msalService.instance.getActiveAccount() !== null;
  }

  getActiveAccount(): AccountInfo | null {
    return this.msalService.instance.getActiveAccount();
  }

  getUserName(): string | null {
    const account = this.getActiveAccount();
    return account?.name || account?.username || null;
  }

   getUserEmail(): string | null {
    const account = this.getActiveAccount();
    return account?.username || null;
  }

  getUserId(): string | null {
    const account = this.getActiveAccount();
    return account?.username || account?.homeAccountId?.split('.')[0] || null;
  }

  hasAccountInfo(): boolean {
    const account = this.getActiveAccount();
    return !!(account && account.username);
  }

  autoLogin(): Observable<AuthenticationResult | null> {
    return new Observable(observer => {
      if (!this.msalService.instance) {
        observer.error(new Error('MSAL not initialized'));
        return;
      }

      // First, check if there's an existing account
      const accounts = this.msalService.instance.getAllAccounts();
      if (accounts.length > 0) {
        // Try to set active account and acquire token silently
        this.msalService.instance.setActiveAccount(accounts[0]);
        const account = accounts[0];
        
        this.msalService.acquireTokenSilent({
          ...loginRequest,
          account: account
        }).subscribe({
          next: (result) => {
            this.checkAndSetActiveAccount();
            observer.next(result);
            observer.complete();
          },
          error: (error) => {
            // Silent token acquisition failed, use redirect login (no popup required)
            console.log('Silent login failed, attempting redirect login');
            this.loginRedirect();
            // Redirect will cause page reload, so we complete the observable
            // The app will reinitialize after redirect and check authentication state
            observer.next(null);
            observer.complete();
          }
        });
      } else {
        // No existing account, use redirect login (no popup required)
        console.log('No existing account, attempting redirect login');
        this.loginRedirect();
        // Redirect will cause page reload, so we complete the observable
        // The app will reinitialize after redirect and check authentication state
        observer.next(null);
        observer.complete();
      }
    });
  }

  login(): Observable<AuthenticationResult> {
    return new Observable(observer => {
      if (!this.msalService.instance || !this.msalService.instance.getAllAccounts) {
        observer.error(new Error('MSAL not initialized'));
        return;
      }

      const loginObservable = this.msalService.loginPopup(loginRequest);
      
      loginObservable.subscribe({
        next: (result) => {
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

  loginRedirect(): void {
    this.msalService.loginRedirect(loginRequest);
  }

  logout(): void {
    const account = this.msalService.instance.getActiveAccount();
    if (account) {
      this.msalService.logoutPopup({
        account: account
      }).subscribe({
        next: () => {
          this.authStateSubject.next(false);
        },
        error: (error) => {
          console.error('Logout error:', error);
          this.authStateSubject.next(false);
        }
      });
    } else {
      this.authStateSubject.next(false);
    }
  }

  logoutRedirect(): void {
    this.msalService.logoutRedirect({
      account: this.msalService.instance.getActiveAccount()
    });
  }

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

  private checkAndSetActiveAccount(): void {
    const accounts = this.msalService.instance.getAllAccounts();
    if (accounts.length > 0) {
      this.msalService.instance.setActiveAccount(accounts[0]);
      this.authStateSubject.next(true);
    } else {
      this.authStateSubject.next(false);
    }
  }

  initialize(): void {
    this.checkAndSetActiveAccount();
  }
}

