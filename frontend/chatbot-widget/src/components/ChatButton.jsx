import React from 'react';

const ChatButton = ({ onClick, config }) => {
  return (
    <button 
      className="chat-toggle-button"
      onClick={onClick}
      style={{ 
        backgroundColor: config.primaryColor || '#007bff',
        color: config.textColor || '#ffffff'
      }}
    >
      💬
    </button>
  );
};

export default ChatButton;
