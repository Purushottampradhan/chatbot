import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { chatActions, uiActions } from '../redux/store';
import ChatWindow from './ChatWindow';
import ChatButton from './ChatButton';
import { connectSocket, disconnectSocket } from '../services/socketService';
import './ChatWidget.css';

const ChatWidget = ({ config }) => {
  const dispatch = useDispatch();
  const { isOpen } = useSelector(state => state.ui);
  const { isConnected } = useSelector(state => state.chat);

  useEffect(() => {
    // Initialize socket connection
    const socket = connectSocket(config, dispatch);
    
    return () => {
      disconnectSocket();
    };
  }, [config, dispatch]);

  const handleToggle = () => {
    dispatch(uiActions.toggleWidget());
  };

  return (
    <div className={`chatbot-widget ${config.theme || 'light'}`}>
      {isOpen ? (
        <ChatWindow 
          config={config} 
          onClose={handleToggle}
          isConnected={isConnected}
        />
      ) : (
        <ChatButton 
          onClick={handleToggle}
          config={config}
        />
      )}
    </div>
  );
};

export default ChatWidget;
