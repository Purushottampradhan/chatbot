const express = require('express');
const router = express.Router();
const documentCollectionController = require('../controllers/documentCollectionController');

// Initialize document collection
router.post('/initialize', documentCollectionController.initializeCollection);

// Get collection status
router.get('/status/:sessionId', documentCollectionController.getStatus);

// Submit a document for validation
router.post('/submit', documentCollectionController.submitDocument);

// Get collection summary
router.get('/summary/:sessionId', documentCollectionController.getSummary);

module.exports = router;

