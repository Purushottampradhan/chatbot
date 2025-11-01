import os
import re
import json
from typing import Dict, List, Optional
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import chromadb
from sentence_transformers import SentenceTransformer
from langchain_openai import OpenAI
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
import uuid
from datetime import datetime
import pytesseract
from PIL import Image
import fitz  # PyMuPDF
import io
import base64
from werkzeug.utils import secure_filename

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure upload folder
UPLOAD_FOLDER = './uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Initialize ChromaDB
client = chromadb.PersistentClient(path="./chroma_db")

# Initialize embedding model
print("Loading embedding model...")
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

# Initialize LangChain with OpenAI
openai_api_key = os.getenv('OPENAI_API_KEY')
if openai_api_key:
    llm = OpenAI(temperature=0, openai_api_key=openai_api_key)
else:
    print("Warning: OPENAI_API_KEY not found. LangChain validation will be disabled.")
    llm = None

# Create or get collections for PAN and Aadhar
try:
    pan_collection = client.get_or_create_collection(name="pan_documents")
    aadhar_collection = client.get_or_create_collection(name="aadhar_documents")
except Exception as e:
    print(f"Warning: ChromaDB error: {e}. Creating new collections...")
    pan_collection = client.create_collection(name="pan_documents")
    aadhar_collection = client.create_collection(name="aadhar_documents")

# Prompt templates for LangChain validation
pan_validation_prompt = PromptTemplate(
    input_variables=["pan_number"],
    template="""
    You are an expert at validating PAN (Permanent Account Number) cards.
    PAN numbers follow the format: ABCDE1234F (5 letters, 4 digits, 1 letter).
    
    Analyze this PAN number: {pan_number}
    
    Provide your analysis in this JSON format:
    {{
        "is_valid": true/false,
        "confidence": 0.0-1.0,
        "issues": ["list of issues if invalid"],
        "suggestions": ["list of suggestions"]
    }}
    
    Return ONLY the JSON, no other text.
    """
)

aadhar_validation_prompt = PromptTemplate(
    input_variables=["aadhar_number"],
    template="""
    You are an expert at validating Aadhar card numbers.
    Aadhar numbers are 12-digit numbers that cannot start with 0 or 1.
    
    Analyze this Aadhar number: {aadhar_number}
    
    Provide your analysis in this JSON format:
    {{
        "is_valid": true/false,
        "confidence": 0.0-1.0,
        "issues": ["list of issues if invalid"],
        "suggestions": ["list of suggestions"]
    }}
    
    Return ONLY the JSON, no other text.
    """
)


def validate_pan_pattern(pan: str) -> Dict:
    """Basic pattern-based validation for PAN"""
    if not pan:
        return {"is_valid": False, "error": "PAN number is required"}
    
    pan = pan.strip().upper()
    pan_pattern = r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$'
    
    if re.match(pan_pattern, pan):
        return {"is_valid": True, "value": pan, "error": None}
    else:
        return {
            "is_valid": False,
            "value": pan,
            "error": "Invalid PAN format. PAN should be in format: ABCDE1234F (5 letters, 4 digits, 1 letter)",
            "suggestions": ["Remove spaces", "Check all characters are entered correctly"]
        }


def validate_aadhar_pattern(aadhar: str) -> Dict:
    """Basic pattern-based validation for Aadhar"""
    if not aadhar:
        return {"is_valid": False, "error": "Aadhar number is required"}
    
    aadhar = re.sub(r'[\s-]', '', aadhar)
    aadhar_pattern = r'^\d{12}$'
    
    if re.match(aadhar_pattern, aadhar):
        return {"is_valid": True, "value": aadhar, "error": None}
    else:
        return {
            "is_valid": False,
            "value": aadhar,
            "error": "Invalid Aadhar format. Aadhar should be 12 digits",
            "suggestions": ["Remove spaces and hyphens", "Ensure it's exactly 12 digits"]
        }


def validate_email_pattern(email: str) -> Dict:
    """Basic pattern-based validation for Email"""
    if not email:
        return {"is_valid": False, "error": "Email is required"}
    
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    
    if re.match(email_pattern, email):
        return {"is_valid": True, "value": email.lower(), "error": None}
    else:
        return {
            "is_valid": False,
            "value": email,
            "error": "Invalid email format. Please provide a valid email address",
            "suggestions": ["Check for typos", "Ensure @ symbol is present", "Check domain extension"]
        }


