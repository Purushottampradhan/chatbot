# Complete Document Validation System


## Quick Start

### 1. Setup 

```bash
# Backend dependencies
cd backend
npm install

# Python service
cd python_validation_service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Install Tesseract (for OCR)
# macOS: brew install tesseract
# Ubuntu: sudo apt-get install tesseract-ocr
```

### 2. Configure

**backend/.env:**
```env
PYTHON_VALIDATION_SERVICE_URL=http://localhost:8000
MONGO_URI=mongodb://localhost:27017/chatbotdb
PORT=5001
```

**backend/python_validation_service/.env:**
```env
OPENAI_API_KEY=sk-your-key-here
PORT=8000
```

### 3. Run

```bash
# Terminal 1: Python
cd backend/python_validation_service
python app.py

# Terminal 2: Node.js
cd backend
npm run dev

# Terminal 3: Frontend
cd frontend/chatbot-widget
npm start
```

### 4. Test

Open chatbot → Type **"Hi"** → Start collecting documents!

---

## Documentation Guide

## How It Works

### User Types "Hi"

```
User: "Hi"

Bot: "Hello! Welcome! I'll help you verify your documents.

Please upload PAN card document.
You can either:
Upload an image/PDF of your PAN card, or
```

### Document Collection Flow

```
PAN Card
├─ Option 1: Upload file → OCR → Extract → Validate
├─ Option 2: Type number → Validate
├─ Validation: Pattern → LangChain → Vector DB
└─ Storage: ChromaDB

Aadhar Card
├─ Same process as PAN
└─ Storage: ChromaDB

Email
├─ Type email
├─ Validation: Pattern
└─ Storage: MongoDB

Phone
├─ Type phone
├─ Validation: Pattern
└─ Storage: MongoDB

Completion: All verified!
```

---

##  Technology Stack

**Backend:**
- Node.js + Express
- Socket.IO (real-time chat)
- MongoDB (user data)
- Multer (file uploads)

**Python Service:**
- Flask (web framework)
- LangChain (AI validation)
- OpenAI (LLM)
- ChromaDB (vector storage)
- Tesseract (OCR)
- PyMuPDF (PDF processing)

**Frontend:**
- React
- Redux
- Socket.IO client

**Validation:**
- Pattern matching (regex)
- LangChain AI
- Vector similarity search

---

##  Architecture

```
┌────────────────────────┐
│   React Chatbot UI     │
│   - File upload 📎     │
│   - Text input         │
└───────────┬────────────┘
            │ Socket.IO
            ↓
┌────────────────────────┐
│   Node.js Backend      │
│   - Socket handler     │
│   - File upload API    │
│   - Workflow mgmt      │
└───────────┬────────────┘
            │ HTTP/REST
            ↓
┌────────────────────────┐
│   Python Flask         │
│   - OCR (Tesseract)    │
│   - LangChain AI       │
│   - ChromaDB vectors   │
│   - Validation logic   │
└───────────┬────────────┘
            │ Storage
            ↓
┌────────────────────────┐
│   Databases            │
│   - ChromaDB (PAN/Aadhar)│
│   - MongoDB (Email/Phone)│
└────────────────────────┘
```
---

## Testing

### Quick Test 

1. Start all services
2. Open chatbot
3. Type **"Hi"**
4. Upload a PAN card image
5. Watch it work!

### Full Test

1. Say **"Hi"**
2. Upload PAN → ✅
3. Upload Aadhar → ✅
4. Type Email → ✅
5. Type Phone → ✅
6. **🎉 Complete!**
