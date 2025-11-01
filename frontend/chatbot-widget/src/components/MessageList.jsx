import React from 'react';
import Message from './Message';
import TypingIndicator from './TypingIndicator';

const MessageList = ({ messages, isTyping }) => {
  return (
    <div className="message-list">
      {messages.length === 0 && (
        <div className="welcome-message">
          <p>👋 Hello! How can I help you today?</p>
        </div>
      )}
      
      {messages.map((message, index) => (
        <Message key={message.id || index} message={message} />
      ))}
      
      {isTyping && <TypingIndicator />}
    </div>
  );
};

export default MessageList;
