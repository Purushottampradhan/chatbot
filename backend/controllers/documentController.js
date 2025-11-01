const axios = require('axios');

// Python validation service URL
const PYTHON_SERVICE_URL = process.env.PYTHON_VALIDATION_SERVICE_URL || 'http://localhost:8000';

/**
 * Validate a single document field
 */
exports.validateDocument = async (req, res) => {
  try {
    const { field_type, value } = req.body;
    
    if (!field_type || !value) {
      return res.status(400).json({
        success: false,
        error: 'field_type and value are required'
      });
    }
    
    // Call Python validation service
    const formData = new URLSearchParams();
    formData.append('field_type', field_type);
    formData.append('value', value);
    
    const response = await axios.post(
      `${PYTHON_SERVICE_URL}/validate`,
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Validation error:', error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.detail || 'Validation service error'
    });
  }
};

/**
 * Validate multiple document fields at once
 */
exports.validateBatch = async (req, res) => {
  try {
    const { pan, aadhar, email, phone } = req.body;
    
    const validationData = {};
    if (pan) validationData.pan = pan;
    if (aadhar) validationData.aadhar = aadhar;
    if (email) validationData.email = email;
    if (phone) validationData.phone = phone;
    
    // Call Python validation service
    const response = await axios.post(
      `${PYTHON_SERVICE_URL}/validate-batch`,
      validationData
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Batch validation error:', error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.detail || 'Validation service error'
    });
  }
};

/**
 * Health check for Python service
 */
exports.checkHealth = async (req, res) => {
  try {
    const response = await axios.get(`${PYTHON_SERVICE_URL}/health`);
    res.json(response.data);
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'Python validation service is not available'
    });
  }
};

