import '@renderer/styles/main.css';
import { ChatApp } from '@renderer/components/ChatApp';

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  const app = new ChatApp();
  app.init();
});
