const DocumentCollection = require('../models/DocumentCollection');
const { v4: uuidv4 } = require('uuid');

/**
 * Initialize document collection for a session
 */
exports.initializeCollection = async (req, res) => {
  try {
    const { sessionId, userId } = req.body;
    
    let docCollection = await DocumentCollection.findOne({ sessionId });
    
    if (!docCollection) {
      docCollection = await DocumentCollection.create({
        sessionId: sessionId || uuidv4(),
        userId: userId || null,
        currentStep: 'pan',
        documents: {
          pan: { value: null, isVerified: false, attempts: 0 },
          aadhar: { value: null, isVerified: false, attempts: 0 },
          email: { value: null, isVerified: false, attempts: 0 },
          phone: { value: null, isVerified: false, attempts: 0 }
        },
        isCompleted: false
      });
    }
    
    res.json({
      success: true,
      data: {
        sessionId: docCollection.sessionId,
        currentStep: docCollection.currentStep,
        progress: getProgress(docCollection)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get current collection status
 */
exports.getStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const docCollection = await DocumentCollection.findOne({ sessionId });
    
    if (!docCollection) {
      return res.status(404).json({ error: 'Document collection not found' });
    }
    
    res.json({
      success: true,
      data: {
        sessionId: docCollection.sessionId,
        currentStep: docCollection.currentStep,
        progress: getProgress(docCollection),
        documents: docCollection.documents
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Submit and validate a document
 */
exports.submitDocument = async (req, res) => {
  try {
    const { sessionId, fieldType, value } = req.body;
    
    if (!sessionId || !fieldType || !value) {
      return res.status(400).json({
        success: false,
        error: 'sessionId, fieldType, and value are required'
      });
    }
    
    const docCollection = await DocumentCollection.findOne({ sessionId });
    
    if (!docCollection) {
      return res.status(404).json({ error: 'Document collection not found' });
    }
    
    // Validate the document using Python service
    const axios = require('axios');
    const PYTHON_SERVICE_URL = process.env.PYTHON_VALIDATION_SERVICE_URL || 'http://localhost:8000';
    
    const formData = new URLSearchParams();
    formData.append('field_type', fieldType);
    formData.append('value', value);
    
    let validationResult;
    try {
      const response = await axios.post(
        `${PYTHON_SERVICE_URL}/validate`,
        formData,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );
      validationResult = response.data;
    } catch (error) {
      console.error('Python service error:', error.message);
      return res.status(500).json({
        success: false,
        error: 'Validation service is unavailable'
      });
    }
    
    // Update the document collection
    if (validationResult.is_valid) {
      docCollection.documents[fieldType].value = validationResult.value;
      docCollection.documents[fieldType].isVerified = true;
      docCollection.documents[fieldType].verifiedAt = new Date();
      docCollection.documents[fieldType].attempts = (docCollection.documents[fieldType].attempts || 0) + 1;
      
      // Move to next step
      const steps = ['pan', 'aadhar', 'email', 'phone'];
      const currentIndex = steps.indexOf(docCollection.currentStep);
      
      if (currentIndex < steps.length - 1) {
        docCollection.currentStep = steps[currentIndex + 1];
      } else {
        docCollection.currentStep = 'completed';
        docCollection.isCompleted = true;
        docCollection.completedAt = new Date();
      }
      
      await docCollection.save();
      
      res.json({
        success: true,
        is_valid: true,
        message: `${fieldType.toUpperCase()} verified successfully!`,
        currentStep: docCollection.currentStep,
        progress: getProgress(docCollection),
        isCompleted: docCollection.isCompleted
      });
    } else {
      // Document is invalid
      docCollection.documents[fieldType].attempts = (docCollection.documents[fieldType].attempts || 0) + 1;
      docCollection.documents[fieldType].lastAttempt = new Date();
      await docCollection.save();
      
      res.json({
        success: true,
        is_valid: false,
        message: validationResult.error_message,
        suggestions: validationResult.suggestions || [],
        attempts: docCollection.documents[fieldType].attempts
      });
    }
  } catch (error) {
    console.error('Submit document error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Helper function to calculate progress
 */
function getProgress(docCollection) {
  const totalFields = 4;
  const verifiedFields = Object.values(docCollection.documents)
    .filter(doc => doc.isVerified).length;
  
  return {
    completed: verifiedFields,
    total: totalFields,
    percentage: Math.round((verifiedFields / totalFields) * 100)
  };
}

/**
 * Get collection summary
 */
exports.getSummary = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const docCollection = await DocumentCollection.findOne({ sessionId });
    
    if (!docCollection) {
      return res.status(404).json({ error: 'Document collection not found' });
    }
    
    res.json({
      success: true,
      data: {
        sessionId: docCollection.sessionId,
        isCompleted: docCollection.isCompleted,
        progress: getProgress(docCollection),
        documents: {
          pan: {
            isVerified: docCollection.documents.pan.isVerified,
            attempts: docCollection.documents.pan.attempts
          },
          aadhar: {
            isVerified: docCollection.documents.aadhar.isVerified,
            attempts: docCollection.documents.aadhar.attempts
          },
          email: {
            isVerified: docCollection.documents.email.isVerified,
            attempts: docCollection.documents.email.attempts
          },
          phone: {
            isVerified: docCollection.documents.phone.isVerified,
            attempts: docCollection.documents.phone.attempts
          }
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

