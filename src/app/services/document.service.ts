import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Document } from '../models/chat.models';
import { DatabaseService } from './database.service';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private databaseService = inject(DatabaseService);

  constructor() {}

  getDocuments(): Observable<Document[]> {
    return this.databaseService.getDocuments();
  }

  // Keep this method for backward compatibility but mark as deprecated
  /** @deprecated Use getDocuments() instead */
  getMockDocuments(): Observable<Document[]> {
    return this.getDocuments();
  }
}

