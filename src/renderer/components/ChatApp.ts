import { ChatMessage, ChatSession, IPCChannels } from '@shared/types';

export class ChatApp {
  private currentSession: ChatSession | null = null;
  private sessions: ChatSession[] = [];
  
  // DOM elements
  private chatMessages!: HTMLElement;
  private chatInput!: HTMLTextAreaElement;
  private sendButton!: HTMLButtonElement;
  private newChatBtn!: HTMLButtonElement;
  private sessionsList!: HTMLElement;
  private chatTitle!: HTMLElement;
  private welcomeScreen!: HTMLElement;

  constructor() {
    this.bindElements();
    this.setupEventListeners();
  }

  public init(): void {
    this.loadSessions();
    this.setupElectronAPI();
  }

  private bindElements(): void {
    this.chatMessages = document.getElementById('chatMessages')!;
    this.chatInput = document.getElementById('chatInput') as HTMLTextAreaElement;
    this.sendButton = document.getElementById('sendButton') as HTMLButtonElement;
    this.newChatBtn = document.getElementById('newChatBtn') as HTMLButtonElement;
    this.sessionsList = document.getElementById('sessionsList')!;
    this.chatTitle = document.getElementById('chatTitle')!;
    this.welcomeScreen = document.getElementById('welcomeScreen')!;
  }

  private setupEventListeners(): void {
    // Send message on button click
    this.sendButton.addEventListener('click', () => {
      this.sendMessage();
    });

    // Send message on Enter (but not Shift+Enter)
    this.chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Auto-resize textarea
    this.chatInput.addEventListener('input', () => {
      this.autoResizeTextarea();
    });

    // New chat button
    this.newChatBtn.addEventListener('click', () => {
      this.createNewChat();
    });

    // Update send button state
    this.chatInput.addEventListener('input', () => {
      this.updateSendButtonState();
    });
  }

  private setupElectronAPI(): void {
    if (window.electronAPI) {
      // Listen for new chat events from menu
      window.electronAPI.onNewChat(() => {
        this.createNewChat();
      });

      // Get app version and show in title
      window.electronAPI.getAppVersion().then(version => {
        document.title = `OpenConverse v${version}`;
      });
    }
  }

  private loadSessions(): void {
    // In a real app, this would load from storage
    // For now, we'll start with an empty state
    this.renderSessionsList();
    this.showWelcomeScreen();
  }

