import React, { useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { sendMessage } from '../services/socketService';

const MessageInput = ({ config }) => {
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const { isConnected } = useSelector(state => state.chat);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && isConnected) {
      sendMessage(message, config);
      setMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a JPEG, PNG, or PDF file');
      return;
    }

    // Check file size (16MB)
    if (file.size > 16 * 1024 * 1024) {
      alert('File size must be less than 16MB');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // For now, we'll detect which document type based on filename or prompt user
      // You can enhance this to be smarter
      const field_type = prompt('Please specify document type:\n1 for PAN\n2 for Aadhar');
      let docType = '';
      
      if (field_type === '1') {
        docType = 'pan';
      } else if (field_type === '2') {
        docType = 'aadhar';
      } else {
        alert('Invalid selection');
        setUploading(false);
        return;
      }
      
      formData.append('field_type', docType);

      const response = await fetch(`${config?.apiUrl || 'http://localhost:5001'}/api/upload/document`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.is_valid) {
        // Send success message to chat
        const uploadMessage = `✅ Document uploaded and verified!\n${docType.toUpperCase()}: ${data.value}`;
        sendMessage(uploadMessage, config);
      } else {
        alert(data.error_message || 'Document validation failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload document');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <div className="input-container">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={isConnected ? "Type your message..." : "Connecting..."}
          disabled={!isConnected}
        />
        <button 
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!isConnected || uploading}
          className="upload-button"
          title="Upload document"
        >
          📎
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,application/pdf"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          disabled={!isConnected}
        />
        <button 
          type="submit" 
          disabled={!message.trim() || !isConnected || uploading}
          className="send-button"
        >
          {uploading ? '⏳' : 'Send'}
        </button>
      </div>
    </form>
  );
};

export default MessageInput;
