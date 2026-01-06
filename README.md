# Angular Chatbot Application

A modern Angular-based chatbot application with RAG (Retrieval-Augmented Generation) capabilities, integrated with Azure SQL Database for session and message persistence.

## Features

- 💬 **Chat Interface**: Interactive chat interface with message history
- 📚 **Document Selection**: Select documents for RAG-based queries
- 💾 **Database Integration**: Sessions and messages stored in Azure SQL Database via .NET Web API
- ⭐ **Message Ratings**: Thumbs up/down rating system for messages
- 🔐 **Azure AD Authentication**: Microsoft Authentication Library (MSAL) integration
- 🔄 **Session Management**: Create, view, and delete chat sessions
- 🌐 **Backend Integration**: n8n webhook for chat requests
- 📱 **Responsive Design**: Mobile-friendly interface with collapsible sidebar

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Angular CLI 16.2.0 or higher
- .NET Web API backend (for database operations)
- Azure SQL Database (for data persistence)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd NDASW_UI
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   - Update `src/environments/environment.ts` with your configuration:
     - `n8nChatWebhookUrl`: Your n8n webhook URL for chat requests
     - `databaseApiUrl`: Your .NET Web API URL for database operations

## Configuration

### Environment Configuration (`src/environments/environment.ts`)

```typescript
export const environment = {
  production: true,
  n8nChatWebhookUrl: 'https://your-n8n-webhook-url',
  databaseApiUrl: 'https://your-api.azurewebsites.net/api/database'
};
```

## Running the Application

### Development Server

```bash
npm start
```

The app will be available at `http://localhost:4200`

### Production Build

```bash
npm run build -- --configuration production
```

The built files will be in the `dist/angular-chatbot` directory.

## API Backend

The application requires a .NET Web API backend for database operations. The API should provide the following endpoints:

- `GET /api/database/sessions/{userId}` - Get all sessions for a user
- `GET /api/database/sessions/{sessionId}/messages` - Get messages for a session
- `POST /api/database/sessions` - Create a new session
- `POST /api/database/sessions/{sessionId}/messages` - Add a message to a session
- `PUT /api/database/messages/{messageId}/rating` - Update message rating
- `DELETE /api/database/sessions/{sessionId}` - Delete a session

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── chat/              # Chat interface component
│   │   ├── document-selector/ # Document selection component
│   │   └── session-list/      # Session list sidebar component
│   ├── models/
│   │   └── chat.models.ts     # TypeScript interfaces
│   ├── services/
│   │   ├── auth.service.ts    # MSAL authentication service
│   │   ├── chat.service.ts    # Chat API service (n8n)
│   │   ├── database.service.ts # Database API service
│   │   ├── document.service.ts # Document service
│   │   └── session.service.ts  # Session management service
│   ├── app.component.ts        # Root component
│   └── main.ts                 # Application bootstrap
├── environments/
│   └── environment.ts          # Configuration
└── index.html                  # Application entry point
```

## Key Technologies

- **Angular 16.2.0** - Frontend framework
- **TypeScript 5.1.3** - Programming language
- **MSAL Angular 3.1.0** - Microsoft Authentication Library
- **RxJS 7.8.0** - Reactive programming
- **Azure SQL Database** - Data persistence
- **.NET Web API** - Backend API for database operations
- **n8n** - Workflow automation for chat processing

## Features in Detail

### Session Management
- Sessions are automatically saved to Azure SQL Database via .NET Web API
- Sessions persist across browser refreshes
- Users can delete sessions
- Session history is loaded on app startup

### Message Ratings
- Users can rate assistant messages with thumbs up/down
- Ratings are saved to the database in real-time
- Ratings persist across sessions

### Document Selection
- Users can select documents before starting a chat
- Selected documents are associated with the session
- Document selection cannot be changed after session creation

### Authentication
- Azure AD authentication via MSAL
- Supports redirect flow
- User ID is used to filter sessions in the database

## Troubleshooting

### Sessions Not Loading
- Check browser console for errors
- Verify `databaseApiUrl` is correct in environment file
- Check if API is running and accessible
- Verify user authentication

### Ratings Not Saving
- Check browser console for API errors
- Verify API endpoint is accessible
- Check Network tab for failed requests

### CORS Errors
- Ensure API CORS is configured to allow your Angular app origin
- Check API CORS configuration

## License

[Add your license information here]

## Support

[Add support contact information here]
