import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentService } from '../../services/document.service';
import { Document } from '../../models/chat.models';

@Component({
  selector: 'app-document-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './document-selector.component.html',
  styleUrls: ['./document-selector.component.css']
})
export class DocumentSelectorComponent implements OnInit {
  @Input() selectedDocumentIds: string[] = [];
  @Output() selectionChange = new EventEmitter<string[]>();

  documents: Document[] = [];
  loading = false;
  showSelector = true;

  constructor(private documentService: DocumentService) {}

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.loading = true;
    this.documentService.getMockDocuments().subscribe({
      next: (docs) => {
        this.documents = docs;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading documents:', error);
        this.loading = false;
      }
    });
  }

  selectDocument(documentId: string): void {
    this.selectedDocumentIds = [documentId];
    this.selectionChange.emit(this.selectedDocumentIds);
  }

  isSelected(documentId: string): boolean {
    return this.selectedDocumentIds.includes(documentId);
  }

  toggleSelector(): void {
    this.showSelector = !this.showSelector;
  }

  getSelectedCount(): number {
    return this.selectedDocumentIds.length;
  }
}