def validate_phone_pattern(phone: str) -> Dict:
    """Basic pattern-based validation for Phone"""
    if not phone:
        return {"is_valid": False, "error": "Phone number is required"}
    
    phone = re.sub(r'[\s\-\(\)]', '', phone)
    
    if phone.startswith('+91'):
        phone = phone[3:]
    elif phone.startswith('91') and len(phone) == 12:
        phone = phone[2:]
    
    phone_pattern = r'^[6-9]\d{9}$'
    
    if re.match(phone_pattern, phone):
        return {"is_valid": True, "value": phone, "error": None}
    else:
        return {
            "is_valid": False,
            "value": phone,
            "error": "Invalid phone number. Indian phone numbers should be 10 digits starting with 6, 7, 8, or 9",
            "suggestions": ["Remove country code if entered", "Ensure it starts with 6, 7, 8, or 9", "Check for extra digits"]
        }


def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def extract_text_from_pdf(pdf_bytes):
    """Extract text from PDF using PyMuPDF"""
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text = ""
        for page_num in range(len(doc)):
            page = doc[page_num]
            text += page.get_text()
        doc.close()
        return text
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return ""


def extract_text_from_image(image_bytes):
    """Extract text from image using Tesseract OCR"""
    try:
        image = Image.open(io.BytesIO(image_bytes))
        text = pytesseract.image_to_string(image, lang='eng')
        return text
    except Exception as e:
        print(f"Error extracting text from image: {e}")
        return ""


def extract_document_from_ocr(text: str, document_type: str) -> Optional[str]:
    """Extract PAN or Aadhar number from OCR text"""
    text_upper = text.upper()
    print("Text upper:", text_upper);
    if document_type == "pan":
        # Look for PAN pattern: ABCDE1234F
        pan_pattern = r'[A-Z]{5}[0-9]{4}[A-Z]{1}'
        matches = re.findall(pan_pattern, text_upper)
        if matches:
            return matches[0]
    
    elif document_type == "aadhar":
        match = re.search(r'\b\d{4}\s?\d{4}\s?\d{4}\b', text_upper)
        if match:
            aadhaar_number = match.group().replace(" ", "")
            print("Extracted Aadhaar Number:", aadhaar_number)
            return aadhaar_number
    
    return None


def validate_with_langchain(pan_number: str = None, aadhar_number: str = None) -> Dict:
    """Enhanced validation using LangChain and OpenAI"""
    if not llm:
        return None
    
    try:
        if pan_number:
            chain = LLMChain(llm=llm, prompt=pan_validation_prompt)
            result = chain.run(pan_number=pan_number)
            return json.loads(result)
        elif aadhar_number:
            chain = LLMChain(llm=llm, prompt=aadhar_validation_prompt)
            result = chain.run(aadhar_number=aadhar_number)
            return json.loads(result)
    except Exception as e:
        print(f"LangChain validation error: {e}")
        return None
    
    return None


def store_in_vector_db(document_type: str, value: str, metadata: Dict):
    """Store document in ChromaDB vector database"""
    try:
        # Generate embedding
        embedding = embedding_model.encode(value).tolist()
        
        # Prepare metadata
        doc_metadata = {
            "value": value,
            "document_type": document_type,
            "timestamp": datetime.now().isoformat(),
            **metadata
        }
        
        # Store in appropriate collection
        collection = pan_collection if document_type == "pan" else aadhar_collection
        
        collection.add(
            ids=[str(uuid.uuid4())],
            embeddings=[embedding],
            documents=[value],
            metadatas=[doc_metadata]
        )
        
        print(f"Stored {document_type} document in vector DB")
        return True
    except Exception as e:
        print(f"Error storing in vector DB: {e}")
        return False


def check_vector_db(document_type: str, value: str) -> Optional[Dict]:
    """Check if document exists in vector database"""
    try:
        collection = pan_collection if document_type == "pan" else aadhar_collection
        
        # Generate embedding for query
        query_embedding = embedding_model.encode(value).tolist()
        
        # Search in collection
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=1
        )
        
        if results['ids'] and len(results['ids'][0]) > 0:
            # Found similar document
            distance = results['distances'][0][0] if results['distances'] else None
            if distance and distance < 0.1:  # Very similar (adjust threshold as needed)
                return {
                    "exists": True,
                    "similarity": 1 - distance,
                    "metadata": results['metadatas'][0][0] if results['metadatas'] else None
                }
        
        return {"exists": False, "similarity": 0}
    except Exception as e:
        print(f"Error querying vector DB: {e}")
        return None


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "document-validation",
        "langchain_available": llm is not None,
        "chromadb_available": True
    })


