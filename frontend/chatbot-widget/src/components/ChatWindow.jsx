import React, { useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ChatHeader from './ChatHeader';

const ChatWindow = ({ config, onClose, isConnected }) => {
  const messagesEndRef = useRef(null);
  const { messages, isTyping } = useSelector(state => state.chat);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  return (
    <div className="chat-window">
      <ChatHeader 
        title={config.title || 'Chat Support'}
        onClose={onClose}
        isConnected={isConnected}
      />
      
      <div className="chat-body">
        <MessageList messages={messages} isTyping={isTyping} />
        <div ref={messagesEndRef} />
      </div>
      
      <MessageInput config={config} />
    </div>
  );
};

export default ChatWindow;
