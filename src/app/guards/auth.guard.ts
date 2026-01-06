import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { AuthService } from '../services/auth.service';

/**
 * Authentication Guard
 * Protects routes that require authentication
 * 
 * This guard uses MSAL's built-in MsalGuard for route protection.
 * For a custom implementation, you can use the customAuthGuard below.
 * 
 * Usage in routes:
 * {
 *   path: 'protected',
 *   component: ProtectedComponent,
 *   canActivate: [MsalGuard]  // Use MSAL's built-in guard
 * }
 */

/**
 * Custom Authentication Guard (alternative to MsalGuard)
 * Checks authentication status and redirects if not authenticated
 */
export const customAuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // If not authenticated, redirect to home (or trigger login)
  // You can also trigger login here if needed
  router.navigate(['/']);
  return false;
};

// Export MsalGuard for direct use
export { MsalGuard };

