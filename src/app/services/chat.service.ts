import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ChatRequest, ChatResponse } from '../models/chat.models';
import { environment } from '../../environments/environment';

/**
 * ChatService - Handles communication with backend services (n8n webhook or .NET API)
 * 
 * Features:
 * - Direct n8n webhook integration (preferred method)
 * - .NET gateway endpoint support (alternative)
 * - Automatic response format handling for different n8n response structures
 * - Fallback to dummy response when webhook/API is unavailable
 * - Comprehensive error handling
 * 
 * @since 1.0.0
 */
@Injectable({
  providedIn: 'root'
})
export class ChatService {
  // Option A: Direct n8n webhook (Preferred)
  // Configured in environment files: environment.ts and environment.prod.ts
  private n8nWebhookUrl = environment.n8nChatWebhookUrl;
  
  // Option B: .NET gateway endpoint (Alternative backend)
  private dotNetApiUrl = environment.dotNetChatApiUrl;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  /**
   * Send chat request directly to n8n webhook (Option A - Preferred)
   * 
   * This method handles various n8n response formats and automatically converts them
   * to the standard ChatResponse format expected by the UI.
   * 
   * Supported n8n response formats:
   * - { "answer": "..." } - Standard format
   * - { "output": "..." } - n8n webhook default format (most common)
   * - { "body": { "answer": "..." } } - Wrapped in body
   * - { "data": { "output": "..." } } - Wrapped in data
   * - Plain string response
   * 
   * Fallback behavior:
   * - If webhook fails, returns a dummy response instead of throwing an error
   * - This ensures the UI continues to work even when the backend is unavailable
   * 
   * @param request - Chat request containing sessionId, question, selectedDocumentIds, and optional ragSource
   * @returns Observable<ChatResponse> - Response from n8n webhook or dummy response on failure
   */
  sendMessageToN8n(request: ChatRequest): Observable<ChatResponse> {
    return this.http.post<any>(this.n8nWebhookUrl, request, this.httpOptions).pipe(
      map(response => {
        // Handle different n8n response formats
        // n8n might return the data directly or wrapped in a structure
        // This mapping ensures compatibility with various n8n workflow configurations
        if (response.answer) {
          // Direct ChatResponse format
          return { answer: response.answer } as ChatResponse;
        } else if (response.output) {
          // n8n webhook returns { "output": "..." } format
          return {
            answer: response.output
          } as ChatResponse;
        } else if (response.body?.answer) {
          // Wrapped in body
          return { answer: response.body.answer } as ChatResponse;
        } else if (response.body?.output) {
          // Wrapped in body with output field
          return {
            answer: response.body.output
          } as ChatResponse;
        } else if (response.data?.answer) {
          // Wrapped in data
          return { answer: response.data.answer } as ChatResponse;
        } else if (response.data?.output) {
          // Wrapped in data with output field
          return {
            answer: response.data.output
          } as ChatResponse;
        } else if (typeof response === 'string') {
          // Plain string response
          return {
            answer: response
          } as ChatResponse;
        } else {
          // Try to extract answer from any field
          const answer = response.message || response.text || response.response || JSON.stringify(response);
          return {
            answer: answer
          } as ChatResponse;
        }
      }),
      catchError(error => {
        // Fallback: Return dummy response when webhook fails
        // This prevents the UI from showing error messages and provides a better UX
        // The dummy response includes the user's question to maintain context
        console.warn('Webhook not available, using dummy response:', error);
        return of(this.getDummyResponse(request.question));
      })
    );
  }

  /**
   * Send chat request to .NET gateway (Option B - Alternative backend)
   * 
   * This method provides an alternative to n8n webhook integration.
   * It follows the same fallback pattern - returns dummy response on failure.
   * 
   * @param request - Chat request containing sessionId, question, selectedDocumentIds, and optional ragSource
   * @returns Observable<ChatResponse> - Response from .NET API or dummy response on failure
   */
  sendMessageToDotNet(request: ChatRequest): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(this.dotNetApiUrl, request, this.httpOptions).pipe(
      catchError(error => {
        // Fallback: Return dummy response when .NET API fails
        console.warn('API not available, using dummy response:', error);
        return of(this.getDummyResponse(request.question));
      })
    );
  }

  /**
   * Send message - uses environment configuration to determine backend
   * 
   * This is the main method used by the chat component. It automatically
   * routes requests to either n8n webhook or .NET API based on configuration.
   * 
   * Configuration:
   * - Set environment.useN8n = true to use n8n webhook (default)
   * - Set environment.useN8n = false to use .NET API
   * 
   * @param request - Chat request containing sessionId, question, selectedDocumentIds, and optional ragSource
   * @param useN8n - Optional override for environment.useN8n setting
   * @returns Observable<ChatResponse> - Response from selected backend or dummy response on failure
   */
  sendMessage(request: ChatRequest, useN8n?: boolean): Observable<ChatResponse> {
    const useN8nEndpoint = useN8n !== undefined ? useN8n : environment.useN8n;
    return useN8nEndpoint
      ? this.sendMessageToN8n(request)
      : this.sendMessageToDotNet(request);
  }

  /**
   * Get dummy response when webhook/API is not available
   * 
   * This method provides a fallback response when the backend service is unavailable.
   * It maintains user experience by showing a helpful message instead of an error.
   * 
   * The dummy response:
   * - Includes the user's question to maintain context
   * - Provides helpful guidance about the service being unavailable
   * 
   * @param question - The user's question to include in the dummy response
   * @returns ChatResponse - Dummy response with user's question and helpful message
   */
  private getDummyResponse(question: string): ChatResponse {
    return {
      answer: `I apologize, but I'm currently unable to connect to the backend service. Here's a placeholder response to your question: "${question}". Please check your internet connection or try again later. The service may be temporarily unavailable.`
    };
  }

  /**
   * Mock response for development/testing
   * 
   * This method is kept for backward compatibility and testing purposes.
   * In production, the chat component uses sendMessage() which calls the real API.
   * 
   * @param question - The user's question
   * @returns Observable<ChatResponse> - Mock response with simulated delay
   */
  getMockResponse(question: string): Observable<ChatResponse> {
    const mockResponse: ChatResponse = {
      answer: `This is a mock response to: "${question}". In a real implementation, this would come from n8n or .NET backend.`
    };
    
    // Simulate network delay
    return new Observable(observer => {
      setTimeout(() => {
        observer.next(mockResponse);
        observer.complete();
      }, 1000);
    });
  }
}

