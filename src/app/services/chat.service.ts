import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ChatRequest, ChatResponse } from '../models/chat.models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private n8nWebhookUrl = environment.n8nChatWebhookUrl;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  private sendMessageToN8n(request: ChatRequest): Observable<ChatResponse> {
    return this.http.post<any>(this.n8nWebhookUrl, request, this.httpOptions).pipe(
      map(response => {
        if (response.answer) {
          return { answer: response.answer } as ChatResponse;
        } else if (response.output) {
          return { answer: response.output } as ChatResponse;
        } else if (response.body?.answer) {
          return { answer: response.body.answer } as ChatResponse;
        } else if (response.body?.output) {
          return { answer: response.body.output } as ChatResponse;
        } else if (response.data?.answer) {
          return { answer: response.data.answer } as ChatResponse;
        } else if (response.data?.output) {
          return { answer: response.data.output } as ChatResponse;
        } else if (typeof response === 'string') {
          return { answer: response } as ChatResponse;
        } else {
          const answer = response.message || response.text || response.response || JSON.stringify(response);
          return { answer: answer } as ChatResponse;
        }
      }),
      catchError(error => {
        console.warn('Webhook not available, using dummy response:', error);
        return of(this.getDummyResponse(request.question));
      })
    );
  }

  sendMessage(request: ChatRequest): Observable<ChatResponse> {
    return this.sendMessageToN8n(request);
  }
  private getDummyResponse(question: string): ChatResponse {
    return {
      answer: `I apologize, but I'm currently unable to connect to the backend service. Here's a placeholder response to your question: "${question}". Please check your internet connection or try again later. The service may be temporarily unavailable.`
    };
  }

}

