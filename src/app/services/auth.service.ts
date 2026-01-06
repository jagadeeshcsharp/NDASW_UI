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
  private authStateSubject = new BehaviorSubject<boolean>(false);
  public authState$ = this.authStateSubject.asObservable();

  constructor() {
    this.checkAndSetActiveAccount();
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
    return account?.username || account?.username || null;
  }

  getUserId(): string | null {
    const account = this.getActiveAccount();
    return account?.username || account?.homeAccountId?.split('.')[0] || null;
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