  private createNewChat(): void {
    const newSession: ChatSession = {
      id: this.generateId(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sessions.unshift(newSession);
    this.selectSession(newSession);
    this.renderSessionsList();
    this.focusInput();
  }

  private selectSession(session: ChatSession): void {
    this.currentSession = session;
    this.renderMessages();
    this.updateChatTitle();
    this.hideWelcomeScreen();
    this.updateSessionSelection();
  }

  private sendMessage(): void {
    const content = this.chatInput.value.trim();
    if (!content || !this.currentSession) return;

    // Create user message
    const userMessage: ChatMessage = {
      id: this.generateId(),
      content,
      timestamp: new Date(),
      role: 'user',
    };

    // Add to current session
    this.currentSession.messages.push(userMessage);
    this.currentSession.updatedAt = new Date();

    // Update title if it's still "New Chat"
    if (this.currentSession.title === 'New Chat') {
      this.currentSession.title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
      this.updateChatTitle();
      this.renderSessionsList();
    }

    // Clear input
    this.chatInput.value = '';
    this.autoResizeTextarea();
    this.updateSendButtonState();

    // Render messages
    this.renderMessages();

    // Simulate assistant response (in real app, this would call OpenRouter API)
    this.simulateAssistantResponse();
  }

  private simulateAssistantResponse(): void {
    if (!this.currentSession) return;

    // Show typing indicator
    this.showTypingIndicator();

    // Simulate API delay
    setTimeout(() => {
      this.hideTypingIndicator();

      const assistantMessage: ChatMessage = {
        id: this.generateId(),
        content: "I'm a simulated response. In the next steps, we'll integrate with OpenRouter API to provide real AI responses.",
        timestamp: new Date(),
        role: 'assistant',
      };

      this.currentSession!.messages.push(assistantMessage);
      this.currentSession!.updatedAt = new Date();
      this.renderMessages();
    }, 1000 + Math.random() * 2000); // Random delay between 1-3 seconds
  }

  private renderMessages(): void {
    if (!this.currentSession) return;

    this.chatMessages.innerHTML = '';

    this.currentSession.messages.forEach(message => {
      const messageEl = this.createMessageElement(message);
      this.chatMessages.appendChild(messageEl);
    });

    this.scrollToBottom();
  }

  private createMessageElement(message: ChatMessage): HTMLElement {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${message.role}`;
    
    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';
    contentEl.textContent = message.content;
    
    const timeEl = document.createElement('div');
    timeEl.className = 'message-time';
    timeEl.textContent = this.formatTime(message.timestamp);
    
    messageEl.appendChild(contentEl);
    messageEl.appendChild(timeEl);
    
    return messageEl;
  }

  private renderSessionsList(): void {
    this.sessionsList.innerHTML = '';

    this.sessions.forEach(session => {
      const sessionEl = this.createSessionElement(session);
      this.sessionsList.appendChild(sessionEl);
    });
  }

  private createSessionElement(session: ChatSession): HTMLElement {
    const sessionEl = document.createElement('div');
    sessionEl.className = 'session-item';
    if (this.currentSession?.id === session.id) {
      sessionEl.classList.add('active');
    }

    const titleEl = document.createElement('div');
    titleEl.className = 'session-title';
    titleEl.textContent = session.title;

    const previewEl = document.createElement('div');
    previewEl.className = 'session-preview';
    const lastMessage = session.messages[session.messages.length - 1];
    previewEl.textContent = lastMessage ? 
      (lastMessage.content.substring(0, 50) + (lastMessage.content.length > 50 ? '...' : '')) : 
      'No messages';

    sessionEl.appendChild(titleEl);
    sessionEl.appendChild(previewEl);

    sessionEl.addEventListener('click', () => {
      this.selectSession(session);
    });

    return sessionEl;
  }

  private showTypingIndicator(): void {
    const typingEl = document.createElement('div');
    typingEl.className = 'typing-indicator';
    typingEl.id = 'typingIndicator';
    
    const dotsEl = document.createElement('div');
    dotsEl.className = 'typing-dots';
    
    for (let i = 0; i < 3; i++) {
      const dotEl = document.createElement('div');
      dotEl.className = 'typing-dot';
      dotsEl.appendChild(dotEl);
    }
    
    typingEl.appendChild(dotsEl);
    this.chatMessages.appendChild(typingEl);
    this.scrollToBottom();
  }

  private hideTypingIndicator(): void {
    const typingEl = document.getElementById('typingIndicator');
    if (typingEl) {
      typingEl.remove();
    }
  }

  private showWelcomeScreen(): void {
    this.welcomeScreen.style.display = 'flex';
  }

  private hideWelcomeScreen(): void {
    this.welcomeScreen.style.display = 'none';
  }

  private updateChatTitle(): void {
    if (this.currentSession) {
      this.chatTitle.textContent = this.currentSession.title;
    } else {
      this.chatTitle.textContent = 'OpenConverse';
    }
  }

  private updateSessionSelection(): void {
    this.renderSessionsList();
  }

  private autoResizeTextarea(): void {
    this.chatInput.style.height = 'auto';
    this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 120) + 'px';
  }

  private updateSendButtonState(): void {
    const hasContent = this.chatInput.value.trim().length > 0;
    this.sendButton.disabled = !hasContent;
  }

  private scrollToBottom(): void {
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  private focusInput(): void {
    this.chatInput.focus();
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
