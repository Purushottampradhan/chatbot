const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Python validation service URL
const PYTHON_SERVICE_URL ='http://localhost:8000';

/**
 * Handle file upload for PAN or Aadhar document
 */
exports.uploadAndValidate = async (req, res) => {
  try {
    const file = req.file;
    const { field_type } = req.body;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }
    
    if (!field_type || !['pan', 'aadhar'].includes(field_type.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'field_type must be "pan" or "aadhar"'
      });
    }
    
    // Create form data to send to Python service
    const formData = new FormData();
    formData.append('file', fs.createReadStream(file.path), file.originalname);
    formData.append('field_type', field_type.toLowerCase());
    
    // Call Python validation service
    const response = await axios.post(
      `${PYTHON_SERVICE_URL}/upload`,
      formData,
      {
        headers: formData.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );
    
    // Clean up uploaded file
    fs.unlinkSync(file.path);
    
    res.json(response.data);
  } catch (error) {
    console.error('File upload error:', error.message);
    
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    res.status(500).json({
      success: false,
      error: error.response?.data?.error || 'File upload and validation failed'
    });
  }
};

