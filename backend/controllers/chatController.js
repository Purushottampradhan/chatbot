const Chat = require('../models/Chat');
const Policy = require('../models/Policy');

exports.getChatHistory = async (req, res) => {
  try {
    const { userId, sessionId } = req.params;
    
    const chat = await Chat.findOne({ 
      userId, 
      sessionId 
    }).populate('userId', 'name email');

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    res.json({ success: true, data: chat });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllChats = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const chats = await Chat.find()
      .populate('userId', 'name email')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Chat.countDocuments();

    res.json({
      success: true,
      data: {
        chats,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.searchPolicies = async (query) => {
  try {
    const policies = await Policy.find({
      $text: { $search: query },
      isActive: true
    }).limit(5);
    
    return policies;
  } catch (error) {
    console.error('Error searching policies:', error);
    return [];
  }
};

exports.generateBotResponse = async (message, userId) => {
  try {
    // Simple rule-based response (replace with your AI model)
    let response = "I'm a chatbot assistant. How can I help you?";
    let shouldStartCollection = false;
    
    const lowerMessage = message.toLowerCase();
    
    // Check if user wants to start document collection
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || 
        lowerMessage.includes('hey') || lowerMessage.includes('start')) {
      response = "Hello! Welcome! I'll help you verify your documents.\n\n" +
                 "Please upload document.\n" +
                 "Upload an image/PDF of your PAN card";
      shouldStartCollection = true;
    } else if (lowerMessage.includes('help')) {
      response = "I can help you with:\n- Document verification (PAN, Aadhar, Email, Phone)\n- Company policies\n- HR questions\n\nWhat would you like to know?";
    }
    if(shouldStartCollection){
      return { response, shouldStartCollection: true };
    } 
  } catch (error) {
    console.error('Error generating bot response:', error);
    return { response: "I'm sorry, I encountered an error. Please try again." };
  }
};

