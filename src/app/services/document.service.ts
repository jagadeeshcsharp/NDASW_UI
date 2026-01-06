import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Document } from '../models/chat.models';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  constructor() {}

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

