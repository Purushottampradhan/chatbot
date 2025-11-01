import { configureStore } from '@reduxjs/toolkit';
import authSlice from './authSlice';
import chatSlice from './chatSlice';
import policySlice from './policySlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    chat: chatSlice,
    policy: policySlice
  }
});
