import { Configuration, BrowserCacheLocation } from '@azure/msal-browser';

/**
 * Development Environment Configuration
 * 
 * This file contains configuration for the development environment.
 * 
 * n8n Webhook Integration:
 * - n8nChatWebhookUrl: Configured with actual n8n webhook URL for chat requests
 * - The webhook handles POST requests with ChatRequest format
 * - Returns responses in various formats (handled automatically by ChatService)
 * 
 * Fallback Behavior:
 * - If webhook fails, the app automatically returns a dummy response
 * - This ensures the UI continues to work even when backend is unavailable
 * 
 * @see ChatService for implementation details
 */
export const environment = {
  production: false,
  
  // Option A: Direct n8n webhook (Preferred)
  // Configured with actual n8n webhook URL: http://localhost:5678/webhook-test/...
  n8nChatWebhookUrl: 'http://localhost:5678/webhook/ea86c866-b87d-4d31-9d12-4553bb39e08a',
  n8nDocumentsWebhookUrl: 'https://your-n8n-instance.com/webhook/documents',
  
  // Option B: .NET gateway endpoint (Alternative backend)
  dotNetChatApiUrl: 'https://your-dotnet-api.com/api/chat',
  dotNetDocumentsApiUrl: 'https://your-dotnet-api.com/api/documents',
  
  // Toggle between n8n and .NET (true = use n8n, false = use .NET)
  useN8n: true,
  
  // Database API endpoint (.NET API that connects to Azure SQL)
  // Set to null or empty string to use localStorage (default/fallback)
  databaseApiUrl: 'http://localhost:5000/api/database', // Local API for development
  useDatabase: true // Set to true to use Azure SQL database, false to use localStorage
};

// MSAL Configuration with dummy/test credentials
export const msalConfig: Configuration = {
  auth: {
    clientId: '764a74b0-a0e2-4d92-9885-fff60d65ee4e', // Dummy client ID
    authority: 'https://login.microsoftonline.com/common', // Common endpoint for all Microsoft accounts
    redirectUri: window.location.origin, // Redirects to the app root
    postLogoutRedirectUri: window.location.origin
  },
  cache: {
    cacheLocation: BrowserCacheLocation.LocalStorage, // Store tokens in localStorage
    storeAuthStateInCookie: false // Set to true for IE11
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

