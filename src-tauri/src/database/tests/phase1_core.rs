/// Phase 1 Core tests for the new memory architecture
/// 
/// Tests the session → conversation → message flow

use crate::database::{
    models::*, providers::sqlite::SqliteProvider, DatabaseConfig, DatabaseError, 
    DatabaseManager, DatabaseProvider, MemoryRepo, Result
};
use std::fs;
use tempfile::tempdir;

#[cfg(test)]
mod tests {
    use super::*;

    async fn setup_test_db() -> Result<SqliteProvider> {
        // Use an in-memory database for tests to avoid file system issues
        let provider = SqliteProvider::new(":memory:").await?;
        provider.migrate().await?;
        Ok(provider)
    }

    #[tokio::test]
    async fn test_session_operations() {
        let provider = setup_test_db().await.unwrap();

        // Create session
        let create_session = CreateSession {
            name: "Test User".to_string(),
            role: Some("Developer".to_string()),
            goals: Some("Learn Rust".to_string()),
        };

        let session = provider.create_session(create_session).await.unwrap();
        assert_eq!(session.name, "Test User");
        assert_eq!(session.role, Some("Developer".to_string()));

        // Get sessions
        let sessions = provider.get_sessions().await.unwrap();
        assert_eq!(sessions.len(), 1);
        assert_eq!(sessions[0].name, "Test User");

        // Delete session
        let deleted = provider.delete_session(session.id).await.unwrap();
        assert!(deleted);

        let sessions = provider.get_sessions().await.unwrap();
        assert_eq!(sessions.len(), 0);
    }

    #[tokio::test]
    async fn test_conversation_operations() {
        let provider = setup_test_db().await.unwrap();

        // Create session first
        let create_session = CreateSession {
            name: "Test User".to_string(),
            role: None,
            goals: None,
        };
        let session = provider.create_session(create_session).await.unwrap();

        // Create conversation
        let create_conversation = CreateConversation {
            session_id: session.id,
            status: Some("active".to_string()),
        };

        let conversation = provider.create_conversation(create_conversation).await.unwrap();
        assert_eq!(conversation.session_id, session.id);
        assert_eq!(conversation.status, "active");

        // Get conversations
        let conversations = provider.get_conversations(Some(session.id)).await.unwrap();
        assert_eq!(conversations.len(), 1);

        // Delete conversation
        let deleted = provider.delete_conversation(conversation.id).await.unwrap();
        assert!(deleted);
    }

    #[tokio::test]
    async fn test_message_operations() {
        let provider = setup_test_db().await.unwrap();

        // Create session and conversation
        let create_session = CreateSession {
            name: "Test User".to_string(),
            role: None,
            goals: None,
        };
        let session = provider.create_session(create_session).await.unwrap();

        let create_conversation = CreateConversation {
            session_id: session.id,
            status: None,
        };
        let conversation = provider.create_conversation(create_conversation).await.unwrap();

        // Create message
        let create_message = CreateMessage {
            conversation_id: conversation.id,
            role: "user".to_string(),
            content: "Hello, world!".to_string(),
            embedding: None,
            recall_score: Some(0.8),
        };

        let message = provider.save_message(create_message).await.unwrap();
        assert_eq!(message.conversation_id, conversation.id);
        assert_eq!(message.role, "user");
        assert_eq!(message.content, "Hello, world!");
        assert_eq!(message.recall_score, Some(0.8));

        // Get recent messages
        let messages = provider.recent_messages(conversation.id, Some(10)).await.unwrap();
        assert_eq!(messages.len(), 1);
        assert_eq!(messages[0].content, "Hello, world!");

        // Delete message
        let deleted = provider.delete_message(message.id).await.unwrap();
        assert!(deleted);
    }

    #[tokio::test]
    async fn test_database_stats() {
        let provider = setup_test_db().await.unwrap();

        // Initially empty
        let stats = provider.get_database_stats().await.unwrap();
        assert_eq!(stats.session_count, 0);
        assert_eq!(stats.conversation_count, 0);
        assert_eq!(stats.message_count, 0);

        // Create some data
        let create_session = CreateSession {
            name: "Test User".to_string(),
            role: None,
            goals: None,
        };
        let session = provider.create_session(create_session).await.unwrap();

        let create_conversation = CreateConversation {
            session_id: session.id,
            status: None,
        };
        let conversation = provider.create_conversation(create_conversation).await.unwrap();

        let create_message = CreateMessage {
            conversation_id: conversation.id,
            role: "user".to_string(),
            content: "Test message".to_string(),
            embedding: None,
            recall_score: None,
        };
        provider.save_message(create_message).await.unwrap();

        // Check stats
        let stats = provider.get_database_stats().await.unwrap();
        assert_eq!(stats.session_count, 1);
        assert_eq!(stats.conversation_count, 1);
        assert_eq!(stats.message_count, 1);
    }

    #[tokio::test]
    async fn test_clear_all_data() {
        let provider = setup_test_db().await.unwrap();

        // Create test data
        let create_session = CreateSession {
            name: "Test User".to_string(),
            role: None,
            goals: None,
        };
        let session = provider.create_session(create_session).await.unwrap();

        let create_conversation = CreateConversation {
            session_id: session.id,
            status: None,
        };
        let conversation = provider.create_conversation(create_conversation).await.unwrap();

        let create_message = CreateMessage {
            conversation_id: conversation.id,
            role: "user".to_string(),
            content: "Test message".to_string(),
            embedding: None,
            recall_score: None,
        };
        provider.save_message(create_message).await.unwrap();

        // Clear all data
        provider.clear_all_data().await.unwrap();

        // Verify everything is cleared
        let stats = provider.get_database_stats().await.unwrap();
        assert_eq!(stats.session_count, 0);
        assert_eq!(stats.conversation_count, 0);
        assert_eq!(stats.message_count, 0);
    }
}
