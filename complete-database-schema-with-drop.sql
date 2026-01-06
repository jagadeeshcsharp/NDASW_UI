-- =============================================
-- Complete Database Schema Script with DROP
-- =============================================
-- This script drops all existing objects and recreates them
-- Execute this in Azure SQL Database Query Editor
-- GO statements are required for Azure Query Editor
-- =============================================

-- =============================================
-- STEP 1: Drop all stored procedures
-- =============================================

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_DeleteDocument]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[sp_DeleteDocument];
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_UpdateDocumentStatus]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[sp_UpdateDocumentStatus];
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_UpsertDocument]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[sp_UpsertDocument];
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_GetActiveDocuments]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[sp_GetActiveDocuments];
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_UpdateMessageRating]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[sp_UpdateMessageRating];
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_AddMessage]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[sp_AddMessage];
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_CreateSession]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[sp_CreateSession];
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_GetSessionMessages]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[sp_GetSessionMessages];
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_GetUserSessions]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[sp_GetUserSessions];
GO

-- =============================================
-- STEP 2: Drop all tables (in correct order due to foreign keys)
-- =============================================

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ChatMessages]') AND type in (N'U'))
    DROP TABLE [dbo].[ChatMessages];
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ChatSessions]') AND type in (N'U'))
    DROP TABLE [dbo].[ChatSessions];
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Documents]') AND type in (N'U'))
    DROP TABLE [dbo].[Documents];
GO

-- =============================================
-- STEP 3: Create Tables
-- =============================================

-- Table: ChatSessions
-- Stores chat sessions/conversations
CREATE TABLE ChatSessions (
    SessionId NVARCHAR(255) PRIMARY KEY,
    UserId NVARCHAR(255) NOT NULL, -- Azure AD user ID or email
    Title NVARCHAR(500) NOT NULL,
    SelectedDocumentIds NVARCHAR(MAX), -- JSON array of document IDs
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    INDEX IX_ChatSessions_UserId (UserId),
    INDEX IX_ChatSessions_CreatedAt (CreatedAt DESC)
);
GO

-- Table: ChatMessages
-- Stores individual messages in conversations
CREATE TABLE ChatMessages (
    MessageId NVARCHAR(255) PRIMARY KEY,
    SessionId NVARCHAR(255) NOT NULL,
    Role NVARCHAR(50) NOT NULL, -- 'user' or 'assistant'
    Content NVARCHAR(MAX) NOT NULL,
    Rating NVARCHAR(10) NULL, -- 'up', 'down', or NULL
    Timestamp DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    FOREIGN KEY (SessionId) REFERENCES ChatSessions(SessionId) ON DELETE CASCADE,
    INDEX IX_ChatMessages_SessionId (SessionId),
    INDEX IX_ChatMessages_Timestamp (Timestamp)
);
GO

-- Table: Documents
-- Stores document metadata for RAG processing
CREATE TABLE Documents (
    DocumentId NVARCHAR(255) PRIMARY KEY, -- Unique document identifier
    FileName NVARCHAR(500) NOT NULL, -- File name without extension
    FileExtension NVARCHAR(50) NOT NULL, -- File extension (e.g., "pdf", "docx", "txt")
    IsActive BIT NOT NULL DEFAULT 1, -- Active/archived flag
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    INDEX IX_Documents_FileName (FileName),
    INDEX IX_Documents_FileExtension (FileExtension),
    INDEX IX_Documents_IsActive (IsActive),
    INDEX IX_Documents_CreatedAt (CreatedAt DESC)
);
GO

-- =============================================
-- STEP 4: Create Stored Procedures for Chat Sessions
-- =============================================

-- Get all sessions for a user (ordered by UpdatedAt DESC for most recent first)
CREATE PROCEDURE sp_GetUserSessions
    @UserId NVARCHAR(255)
AS
BEGIN
    SELECT 
        SessionId,
        Title,
        SelectedDocumentIds,
        CreatedAt,
        UpdatedAt
    FROM ChatSessions
    WHERE UserId = @UserId
    ORDER BY UpdatedAt DESC;
END;
GO

-- Get messages for a session (ordered by Timestamp ASC for chronological order)
CREATE PROCEDURE sp_GetSessionMessages
    @SessionId NVARCHAR(255)
AS
BEGIN
    SELECT 
        MessageId,
        Role,
        Content,
        Rating,
        Timestamp
    FROM ChatMessages
    WHERE SessionId = @SessionId
    ORDER BY Timestamp ASC;
