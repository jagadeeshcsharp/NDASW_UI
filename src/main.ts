import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, HTTP_INTERCEPTORS, withInterceptorsFromDi } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { MsalService, MsalInterceptor, MsalBroadcastService, MSAL_INSTANCE, MSAL_INTERCEPTOR_CONFIG, MsalInterceptorConfiguration, MsalGuardConfiguration, MSAL_GUARD_CONFIG } from '@azure/msal-angular';
import { IPublicClientApplication, PublicClientApplication, InteractionType } from '@azure/msal-browser';
import { msalConfig, loginRequest } from './environments/environment';

let msalInstance: IPublicClientApplication;

/**
 * MSAL Instance Factory
 */
export function MSALInstanceFactory(): IPublicClientApplication {
  if (!msalInstance) {
    msalInstance = new PublicClientApplication(msalConfig);
  }
  return msalInstance;
}

/**
 * MSAL Interceptor Config Factory
 */
export function MSALInterceptorConfigFactory(): MsalInterceptorConfiguration {
  const protectedResourceMap = new Map<string, Array<string>>();
  // Add your protected resources here if needed
  // protectedResourceMap.set('https://graph.microsoft.com/v1.0/me', ['User.Read']);

  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap
    // Note: URLs not in protectedResourceMap won't get auth tokens automatically
    // This means localhost:5000 and the Azure API won't receive tokens (which is what we want)
  };
}

/**
 * MSAL Guard Config Factory
 */
export function MSALGuardConfigFactory(): MsalGuardConfiguration {
  return {
    interactionType: InteractionType.Redirect,
    authRequest: loginRequest
  };
}

// Initialize MSAL before bootstrapping the app
const msal = MSALInstanceFactory();
msal.initialize().then(() => {
  bootstrapApplication(AppComponent, {
    providers: [
      provideHttpClient(withInterceptorsFromDi()),
      {
        provide: MSAL_INSTANCE,
        useFactory: MSALInstanceFactory
      },
      {
        provide: MSAL_GUARD_CONFIG,
        useFactory: MSALGuardConfigFactory
      },
      {
        provide: MSAL_INTERCEPTOR_CONFIG,
        useFactory: MSALInterceptorConfigFactory
      },
      {
        provide: HTTP_INTERCEPTORS,
        useClass: MsalInterceptor,
        multi: true
      },
      MsalService,
      MsalBroadcastService
    ]
  }).catch(err => console.error(err));
}).catch(err => {
  console.error('MSAL initialization failed:', err);
});

