import { configureStore, createSlice } from '@reduxjs/toolkit';

// Chat slice
const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    messages: [],
    isConnected: false,
    isTyping: false,
    error: null,
    sessionId: null
  },
  reducers: {
    addMessage: (state, action) => {
      state.messages.push({
        ...action.payload,
        id: Date.now(),
        timestamp: new Date().toISOString()
      });
    },
    setConnection: (state, action) => {
        console.log("setConnection", action.payload);
      state.isConnected = action.payload;
    },
    setTyping: (state, action) => {
      state.isTyping = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearMessages: (state) => {
      state.messages = [];
    },
    setSessionId: (state, action) => {
      state.sessionId = action.payload;
    }
  }
});

// Widget UI slice
const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    isOpen: false,
    isMinimized: false,
    theme: 'light'
  },
  reducers: {
    toggleWidget: (state) => {
      state.isOpen = !state.isOpen;
    },
    minimizeWidget: (state) => {
      state.isMinimized = !state.isMinimized;
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
    }
  }
});

export const chatActions = chatSlice.actions;
export const uiActions = uiSlice.actions;

export const store = configureStore({
  reducer: {
    chat: chatSlice.reducer,
    ui: uiSlice.reducer
  }
});
