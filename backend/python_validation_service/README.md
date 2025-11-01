# Python Document Validation Service

This service validates Indian documents including PAN card, Aadhar card, Email, and Phone numbers using **Flask**, **LangChain**, and **ChromaDB** for advanced validation.

## Features

- **PAN Card Validation**: Validates PAN card format (ABCDE1234F)
- **Aadhar Card Validation**: Validates 12-digit Aadhar number
- **Email Validation**: Validates email format
- **Phone Number Validation**: Validates Indian phone numbers (10 digits starting with 6-9)
- **LangChain Integration**: OpenAI-powered advanced validation
- **Vector Database**: ChromaDB storage for PAN and Aadhar documents
- **Duplicate Detection**: Check for existing documents using embeddings
- **Batch Validation**: Validate multiple documents at once

## Installation

1. Navigate to the service directory:
```bash
cd backend/python_validation_service
```

2. Create a virtual environment:
```bash
python3 -m venv venv
```

3. Activate the virtual environment:
```bash
# On macOS/Linux
source venv/bin/activate

# On Windows
venv\Scripts\activate
```

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. (Optional) For OCR support, install Tesseract:
```bash
# macOS
brew install tesseract

# Ubuntu/Debian
sudo apt-get install tesseract-ocr

# Windows
# Download from: https://github.com/UB-Mannheim/tesseract/wiki
```

## Running the Service

### Development Mode
```bash
python app.py
```

The service will start on `http://localhost:8000`

## API Endpoints

### Health Check
```
GET /health
```

Response:
```json
{
  "status": "healthy",
  "service": "document-validation"
}
```

### Validate Single Document
```
POST /validate
Content-Type: application/x-www-form-urlencoded

field_type=pan
value=ABCDE1234F
```

Response:
```json
{
  "success": true,
  "field": "pan",
  "is_valid": true,
  "value": "ABCDE1234F",
  "pattern_validation": {
    "is_valid": true,
    "value": "ABCDE1234F"
  },
  "langchain_validation": {
    "is_valid": true,
    "confidence": 0.95,
    "issues": [],
    "suggestions": []
  },
  "vector_db_check": {
    "exists": false,
    "similarity": 0
  }
}
```

