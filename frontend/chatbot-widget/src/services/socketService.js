import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { chatActions } from '../redux/store';

let socket = null;

export const connectSocket = (config, dispatch) => {
  const socketUrl = config.socketUrl || 'http://localhost:5001';
  
  socket = io(socketUrl, {
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    maxReconnectionAttempts: 5
  });

  // Always generate sessionId if not provided
  const sessionId = config.sessionId || uuidv4();
  // Always generate userId if not provided
  const userId = config.userId || `anonymous_${uuidv4()}`;
  
  // Store these in config for later use
  config.sessionId = sessionId;
  config.userId = userId;
  
  dispatch(chatActions.setSessionId(sessionId));

  socket.on('connect', () => {
    console.log('Connected to server');
    dispatch(chatActions.setConnection(true));
    dispatch(chatActions.setError(null));
    
    // Join room with guaranteed sessionId and userId
    socket.emit('join', { 
      userId, 
      sessionId 
    });
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
    dispatch(chatActions.setConnection(false));
  });

  socket.on('message', (message) => {
    dispatch(chatActions.addMessage(message));
  });

  socket.on('typing', ({ isTyping }) => {
    dispatch(chatActions.setTyping(isTyping));
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
    dispatch(chatActions.setError(error.message));
  });

  socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    dispatch(chatActions.setError('Failed to connect to server'));
  });

  return socket;
};

export const sendMessage = (message, config) => {
  if (socket && socket.connected) {
    // Use the sessionId and userId from config
    const sessionId = config.sessionId;
    const userId = config.userId;
    
    if (!sessionId || !userId) {
      console.error('SessionId or UserId not found');
      return;
    }
    
    socket.emit('user_message', {
      userId,
      sessionId,
      message
    });
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
