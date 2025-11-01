import React from 'react';

const Message = ({ message }) => {
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: true,
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className={`message ${message.sender}`}>
      <div className="message-bubble">
        <p>{message.message}</p>
        <span className="message-time">
          {formatTime(message.timestamp || Date.now())}
        </span>
      </div>
    </div>
  );
};

export default Message;
