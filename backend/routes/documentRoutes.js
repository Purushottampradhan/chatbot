const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');

// Validate single document field
router.post('/validate', documentController.validateDocument);

// Validate multiple document fields
router.post('/validate-batch', documentController.validateBatch);

// Health check
router.get('/health', documentController.checkHealth);

module.exports = router;

