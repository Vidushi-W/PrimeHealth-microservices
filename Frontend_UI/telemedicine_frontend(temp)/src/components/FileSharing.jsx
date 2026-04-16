import { useState, useEffect } from 'react';
import axios from 'axios';

export default function FileSharing({ sessionId, authToken }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFiles();
  }, [sessionId]);

  const fetchFiles = async () => {
    try {
      const response = await axios.get(
        `/api/sessions/${sessionId}/files`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setFiles(response.data);
    } catch (err) {
      setError('Failed to load files: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Validate file size (50MB max)
    if (selectedFile.size > 50 * 1024 * 1024) {
      setError('File is too large. Maximum size is 50MB.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    setUploading(true);
    setError('');

    try {
      const response = await axios.post(
        `/api/sessions/${sessionId}/files/upload`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      setFiles(prev => [...prev, response.data]);
      e.target.value = ''; // Reset input
    } catch (err) {
      setError('Failed to upload file: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (fileId, fileName) => {
    try {
      const response = await axios.get(
        `/api/sessions/${sessionId}/files/${fileId}/download`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setError('Failed to download file');
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;

    try {
      await axios.delete(
        `/api/sessions/${sessionId}/files/${fileId}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setFiles(prev => prev.filter(f => f._id !== fileId));
    } catch (err) {
      setError('Failed to delete file');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType) => {
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('sheet')) return '📊';
    if (mimeType.includes('video')) return '🎥';
    return '📎';
  };

  if (loading) {
    return <div className="loading">Loading files...</div>;
  }

  return (
    <div className="file-container">
      {error && <div className="error-message">{error}</div>}

      <label className="file-upload">
        <input 
          type="file" 
          onChange={handleFileUpload}
          disabled={uploading}
        />
        <div className="file-upload-icon">📤</div>
        <div className="file-upload-text">
          {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
        </div>
        <div className="file-upload-hint">
          Maximum file size: 50MB
        </div>
      </label>

      <div className="files-list">
        {files.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
            No files shared yet
          </p>
        ) : (
          files.map(file => (
            <div key={file._id} className="file-item">
              <div className="file-info">
                <div className="file-icon">{getFileIcon(file.mimeType)}</div>
                <div className="file-details">
                  <div className="file-name">{file.originalName}</div>
                  <div className="file-meta">
                    {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="file-actions">
                <button
                  className="file-action-btn"
                  onClick={() => handleDownload(file._id, file.originalName)}
                  title="Download"
                >
                  ⬇️
                </button>
                <button
                  className="file-action-btn"
                  onClick={() => handleDeleteFile(file._id)}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
