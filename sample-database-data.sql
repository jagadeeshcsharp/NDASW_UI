-- =============================================
-- Sample Data for All Database Tables
-- =============================================
-- This script inserts sample data into ChatSessions, ChatMessages, and Documents tables
-- Execute this after running complete-database-schema-with-drop.sql
-- 
-- ID Format Notes:
-- - Session IDs: timestamp-randomstring (e.g., "1704567890123-47ftl4kyg")
-- - Message IDs: timestamp-randomstring (e.g., "1704567890123-5x2aq6k08")
-- - Document IDs: Simple strings like SharePoint IDs (e.g., "1", "2", "3")
-- =============================================

-- =============================================
-- 1. Documents Table Sample Data
-- =============================================
-- Stores document metadata for RAG processing
-- Document IDs match SharePoint document IDs (simple string format)

INSERT INTO Documents (DocumentId, FileName, FileExtension, IsActive, CreatedAt, UpdatedAt)
VALUES
    ('1', 'Employee Handbook', 'pdf', 1, '2024-01-05T10:00:00.000Z', '2024-01-05T10:00:00.000Z'),
    ('2', 'Product Catalog 2024', 'pdf', 1, '2024-01-05T11:30:00.000Z', '2024-01-05T11:30:00.000Z'),
    ('3', 'Company Policies', 'docx', 1, '2024-01-05T12:15:00.000Z', '2024-01-05T12:15:00.000Z'),
    ('4', 'Technical Documentation', 'pdf', 1, '2024-01-05T14:20:00.000Z', '2024-01-05T14:20:00.000Z'),
    ('5', 'Sales Report Q1', 'xlsx', 1, '2024-01-05T16:45:00.000Z', '2024-01-05T16:45:00.000Z'),
    ('6', 'Old Policy Document', 'pdf', 0, '2024-01-05T08:00:00.000Z', '2024-01-05T18:00:00.000Z'); -- Inactive document
GO

-- =============================================
-- 2. ChatSessions Table Sample Data
-- =============================================
-- Stores chat sessions/conversations
-- Session IDs: timestamp-randomstring format (matches localStorage format)

INSERT INTO ChatSessions (SessionId, UserId, Title, SelectedDocumentIds, CreatedAt, UpdatedAt)
VALUES
    ('1704567890123-47ftl4kyg', 'user@example.com', 'Questions about Employee Benefits', '["1"]', '2024-01-05T10:00:00.000Z', '2024-01-05T10:15:00.000Z'),
    ('1704571495123-n5reenryd', 'user@example.com', 'Product Information Inquiry', '["2"]', '2024-01-05T11:00:00.000Z', '2024-01-05T11:20:00.000Z'),
    ('1704575095123-8k2mh9pwx', 'admin@example.com', 'Company Policy Discussion', '["3"]', '2024-01-05T12:00:00.000Z', '2024-01-05T12:30:00.000Z'),
    ('1704578695123-2q7vx4nrt', 'user@example.com', 'Technical Support Questions', '["4"]', '2024-01-05T14:00:00.000Z', '2024-01-05T14:45:00.000Z');
GO

-- =============================================
-- 3. ChatMessages Table Sample Data
-- =============================================
-- Stores individual messages (questions and answers) in conversations
-- Role: 'user' = question, 'assistant' = answer
-- Message IDs: timestamp-randomstring format (matches localStorage format)

-- Session 1: Employee Benefits Questions (SessionId: 1704567890123-47ftl4kyg)
INSERT INTO ChatMessages (MessageId, SessionId, Role, Content, Rating, Timestamp)
VALUES
    ('1704567890123-5x2aq6k08', '1704567890123-47ftl4kyg', 'user', 'What are the vacation policies?', NULL, '2024-01-05T10:00:00.000Z'),
    ('1704567890124-mg78p9xnq', '1704567890123-47ftl4kyg', 'assistant', 'According to the Employee Handbook, employees are entitled to 15 days of paid vacation per year for the first 3 years, and 20 days after that. Vacation requests should be submitted at least 2 weeks in advance.', 'up', '2024-01-05T10:01:00.000Z'),
    ('1704567890125-k3h9m2pwx', '1704567890123-47ftl4kyg', 'user', 'What about sick leave?', NULL, '2024-01-05T10:05:00.000Z'),
    ('1704567890126-7n4vx8qrt', '1704567890123-47ftl4kyg', 'assistant', 'Employees receive 10 days of paid sick leave per year. Unused sick leave does not carry over to the next year.', NULL, '2024-01-05T10:06:00.000Z'),
    ('1704567890127-9p2k5mhwx', '1704567890123-47ftl4kyg', 'user', 'Can I work from home?', NULL, '2024-01-05T10:10:00.000Z'),
    ('1704567890128-4r7t3n9vx', '1704567890123-47ftl4kyg', 'assistant', 'Yes, remote work is allowed for eligible positions. Please discuss with your manager and submit a remote work request form at least one week in advance.', 'up', '2024-01-05T10:11:00.000Z');

