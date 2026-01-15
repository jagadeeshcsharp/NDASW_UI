import { Configuration, BrowserCacheLocation } from '@azure/msal-browser';

export const environment = {
  n8nChatWebhookUrl: 'https://appservicencontainerndasw-g4afeuh4dkakbset.centralus-01.azurewebsites.net/webhook-test/chat-prompt',
  dotnetapi: 'https://appservicendasw-bbhnfqetahcvendf.centralus-01.azurewebsites.net/api/database'
};

export const msalConfig: Configuration = {
  auth: {
    clientId: '764a74b0-a0e2-4d92-9885-fff60d65ee4e',
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin
  },
  cache: {
    cacheLocation: BrowserCacheLocation.LocalStorage,
    storeAuthStateInCookie: false
  }
};

export const loginRequest = {
  scopes: ['User.Read']
};
