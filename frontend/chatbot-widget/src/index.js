import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import ChatWidget from './components/ChatWidget';

// Export for UMD build
if (typeof window !== 'undefined') {
  window.ChatbotWidget = {
    mount: (config) => {
      const container = document.getElementById(config.containerId || 'chatbot-widget');
      if (container) {
        const root = ReactDOM.createRoot(container);
        root.render(
          <Provider store={store}>
            <ChatWidget config={config} />
          </Provider>
        );
      } else {
        console.error('Chatbot container not found');
      }
    }
  };
}

// For development
if (process.env.NODE_ENV === 'development') {
  const container = document.getElementById('root');
  if (container) {
    const root = ReactDOM.createRoot(container);
    const devConfig = {
      socketUrl: 'http://localhost:5001',
      userId: 'dev-user',
      title: 'Dev Chat',
      theme: 'light'
    };
    
    root.render(
      <Provider store={store}>
        <ChatWidget config={devConfig} />
      </Provider>
    );
  }
}
