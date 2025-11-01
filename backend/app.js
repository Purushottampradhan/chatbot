const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Import routes
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const policyRoutes = require('./routes/policyRoutes');
const documentRoutes = require('./routes/documentRoutes');
const documentCollectionRoutes = require('./routes/documentCollectionRoutes');
const fileUploadRoutes = require('./routes/fileUploadRoutes');

const app = express();

// Security middleware
app.use(helmet());

// CORS middleware
// app.use(cors({
//   origin: process.env.NODE_ENV === 'production' 
//     ? ['your-production-domain.com'] 
//     : ['http://localhost:3000', 'http://localhost:3001'],
//   credentials: true
// }));
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Create uploads directory if it doesn't exist
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/document-collection', documentCollectionRoutes);
app.use('/api/upload', fileUploadRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

module.exports = app;