@app.route('/upload', methods=['POST'])
def upload_and_validate():
    """Upload and validate document from file"""
    try:
        print("Request form keys:", request.form.keys())
        # Check if file is in request
        if 'file' not in request.files:
            return jsonify({
                "success": False,
                "error": "No file provided"
            }), 400
        
        file = request.files['file']
        field_type = request.form.get('field_type', '').lower()
        
        if file.filename == '':
            return jsonify({
                "success": False,
                "error": "No file selected"
            }), 400
        
        if not field_type or field_type not in ['pan', 'aadhar']:
            return jsonify({
                "success": False,
                "error": "field_type must be 'pan' or 'aadhar'"
            }), 400
        
        if not allowed_file(file.filename):
            return jsonify({
                "success": False,
                "error": "Invalid file type. Allowed: PNG, JPG, JPEG, PDF"
            }), 400
        
        # Read file content
        file_bytes = file.read()
        filename = secure_filename(file.filename)
        
        # Extract text based on file type
        file_ext = filename.rsplit('.', 1)[1].lower()
        
        if file_ext == 'pdf':
            extracted_text = extract_text_from_pdf(file_bytes)
        else:  # Image
            extracted_text = extract_text_from_image(file_bytes)
        
        print("Extracted text:", extracted_text)
        if not extracted_text or extracted_text.strip() == '':
            return jsonify({
                "success": False,
                "error": "Could not extract text from document. Please ensure the image is clear and readable.",
                "suggestions": [
                    "Check image quality",
                    "Ensure good lighting",
                    "Try a different angle"
                ]
            }), 400
        
        # Extract document number from OCR text
        extracted_value = extract_document_from_ocr(extracted_text, field_type)
        print("Extracted value:", extracted_value);
        if not extracted_value:
            return jsonify({
                "success": False,
                "error": f"Could not find valid {field_type.upper()} in the document.",
                "extracted_text": extracted_text[:200],  # First 200 chars for debugging
                "suggestions": [
                    "Check if document is clear",
                    "Ensure document type is correct",
                    "Try taking a better photo"
                ]
            }), 400
        
        # Now validate the extracted value
        # Call the validation endpoint logic
        if field_type == "pan":
            pattern_result = validate_pan_pattern(extracted_value)
            llm_result = None
            
            if llm and pattern_result["is_valid"]:
                try:
                    llm_result = validate_with_langchain(pan_number=extracted_value)
                except Exception as e:
                    print(f"Error in LangChain validation: {e}")
            
            if pattern_result["is_valid"]:
                vector_check = check_vector_db("pan", extracted_value)
                store_in_vector_db("pan", extracted_value, {
                    "validation_method": "ocr_and_pattern_and_langchain" if llm else "ocr_and_pattern",
                    "langchain_result": llm_result,
                    "source": "file_upload",
                    "filename": filename
                })
                
                return jsonify({
                    "success": True,
                    "field": "pan",
                    "is_valid": True,
                    "value": pattern_result["value"],
                    "extracted_from_file": True,
                    "pattern_validation": pattern_result,
                    "langchain_validation": llm_result,
                    "vector_db_check": vector_check
                })
            else:
                return jsonify({
                    "success": True,
                    "field": "pan",
                    "is_valid": False,
                    "extracted_value": extracted_value,
                    "error_message": pattern_result.get("error"),
                    "suggestions": pattern_result.get("suggestions", [])
                })
        
        elif field_type == "aadhar":
            pattern_result = validate_aadhar_pattern(extracted_value)
            llm_result = None
            
            if llm and pattern_result["is_valid"]:
                try:
                    llm_result = validate_with_langchain(aadhar_number=extracted_value)
                except Exception as e:
                    print(f"Error in LangChain validation: {e}")
            
            if pattern_result["is_valid"]:
                vector_check = check_vector_db("aadhar", extracted_value)
                store_in_vector_db("aadhar", extracted_value, {
                    "validation_method": "ocr_and_pattern_and_langchain" if llm else "ocr_and_pattern",
                    "langchain_result": llm_result,
                    "source": "file_upload",
                    "filename": filename
                })
                
                return jsonify({
                    "success": True,
                    "field": "aadhar",
                    "is_valid": True,
                    "value": pattern_result["value"],
                    "extracted_from_file": True,
                    "pattern_validation": pattern_result,
                    "langchain_validation": llm_result,
                    "vector_db_check": vector_check
                })
            else:
                return jsonify({
                    "success": True,
                    "field": "aadhar",
                    "is_valid": False,
                    "extracted_value": extracted_value,
                    "error_message": pattern_result.get("error"),
                    "suggestions": pattern_result.get("suggestions", [])
                })
        
        else:
            return jsonify({
                "success": False,
                "error": "Invalid field_type for file upload"
            }), 400
    
    except Exception as e:
        print(f"Upload error: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/validate', methods=['POST'])
def validate_document():
    """Validate a single document field"""
    try:
        data = request.get_json() or request.form.to_dict()
        field_type = data.get('field_type', '').lower()
        value = data.get('value', '')
        
        if not field_type or not value:
            return jsonify({
                "success": False,
                "error": "field_type and value are required"
            }), 400
        
        # Pattern-based validation
        if field_type == "pan":
            pattern_result = validate_pan_pattern(value)
            llm_result = None
            
            # Enhanced validation with LangChain if available
            if llm and pattern_result["is_valid"]:
                try:
                    llm_result = validate_with_langchain(pan_number=value)
                    print(f"LangChain PAN validation result: {llm_result}")
                except Exception as e:
                    print(f"Error in LangChain validation: {e}")
            
            # Combine results
            if pattern_result["is_valid"]:
                # Check vector DB for similar documents
                vector_check = check_vector_db("pan", value)
                
                # Store in vector DB if valid
                if pattern_result["is_valid"]:
                    store_in_vector_db("pan", value, {
                        "validation_method": "pattern_and_langchain" if llm else "pattern_only",
                        "langchain_result": llm_result
                    })
                
                return jsonify({
                    "success": True,
                    "field": "pan",
                    "is_valid": True,
                    "value": pattern_result["value"],
                    "pattern_validation": pattern_result,
                    "langchain_validation": llm_result,
                    "vector_db_check": vector_check
                })
            else:
                return jsonify({
                    "success": True,
                    "field": "pan",
                    "is_valid": False,
                    "value": value,
                    "error_message": pattern_result.get("error"),
                    "suggestions": pattern_result.get("suggestions", [])
                })
        
        elif field_type == "aadhar":
            pattern_result = validate_aadhar_pattern(value)
            llm_result = None
            
            if llm and pattern_result["is_valid"]:
                try:
                    llm_result = validate_with_langchain(aadhar_number=value)
                    print(f"LangChain Aadhar validation result: {llm_result}")
                except Exception as e:
                    print(f"Error in LangChain validation: {e}")
            
            if pattern_result["is_valid"]:
                # Check vector DB
                vector_check = check_vector_db("aadhar", value)
                
                # Store in vector DB
                store_in_vector_db("aadhar", value, {
                    "validation_method": "pattern_and_langchain" if llm else "pattern_only",
                    "langchain_result": llm_result
                })
                
                return jsonify({
                    "success": True,
                    "field": "aadhar",
                    "is_valid": True,
                    "value": pattern_result["value"],
                    "pattern_validation": pattern_result,
                    "langchain_validation": llm_result,
                    "vector_db_check": vector_check
                })
            else:
                return jsonify({
                    "success": True,
                    "field": "aadhar",
                    "is_valid": False,
                    "value": value,
                    "error_message": pattern_result.get("error"),
                    "suggestions": pattern_result.get("suggestions", [])
                })
        
        elif field_type == "email":
            result = validate_email_pattern(value)
            return jsonify({
                "success": True,
                "field": "email",
                "is_valid": result["is_valid"],
                "value": result.get("value"),
                "error_message": result.get("error"),
                "suggestions": result.get("suggestions")
            })
        
        elif field_type == "phone":
            result = validate_phone_pattern(value)
            return jsonify({
                "success": True,
                "field": "phone",
                "is_valid": result["is_valid"],
                "value": result.get("value"),
                "error_message": result.get("error"),
                "suggestions": result.get("suggestions")
            })
        else:
            return jsonify({
                "success": False,
                "error": "Invalid field_type. Must be one of: pan, aadhar, email, phone"
            }), 400
    
    except Exception as e:
        print(f"Validation error: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/validate-batch', methods=['POST'])
def validate_batch():
    """Validate multiple documents at once"""
    try:
        data = request.get_json()
        results = {}
        
        for field_type in ['pan', 'aadhar', 'email', 'phone']:
            if field_type in data and data[field_type]:
                # Reuse validate_document logic for each field
                req_data = {'field_type': field_type, 'value': data[field_type]}
                result = validate_document()
                # Note: This is simplified - in production, extract logic
                results[field_type] = {
                    "is_valid": False,
                    "value": data[field_type]
                }
        
        return jsonify({
            "success": True,
            "results": results
        })
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/vector-db/stats', methods=['GET'])
def vector_db_stats():
    """Get statistics about vector database"""
    try:
        pan_count = pan_collection.count()
        aadhar_count = aadhar_collection.count()
        
        return jsonify({
            "success": True,
            "stats": {
                "pan_documents": pan_count,
                "aadhar_documents": aadhar_count,
                "total": pan_count + aadhar_count
            }
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


if __name__ == "__main__":
    print("Starting Flask Document Validation Service...")
    print("LangChain available:", llm is not None)
    print("ChromaDB initialized")
    app.run(host="0.0.0.0", port=8000, debug=True)

