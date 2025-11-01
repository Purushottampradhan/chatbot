const { Server } = require('socket.io');
const Chat = require('../models/Chat');
const User = require('../models/User');
const { generateBotResponse } = require('../controllers/chatController');
const DocumentCollection = require('../models/DocumentCollection');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// Helper function to check if message is a document input
function checkDocumentIntent(message) {
  const clean = message.trim();
  const lower = clean.toLowerCase();

  // PAN
  const panMatch = clean.match(/[A-Z]{5}[0-9]{4}[A-Z]{1}/i);
  if (panMatch) {
    return { type: 'pan', value: panMatch[0].toUpperCase() };
  }

  // Aadhaar
  const aadhaarMatch = clean.match(/\d{4}[\s-]*\d{4}[\s-]*\d{4}/);
  if (aadhaarMatch) {
    return { type: 'aadhar', value: aadhaarMatch[0].replace(/\D/g, '') };
  }

  // Email
  if (/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(lower)) {
    return { type: 'email', value: lower };
  }

  // Phone
  const phoneClean = clean.replace(/\s|[-]/g, '').replace(/^\+?91/, '');
  if (/^[6-9]\d{9}$/.test(phoneClean)) {
    return { type: 'phone', value: phoneClean };
  }

  return null;
}


// Helper function to handle document validation
async function handleDocumentValidation(socket, io, sessionId, userId, documentData, chat) {
  const PYTHON_SERVICE_URL = process.env.PYTHON_VALIDATION_SERVICE_URL || 'http://localhost:8000';
  
  // Find or create document collection
  let docCollection = await DocumentCollection.findOne({ sessionId });
  console.log("docCollection",docCollection);
  if (!docCollection) {
    docCollection = await DocumentCollection.create({
      sessionId,
      userId: userId,
      currentStep: 'pan',
      documents: {
        pan: { value: null, isVerified: false, attempts: 0 },
        aadhar: { value: null, isVerified: false, attempts: 0 },
        email: { value: null, isVerified: false, attempts: 0 },
        phone: { value: null, isVerified: false, attempts: 0 }
      }
    });
  }
  
  // Check if document matches current step
  const steps = ['pan', 'aadhar', 'email', 'phone'];
  const expectedField = docCollection.currentStep;
  console.log("expectedField",expectedField);
  if (expectedField && expectedField !== 'completed' && documentData?.type !== expectedField) {
    // Wrong field type
    const fieldNames = {
      pan: 'PAN card',
      aadhar: 'Aadhar card',
      email: 'Email',
      phone: 'Phone number'
    };
    
    const botMessage = {
      sender: 'bot',
      message: `I was expecting your ${fieldNames[expectedField]}. Please provide that first.`,
      messageType: 'text'
    };
    chat.messages.push(botMessage);
    await chat.save();
    
    io.to(`${userId}_${sessionId}`).emit('message', botMessage);
    return false;
  }
  
  // Validate the document
  try {
    const payload = {
      field_type: documentData.type,
      value: documentData.value
    };
    
    const response = await axios.post(
      `${PYTHON_SERVICE_URL}/validate`,
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    const validationResult = response.data;
    console.log("validationResult",validationResult);
    if (validationResult.is_valid) {
      // Document is valid
      docCollection.documents[documentData.type].value = validationResult.value;
      docCollection.documents[documentData.type].isVerified = true;
      docCollection.documents[documentData.type].verifiedAt = new Date();
      docCollection.documents[documentData.type].attempts += 1;
      
      // Move to next step
      const currentIndex = steps.indexOf(expectedField);
      if (currentIndex < steps.length - 1) {
        docCollection.currentStep = steps[currentIndex + 1];
      } else {
        docCollection.currentStep = 'completed';
        docCollection.isCompleted = true;
        docCollection.completedAt = new Date();
      }
      
      await docCollection.save();
      
      // Send success message
      const fieldNames = {
        pan: 'PAN card',
        aadhar: 'Aadhar card',
        email: 'Email',
        phone: 'Phone number'
      };
      
      let successMessage = `✅ ${fieldNames[documentData.type]} verified successfully!`;
      
      if (!docCollection.isCompleted) {
        const nextFieldName = fieldNames[docCollection.currentStep];
        successMessage += `\n\nNow, please provide your ${nextFieldName}.`;
      } else {
        successMessage += `\n\n🎉 All documents verified successfully! Thank you.`;
      }
      
      const botMessage = {
        sender: 'bot',
        message: successMessage,
        messageType: 'text'
      };
      chat.messages.push(botMessage);
      await chat.save();
      
      io.to(`${userId}_${sessionId}`).emit('message', botMessage);
      return true;
    } else {
      console.log("Document is invalid");
      // Document is invalid
      docCollection.documents[documentData.type].attempts += 1;
      docCollection.documents[documentData.type].lastAttempt = new Date();
      await docCollection.save();
      
      let errorMessage = `❌ Invalid ${documentData.type.toUpperCase()}. `;
      errorMessage += validationResult.error_message || 'Please check and try again.';
      
      if (validationResult.suggestions && validationResult.suggestions.length > 0) {
        errorMessage += '\n\nSuggestions:\n';
        validationResult.suggestions.forEach((suggestion, idx) => {
          errorMessage += `${idx + 1}. ${suggestion}\n`;
        });
      }
      
      const botMessage = {
        sender: 'bot',
        message: errorMessage,
        messageType: 'text'
      };
      chat.messages.push(botMessage);
      await chat.save();
      
      io.to(`${userId}_${sessionId}`).emit('message', botMessage);
      return false;
    }
  } catch (error) {
    console.error('Document validation error:', error);
    const botMessage = {
      sender: 'bot',
      message: 'Sorry, I encountered an error while validating. Please try again.',
      messageType: 'text'
    };
    chat.messages.push(botMessage);
    await chat.save();
    io.to(`${userId}_${sessionId}`).emit('message', botMessage);
    return false;
  }
}

function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join', ({ userId, sessionId }) => {
      // Ensure sessionId exists
      const finalSessionId = sessionId || uuidv4();
      const finalUserId = userId || socket.id;
      
      socket.join(`${finalUserId}_${finalSessionId}`);
      console.log(`User ${finalUserId} joined session ${finalSessionId}`);
      
      // Store these values on the socket for later use
      socket.userId = finalUserId;
      socket.sessionId = finalSessionId;
    });

    socket.on('user_message', async ({ userId, sessionId, message }) => {
      try {
        // Use fallback values if not provided
        const effectiveUserId = userId || socket.userId || socket.id;
        const effectiveSessionId = sessionId || socket.sessionId || uuidv4();

        console.log(`Processing message for userId: ${effectiveUserId}, sessionId: ${effectiveSessionId}`);

        // Find or create user first (for registered users)
        let user = null;
        if (effectiveUserId.startsWith('user_') || effectiveUserId.match(/^[0-9a-fA-F]{24}$/)) {
          // This looks like a real user ID
          user = await User.findById(effectiveUserId);
          if (!user) {
            // Create anonymous user
            user = await User.create({
              name: `Anonymous User ${effectiveUserId.slice(-6)}`,
              email: `anonymous_${effectiveUserId}@chatbot.local`,
              password: 'temp123',
              role: 'user'
            });
            console.log(`Created new anonymous user: ${user._id}`);
          }
        }

        // Find or create chat
        let chat = await Chat.findOne({ 
          sessionId: effectiveSessionId 
        });
        
        if (!chat) {
          chat = new Chat({ 
            userId: user ? user._id : null,
            sessionId: effectiveSessionId,
            messages: [],
            isAnonymous: !user
          });
          console.log(`Created new chat session: ${effectiveSessionId}`);
        }

        // Add user message
        const userMessage = {
          sender: 'user',
          message,
          messageType: 'text'
        };
        chat.messages.push(userMessage);

        // Emit user message
        io.to(`${effectiveUserId}_${effectiveSessionId}`).emit('message', userMessage);

        // Check if this is a document input
        const documentData = checkDocumentIntent(message);
        console.log("documentData",documentData);
        let handled = false;
        const lowerMessage = message.toLowerCase();
        if (! (lowerMessage.includes('hello') || lowerMessage.includes('hi') || 
        lowerMessage.includes('hey') || lowerMessage.includes('start'))){
          // Handle document validation
          handled = await handleDocumentValidation(
            socket, 
            io, 
            effectiveSessionId, 
            effectiveUserId, 
            documentData, 
            chat
          );
        }
        
        // If not handled as document, generate regular bot response
        if (!handled) {
          const botResponseResult = await generateBotResponse(message, effectiveUserId);
          const botResponseText = typeof botResponseResult === 'string' 
            ? botResponseResult 
            : botResponseResult.response;
          const shouldStartCollection = typeof botResponseResult === 'object' 
            ? botResponseResult.shouldStartCollection 
            : false;
          
          // Add bot message
          const botMessage = {
            sender: 'bot',
            message: botResponseText,
            messageType: 'text',
            metadata: {
              confidence: 0.8,
              intent: 'general',
              shouldStartCollection: shouldStartCollection
            }
          };
          chat.messages.push(botMessage);
          
          // If should start collection, initialize it
          if (shouldStartCollection) {
            let docCollection = await DocumentCollection.findOne({ sessionId: effectiveSessionId });
            if (!docCollection) {
              docCollection = await DocumentCollection.create({
                sessionId: effectiveSessionId,
                userId: effectiveUserId || null,
                currentStep: 'pan',
                documents: {
                  pan: { value: null, isVerified: false, attempts: 0 },
                  aadhar: { value: null, isVerified: false, attempts: 0 },
                  email: { value: null, isVerified: false, attempts: 0 },
                  phone: { value: null, isVerified: false, attempts: 0 }
                }
              });
            }
          }

          // Save chat
          await chat.save();

          // Simulate typing delay and stream response
          setTimeout(() => {
            io.to(`${effectiveUserId}_${effectiveSessionId}`).emit('typing', { isTyping: true });
          }, 100);

          setTimeout(() => {
            io.to(`${effectiveUserId}_${effectiveSessionId}`).emit('typing', { isTyping: false });
            io.to(`${effectiveUserId}_${effectiveSessionId}`).emit('message', botMessage);
          }, 1500);
        } else {
          // Document validation handled, just save chat
          await chat.save();
        }

      } catch (error) {
        console.error('Socket error:', error);
        socket.emit('error', { message: 'Something went wrong' });
      }
    });

    socket.on('start_document_collection', async ({ userId, sessionId }) => {
      try {
        const effectiveUserId = userId || socket.userId || socket.id;
        const effectiveSessionId = sessionId || socket.sessionId || uuidv4();
        
        // Find or create document collection
        let docCollection = await DocumentCollection.findOne({ sessionId: effectiveSessionId });
        if (!docCollection) {
          docCollection = await DocumentCollection.create({
            sessionId: effectiveSessionId,
            userId: effectiveUserId || null,
            currentStep: 'pan',
            documents: {
              pan: { value: null, isVerified: false, attempts: 0 },
              aadhar: { value: null, isVerified: false, attempts: 0 },
              email: { value: null, isVerified: false, attempts: 0 },
              phone: { value: null, isVerified: false, attempts: 0 }
            }
          });
        }
        
        const welcomeMessage = {
          sender: 'bot',
          message: `Welcome! I'll help you verify your documents.\n\nPlease provide your PAN card number (Format: ABCDE1234F)`,
          messageType: 'text'
        };
        
        io.to(`${effectiveUserId}_${effectiveSessionId}`).emit('message', welcomeMessage);
      } catch (error) {
        console.error('Start document collection error:', error);
        socket.emit('error', { message: 'Failed to start document collection' });
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
}

module.exports = { setupSocket };
