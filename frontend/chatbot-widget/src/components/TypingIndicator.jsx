import React from 'react';

const TypingIndicator = () => {
  return (
    <div className="message bot">
      <div className="message-bubble typing">
        <div className="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
