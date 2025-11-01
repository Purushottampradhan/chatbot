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

### Using Startup Scripts
```bash
# macOS/Linux
./start.sh

# Windows
start.bat
```

The service will start on `http://localhost:8000`

### Production Mode
```bash
gunicorn -w 4 -b 0.0.0.0:8000 app:app
```

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

**New Features in Response:**
- `pattern_validation`: Basic regex validation result
- `langchain_validation`: OpenAI-powered validation (if API key provided)
- `vector_db_check`: Duplicate detection using embeddings

### Vector DB Statistics
```
GET /vector-db/stats
```

Response:
```json
{
  "success": true,
  "stats": {
    "pan_documents": 10,
    "aadhar_documents": 15,
    "total": 25
  }
}
```

### Validate Batch Documents
```
POST /validate-batch
Content-Type: application/json

{
  "pan": "ABCDE1234F",
  "aadhar": "123456789012",
  "email": "user@example.com",
  "phone": "9876543210"
}
```

Response:
```json
{
  "success": true,
  "results": {
    "pan": {
      "is_valid": true,
      "value": "ABCDE1234F",
      "error": null
    },
    "aadhar": {
      "is_valid": true,
      "value": "123456789012",
      "error": null
    }
  }
}
```

## Validation Rules

### PAN Card
- Format: 5 uppercase letters, 4 digits, 1 uppercase letter
- Example: `ABCDE1234F`

### Aadhar Card
- Format: 12 digits
- Cannot start with 0 or 1
- Example: `234567890123`

### Email
- Standard email format
- Example: `user@example.com`

### Phone Number
- 10 digits starting with 6, 7, 8, or 9
- Example: `9876543210`

## Environment Variables

Create a `.env` file in the service directory:

```env
OPENAI_API_KEY=your_openai_api_key_here  # Optional
PORT=8000
DEBUG=True
```

## Testing

Test the service using curl:

```bash
# Test PAN validation
curl -X POST "http://localhost:8000/validate" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "field_type=pan&value=ABCDE1234F"

# Test Aadhar validation
curl -X POST "http://localhost:8000/validate" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "field_type=aadhar&value=234567890123"

# Test Email validation
curl -X POST "http://localhost:8000/validate" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "field_type=email&value=user@example.com"

# Test Phone validation
curl -X POST "http://localhost:8000/validate" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "field_type=phone&value=9876543210"
```

## Integration with Node.js Backend

The service is integrated with the Node.js backend and can be accessed via the `/api/document-collection` endpoints. Make sure to:

1. Set the `PYTHON_VALIDATION_SERVICE_URL` environment variable in your `.env` file
2. Start the Python service before starting the Node.js backend
3. The Node.js backend will automatically forward validation requests to this service

## Troubleshooting

### Port Already in Use
If port 8000 is already in use, change the port in the `.env` file or start with a different port:
```bash
uvicorn main:app --port 8001
```

### OCR Not Working
Make sure Tesseract is installed and the `tesseract` command is in your PATH:
```bash
tesseract --version
```

### Connection Errors
Ensure the Python service is running and accessible:
```bash
curl http://localhost:8000/health
```

