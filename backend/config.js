require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5001,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/chatbotdb',
  JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_here',
  NODE_ENV: process.env.NODE_ENV || 'development',
  PYTHON_VALIDATION_SERVICE_URL: process.env.PYTHON_VALIDATION_SERVICE_URL || 'http://localhost:8000'
};
