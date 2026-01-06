import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Document } from '../models/chat.models';
import { environment } from '../../environments/environment';

export interface DocumentListResponse {
  documents: Document[];
}

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  // Option A: Direct n8n webhook
  private n8nWebhookUrl = environment.n8nDocumentsWebhookUrl;
  
  // Option B: .NET gateway endpoint
  private dotNetApiUrl = environment.dotNetDocumentsApiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Load documents from n8n webhook (Option A - Preferred)
   */
  loadDocumentsFromN8n(): Observable<Document[]> {
    return this.http.get<DocumentListResponse>(this.n8nWebhookUrl).pipe(
      map(response => response.documents),
      catchError(error => {
        console.error('Error loading documents from n8n:', error);
        return of([]);
      })
    );
  }

  /**
   * Load documents from .NET API (Option B)
   */
  loadDocumentsFromDotNet(): Observable<Document[]> {
    return this.http.get<Document[]>(this.dotNetApiUrl).pipe(
      catchError(error => {
        console.error('Error loading documents from .NET:', error);
        return of([]);
      })
    );
  }

  /**
   * Load documents - uses environment configuration
   */
  loadDocuments(useN8n?: boolean): Observable<Document[]> {
    const useN8nEndpoint = useN8n !== undefined ? useN8n : environment.useN8n;
    return useN8nEndpoint
      ? this.loadDocumentsFromN8n()
      : this.loadDocumentsFromDotNet();
  }

  /**
   * Mock data for development/testing
   */
  getMockDocuments(): Observable<Document[]> {
    const mockDocuments: Document[] = [
      { id: '1', name: 'Acme Corporation NDA.pdf' },
      { id: '2', name: 'TechStart Inc Confidentiality Agreement.pdf' },
      { id: '3', name: 'Global Solutions NDA Contract.pdf' },
      { id: '4', name: 'Innovation Partners Mutual NDA.pdf' },
      { id: '5', name: 'MinterEllison Employee Benefits NOV_2025.pdf' },
      { id: '6', name: 'COS_Signed_SEC_32.pdf' },
      { id: '7', name: 'PER172 Confidentiality and Non-Disclosure Agreement (NDA).pdf' }
    ];
    return of(mockDocuments);
  }
}

