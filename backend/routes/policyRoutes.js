const express = require('express');
const { 
  getAllPolicies, 
  createPolicy, 
  updatePolicy, 
  deletePolicy 
} = require('../controllers/policyController');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', getAllPolicies);
router.post('/', adminAuth, createPolicy);
router.put('/:id', adminAuth, updatePolicy);
router.delete('/:id', adminAuth, deletePolicy);

module.exports = router;
