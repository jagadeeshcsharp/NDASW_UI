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

  getMockDocuments(): Observable<Document[]> {
    return this.databaseService.getDocuments();
  }
}