END;
GO

-- Create a new session
CREATE PROCEDURE sp_CreateSession
    @SessionId NVARCHAR(255),
    @UserId NVARCHAR(255),
    @Title NVARCHAR(500),
    @SelectedDocumentIds NVARCHAR(MAX) = '[]'
AS
BEGIN
    INSERT INTO ChatSessions (SessionId, UserId, Title, SelectedDocumentIds, CreatedAt, UpdatedAt)
    VALUES (@SessionId, @UserId, @Title, @SelectedDocumentIds, GETUTCDATE(), GETUTCDATE());
END;
GO

-- Add a message to a session
CREATE PROCEDURE sp_AddMessage
    @MessageId NVARCHAR(255),
    @SessionId NVARCHAR(255),
    @Role NVARCHAR(50),
    @Content NVARCHAR(MAX),
    @Rating NVARCHAR(10) = NULL
AS
BEGIN
    INSERT INTO ChatMessages (MessageId, SessionId, Role, Content, Rating, Timestamp)
    VALUES (@MessageId, @SessionId, @Role, @Content, @Rating, GETUTCDATE());
    
    -- Update session's UpdatedAt timestamp
    UPDATE ChatSessions
    SET UpdatedAt = GETUTCDATE()
    WHERE SessionId = @SessionId;
END;
GO

-- Update message rating
CREATE PROCEDURE sp_UpdateMessageRating
    @MessageId NVARCHAR(255),
    @Rating NVARCHAR(10) -- 'up', 'down', or NULL
AS
BEGIN
    UPDATE ChatMessages
    SET Rating = @Rating
    WHERE MessageId = @MessageId;
END;
GO

-- =============================================
-- STEP 5: Create Stored Procedures for Documents
-- =============================================

-- Get all active documents
CREATE PROCEDURE sp_GetActiveDocuments
AS
BEGIN
    SELECT 
        DocumentId,
        FileName,
        FileExtension,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM Documents
    WHERE IsActive = 1
    ORDER BY CreatedAt DESC;
END;
GO

-- Create or Update document (UPSERT)
CREATE PROCEDURE sp_UpsertDocument
    @DocumentId NVARCHAR(255),
    @FileName NVARCHAR(500),
    @FileExtension NVARCHAR(50)
AS
BEGIN
    IF EXISTS (SELECT 1 FROM Documents WHERE DocumentId = @DocumentId)
    BEGIN
        -- Update existing document
        UPDATE Documents
        SET FileName = @FileName,
            FileExtension = @FileExtension,
            UpdatedAt = GETUTCDATE()
        WHERE DocumentId = @DocumentId;
    END
    ELSE
    BEGIN
        -- Insert new document
        INSERT INTO Documents (
            DocumentId, FileName, FileExtension, CreatedAt, UpdatedAt
        )
        VALUES (
            @DocumentId, @FileName, @FileExtension, GETUTCDATE(), GETUTCDATE()
        );
    END
END;
GO

-- Update document status (activate/deactivate)
CREATE PROCEDURE sp_UpdateDocumentStatus
    @DocumentId NVARCHAR(255),
    @IsActive BIT
AS
BEGIN
    UPDATE Documents
    SET IsActive = @IsActive,
        UpdatedAt = GETUTCDATE()
    WHERE DocumentId = @DocumentId;
END;
GO

-- Delete document (soft delete by setting IsActive = 0)
CREATE PROCEDURE sp_DeleteDocument
    @DocumentId NVARCHAR(255)
AS
BEGIN
    UPDATE Documents
    SET IsActive = 0,
        UpdatedAt = GETUTCDATE()
    WHERE DocumentId = @DocumentId;
END;
GO

-- =============================================
-- STEP 6: Verification Queries
-- =============================================

-- Check if tables were created
SELECT 
    TABLE_NAME,
    TABLE_TYPE
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME IN ('ChatSessions', 'ChatMessages', 'Documents')
ORDER BY TABLE_NAME;
GO

-- Check if stored procedures were created
SELECT 
    ROUTINE_NAME,
    ROUTINE_TYPE
FROM INFORMATION_SCHEMA.ROUTINES
WHERE ROUTINE_NAME LIKE 'sp_%'
ORDER BY ROUTINE_NAME;
GO

-- =============================================
-- Script completed successfully!
-- =============================================

