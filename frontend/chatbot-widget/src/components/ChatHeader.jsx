import React from 'react';

const ChatHeader = ({ title, onClose, isConnected }) => {
  return (
    <div className="chat-header">
      <div className="chat-header-info">
        <h3>{title}</h3>
        <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? 'Online' : 'Offline'}
        </span>
      </div>
      <button className="chat-close-btn" onClick={onClose}>
        ×
      </button>
    </div>
  );
};

export default ChatHeader;
