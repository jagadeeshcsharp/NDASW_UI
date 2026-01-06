import { Configuration, BrowserCacheLocation } from '@azure/msal-browser';

/**
 * Production Environment Configuration
 * 
 * This file contains configuration for the production environment.
 * Update the webhook URLs to your production n8n instance or .NET API.
 * 
 * @see environment.ts for development configuration
 */
export const environment = {
  production: true,
  
  // Option A: Direct n8n webhook (Preferred)
  // TODO: Update with production n8n webhook URL
  n8nChatWebhookUrl: 'https://dsrg.app.n8n.cloud/webhook-test/e0af875e-0157-449f-a58c-633e938607af',
  n8nDocumentsWebhookUrl: 'https://your-n8n-instance.com/webhook/documents',
  
  // Option B: .NET gateway endpoint (Alternative backend)
  dotNetChatApiUrl: 'https://your-dotnet-api.com/api/chat',
  dotNetDocumentsApiUrl: 'https://your-dotnet-api.com/api/documents',
  
  // Toggle between n8n and .NET (true = use n8n, false = use .NET)
  useN8n: true,
  
  // Database API endpoint (.NET API that connects to Azure SQL)
  // Set to null or empty string to use localStorage (default/fallback)
  databaseApiUrl: 'https://chatbot-api-05012026-decbe7eebfezecf3.australiasoutheast-01.azurewebsites.net/api/database', // Azure API for production
  useDatabase: true // Set to true to use Azure SQL database, false to use localStorage
};

// MSAL Configuration with dummy/test credentials
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

// Scopes for Microsoft Graph API (optional - for accessing user profile)
export const protectedResources = {
  graphMe: {
    endpoint: 'https://graph.microsoft.com/v1.0/me',
    scopes: ['User.Read']
  }
};

// Login request configuration
export const loginRequest = {
  scopes: ['User.Read']
};

