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
  @Input() selectedDocumentIds: string[] = []; // For backward compatibility, but only first item is used
  @Output() selectionChange = new EventEmitter<string[]>(); // Emits array with single item

  documents: Document[] = [];
  loading = false;
  showSelector = false;
  useN8n = true; // Toggle between n8n and .NET

  constructor(private documentService: DocumentService) {}

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.loading = true;
    
    // For development, use mock data. In production, use:
    // this.documentService.loadDocuments(this.useN8n).subscribe(...)
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
    // Single selection: replace the array with just the selected document
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

