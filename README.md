# Angular Chatbot Application

A modern Angular-based chatbot application with RAG (Retrieval-Augmented Generation) capabilities, integrated with Azure SQL Database for session and message persistence.

## Features

- 💬 **Chat Interface**: Interactive chat interface with message history
- 📚 **Document Selection**: Select documents for RAG-based queries
- 💾 **Database Integration**: Sessions and messages stored in Azure SQL Database
- ⭐ **Message Ratings**: Thumbs up/down rating system for messages
- 🔐 **Azure AD Authentication**: Microsoft Authentication Library (MSAL) integration
- 🔄 **Session Management**: Create, view, and delete chat sessions
- 🌐 **Backend Integration**: Supports n8n webhooks or .NET API endpoints
- 📱 **Responsive Design**: Mobile-friendly interface with collapsible sidebar

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Angular CLI 16.2.0 or higher
- .NET 10.0 SDK (for API backend)
- Azure SQL Database (for data persistence)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cbot-ang-dotnet-n8n-cursor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   - Update `src/environments/environment.ts` for development
   - Update `src/environments/environment.prod.ts` for production

## Configuration

### Development Environment (`src/environments/environment.ts`)

```typescript
export const environment = {
  production: false,
  databaseApiUrl: 'http://localhost:5000/api/database',
  useDatabase: true,
  // ... other configurations
};
```

### Production Environment (`src/environments/environment.prod.ts`)

```typescript
export const environment = {
  production: true,
  databaseApiUrl: 'https://your-api.azurewebsites.net/api/database',
  useDatabase: true,
  // ... other configurations
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

## Database Setup

### 1. Create Database Schema

Execute the SQL script in Azure SQL Database Query Editor:

```bash
complete-database-schema-with-drop.sql
```

This creates:
- `ChatSessions` table
- `ChatMessages` table
- `Documents` table
- Required stored procedures

### 2. (Optional) Insert Sample Data

```bash
sample-database-data.sql
```

## API Backend

The application requires a .NET Web API backend. The API should be located at `../chatbot-api/` relative to this project.

### API Endpoints

- `GET /api/database/sessions/{userId}` - Get all sessions for a user
- `GET /api/database/sessions/{sessionId}/messages` - Get messages for a session
- `POST /api/database/sessions` - Create a new session
- `POST /api/database/sessions/{sessionId}/messages` - Add a message to a session
- `PUT /api/database/messages/{messageId}/rating` - Update message rating
- `DELETE /api/database/sessions/{sessionId}` - Delete a session

### Running the API

```bash
cd ../chatbot-api
dotnet run
```

The API will be available at `http://localhost:5000`

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── chat/              # Chat interface component
│   │   ├── document-selector/ # Document selection component
│   │   └── session-list/      # Session list sidebar component
│   ├── guards/
│   │   └── auth.guard.ts      # Authentication guard
│   ├── models/
│   │   └── chat.models.ts     # TypeScript interfaces
│   ├── services/
│   │   ├── auth.service.ts    # MSAL authentication service
│   │   ├── chat.service.ts    # Chat API service
│   │   ├── database.service.ts # Database API service
│   │   ├── document.service.ts # Document service
│   │   └── session.service.ts  # Session management service
│   ├── app.component.ts        # Root component
│   └── main.ts                 # Application bootstrap
├── environments/
│   ├── environment.ts          # Development configuration
│   └── environment.prod.ts     # Production configuration
└── index.html                  # Application entry point
```

## Key Technologies

- **Angular 16.2.0** - Frontend framework
- **TypeScript 5.1.3** - Programming language
- **MSAL Angular 3.1.0** - Microsoft Authentication Library
- **RxJS 7.8.0** - Reactive programming
- **Azure SQL Database** - Data persistence
- **.NET 10.0** - Backend API

## Features in Detail

### Session Management
- Sessions are automatically saved to Azure SQL Database
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
- Supports both popup and redirect flows
- User ID is used to filter sessions in the database

## Troubleshooting

### Sessions Not Loading
- Check browser console for errors
- Verify `useDatabase: true` in environment file
- Verify API URL is correct
- Check if API is running and accessible

### Ratings Not Saving
- Check browser console for API errors
- Verify API endpoint is accessible
- Check Network tab for failed requests

### CORS Errors
- Ensure API CORS is configured to allow your Angular app origin
- Check API `Program.cs` for CORS configuration

## Development Notes

- The app uses a fallback user ID (`user@example.com`) in development mode when not authenticated
- localStorage is used as a fallback when database is unavailable
- All database operations are logged to the console for debugging

## License

[Add your license information here]

## Support

[Add support contact information here]