-- Session 2: Product Information (SessionId: 1704571495123-n5reenryd)
INSERT INTO ChatMessages (MessageId, SessionId, Role, Content, Rating, Timestamp)
VALUES
    ('1704571495123-2q8vx4nrt', '1704571495123-n5reenryd', 'user', 'What products do you offer?', NULL, '2024-01-05T11:00:00.000Z'),
    ('1704571495124-6m9p3k7wx', '1704571495123-n5reenryd', 'assistant', 'We offer a wide range of products including software solutions, hardware components, and consulting services. Our 2024 catalog includes over 200 products across 15 categories.', 'up', '2024-01-05T11:01:00.000Z'),
    ('1704571495125-8h4n2q9rt', '1704571495123-n5reenryd', 'user', 'What is the pricing for enterprise solutions?', NULL, '2024-01-05T11:05:00.000Z'),
    ('1704571495126-3v7x5m8pwx', '1704571495123-n5reenryd', 'assistant', 'Enterprise pricing is customized based on your specific needs. Please contact our sales team for a detailed quote. Base pricing starts at $10,000 per year for up to 100 users.', NULL, '2024-01-05T11:06:00.000Z'),
    ('1704571495127-9k2h6n4qrt', '1704571495123-n5reenryd', 'user', 'Do you offer discounts for non-profits?', NULL, '2024-01-05T11:10:00.000Z'),
    ('1704571495128-5p8m3v7xwx', '1704571495123-n5reenryd', 'assistant', 'Yes, we offer a 25% discount for verified non-profit organizations. Please provide your tax-exempt status documentation when requesting a quote.', 'down', '2024-01-05T11:11:00.000Z');

-- Session 3: Company Policy Discussion (SessionId: 1704575095123-8k2mh9pwx)
INSERT INTO ChatMessages (MessageId, SessionId, Role, Content, Rating, Timestamp)
VALUES
    ('1704575095123-7n9v2x4rt', '1704575095123-8k2mh9pwx', 'user', 'What is the dress code policy?', NULL, '2024-01-05T12:00:00.000Z'),
    ('1704575095124-3h6k8p5mwx', '1704575095123-8k2mh9pwx', 'assistant', 'Our dress code is business casual. Employees should dress professionally and appropriately for their role. Jeans and t-shirts are generally acceptable, but please avoid overly casual attire in client-facing situations.', 'up', '2024-01-05T12:01:00.000Z'),
    ('1704575095125-9q4n7v2xrt', '1704575095123-8k2mh9pwx', 'user', 'What are the working hours?', NULL, '2024-01-05T12:10:00.000Z'),
    ('1704575095126-2m8k5h3pwx', '1704575095123-8k2mh9pwx', 'assistant', 'Standard working hours are 9:00 AM to 5:00 PM, Monday through Friday. Flexible hours are available with manager approval. Core hours (10:00 AM to 3:00 PM) must be covered.', NULL, '2024-01-05T12:11:00.000Z');

-- Session 4: Technical Support (SessionId: 1704578695123-2q7vx4nrt)
INSERT INTO ChatMessages (MessageId, SessionId, Role, Content, Rating, Timestamp)
VALUES
    ('1704578695123-6n9v3x7rt', '1704578695123-2q7vx4nrt', 'user', 'How do I reset my password?', NULL, '2024-01-05T14:00:00.000Z'),
    ('1704578695124-4h8k2p6mwx', '1704578695123-2q7vx4nrt', 'assistant', 'To reset your password, go to the login page and click "Forgot Password". Enter your email address and follow the instructions sent to your email. The reset link will expire in 24 hours.', 'up', '2024-01-05T14:01:00.000Z'),
    ('1704578695125-7q5n9v4xrt', '1704578695123-2q7vx4nrt', 'user', 'I cannot access the shared drive. What should I do?', NULL, '2024-01-05T14:10:00.000Z'),
    ('1704578695126-3m7k4h8pwx', '1704578695123-2q7vx4nrt', 'assistant', 'First, verify your network connection. If connected, try disconnecting and reconnecting to the VPN. If the issue persists, contact IT support with your username and a description of the error message you see.', NULL, '2024-01-05T14:11:00.000Z'),
    ('1704578695127-9n2v6x8rt', '1704578695123-2q7vx4nrt', 'user', 'How do I install the latest software update?', NULL, '2024-01-05T14:20:00.000Z'),
    ('1704578695128-5h3k7p9mwx', '1704578695123-2q7vx4nrt', 'assistant', 'Software updates are typically pushed automatically. If you need to manually install, download the update from the internal portal, run the installer as administrator, and follow the on-screen instructions. Restart your computer after installation.', 'up', '2024-01-05T14:21:00.000Z');
GO

-- =============================================
-- Verification Queries
-- =============================================

-- View all documents
SELECT * FROM Documents ORDER BY CreatedAt DESC;
GO

-- View all sessions with message counts
SELECT 
    s.SessionId,
    s.UserId,
    s.Title,
    s.SelectedDocumentIds,
    COUNT(m.MessageId) AS MessageCount,
    s.CreatedAt,
    s.UpdatedAt
FROM ChatSessions s
LEFT JOIN ChatMessages m ON s.SessionId = m.SessionId
GROUP BY s.SessionId, s.UserId, s.Title, s.SelectedDocumentIds, s.CreatedAt, s.UpdatedAt
ORDER BY s.UpdatedAt DESC;
GO

-- View all messages for a specific session (example: 1704567890123-47ftl4kyg)
SELECT 
    MessageId,
    Role,
    Content,
    Rating,
    Timestamp
FROM ChatMessages
WHERE SessionId = '1704567890123-47ftl4kyg'
ORDER BY Timestamp ASC;
GO

-- View messages with ratings
SELECT 
    m.MessageId,
    m.SessionId,
    s.Title AS SessionTitle,
    m.Role,
    LEFT(m.Content, 50) AS ContentPreview,
    m.Rating,
    m.Timestamp
FROM ChatMessages m
INNER JOIN ChatSessions s ON m.SessionId = s.SessionId
WHERE m.Rating IS NOT NULL
ORDER BY m.Timestamp DESC;
GO

-- =============================================
-- Sample Data Insertion Complete!
-- =============================================

