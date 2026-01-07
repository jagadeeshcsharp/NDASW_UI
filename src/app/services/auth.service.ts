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
    // account.username is the email address in MSAL
    return account?.username || null;
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
    // Check if there's already an interaction in progress
    // MSAL stores this in the browser cache
    try {
      this.msalService.loginRedirect(loginRequest);
    } catch (error: any) {
      // If interaction is in progress, the error will be thrown
      // but loginRedirect doesn't throw synchronously, so this catch won't help
      // The actual error happens asynchronously
      console.log('Attempting login redirect');
    }
  }

  handleRedirectPromise(): Observable<AuthenticationResult | null> {
    return new Observable(observer => {
      this.msalService.instance.handleRedirectPromise()
        .then((result) => {
          if (result) {
            this.checkAndSetActiveAccount();
            observer.next(result);
          } else {
            observer.next(null);
          }
          observer.complete();
        })
        .catch((error) => {
          console.error('Error handling redirect promise:', error);
          observer.error(error);
        });
    });
  }

  loginSilent(): Observable<AuthenticationResult> {
    return new Observable(observer => {
      // First, handle any pending redirect response
      // This must be done before any other MSAL calls
      this.msalService.instance.handleRedirectPromise()
        .then((redirectResult) => {
          if (redirectResult) {
            // Redirect was handled, user is now authenticated
            this.checkAndSetActiveAccount();
            observer.next(redirectResult);
            observer.complete();
            return;
          }

          // No redirect to handle, check for existing accounts
          const accounts = this.msalService.instance.getAllAccounts();
          if (accounts.length > 0) {
            // Try silent login with existing account
            this.msalService.acquireTokenSilent({
              ...loginRequest,
              account: accounts[0]
            }).subscribe({
              next: (result) => {
                this.checkAndSetActiveAccount();
                observer.next(result);
                observer.complete();
              },
              error: (error) => {
                // If silent login fails and it's not an interaction_in_progress error,
                // try redirect login (but only after handleRedirectPromise completed)
                if (error.errorCode === 'interaction_in_progress') {
                  console.log('Interaction already in progress, waiting for completion');
                  // Wait and check again
                  setTimeout(() => {
                    this.msalService.instance.handleRedirectPromise()
                      .then((result) => {
                        if (result) {
                          this.checkAndSetActiveAccount();
                          observer.next(result);
                          observer.complete();
                        } else {
                          this.checkAndSetActiveAccount();
                          if (this.isAuthenticated()) {
                            observer.next({} as AuthenticationResult);
                            observer.complete();
                          } else {
                            observer.error(error);
                          }
                        }
                      })
                      .catch((err) => observer.error(err));
                  }, 1000);
                } else {
                  console.log('Silent login failed, attempting redirect login');
                  this.loginRedirect();
                  observer.error(error);
                }
              }
            });
          } else {
            // No accounts, need to redirect to login
            console.log('No accounts found, redirecting to login');
            this.loginRedirect();
            observer.error(new Error('No accounts found'));
          }
        })
        .catch((error) => {
          console.error('Error handling redirect promise:', error);
          // Even if there's an error, check if we're authenticated
          this.checkAndSetActiveAccount();
          if (this.isAuthenticated()) {
            observer.next({} as AuthenticationResult);
            observer.complete();
          } else {
            observer.error(error);
          }
        });
    });
  }

  checkUserAuthorization(): Observable<boolean> {
    return new Observable(observer => {
      const account = this.getActiveAccount();
      if (!account) {
        observer.next(false);
        observer.complete();
        return;
      }

      // Check authorization by attempting to get user email
      // If we can get the email, user is authenticated
      // Authorization will be checked via API calls (401/403 responses)
      const userEmail = this.getUserEmail();
      if (userEmail) {
        observer.next(true);
        observer.complete();
      } else {
        observer.next(false);
        observer.complete();
      }
    });
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

