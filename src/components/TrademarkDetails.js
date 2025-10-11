// src/TrademarkDetails.js
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './TrademarkDetails.css';

const TrademarkDetails = () => {
  const { appNumber } = useParams();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fixed date formatting function
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      let dateToParse = dateString;
      
      // Handle the specific USPTO format: "2016-07-11-04:00"
      if (dateString.match(/^\d{4}-\d{2}-\d{2}-\d{2}:\d{2}$/)) {
        // Convert "2016-07-11-04:00" to "2016-07-11T04:00:00"
        dateToParse = dateString.replace(/(\d{4}-\d{2}-\d{2})-(\d{2}:\d{2})/, '$1T$2:00');
      }
      // Handle format without timezone: "2016-07-11"
      else if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        dateToParse = dateString + 'T00:00:00';
      }
      
      const date = new Date(dateToParse);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return dateString; // Return original if invalid
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
    } catch {
      return dateString;
    }
  };

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`https://lawmatics-backend.onrender.com/api/trademark/${appNumber}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status}`);
        }
        
        const data = await response.json();
        setDocuments(data.documents || []);
      } catch (error) {
        console.error('Error fetching documents:', error);
        setError(error.message);
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    };
  
    fetchDocuments();
  }, [appNumber]);

  // ... rest of your component code remains the same
  if (loading) {
    return (
      <div className="trademark-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading trademark details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="trademark-container">
        <div className="error-container">
          <h3>No Data Available</h3>
          <p>No trademark data found for application #{appNumber}</p>
          <p style={{ color: '#c53030', fontSize: '0.9rem' }}>Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="trademark-container">
      {/* Clean Header */}
      <div className="trademark-header">
        <h1>Trademark Application Details</h1>
        <div className="app-number">Application Number: {appNumber}</div>
      </div>

      {/* Documents Section */}
      <div className="trademark-section">
        <div className="section-header">
          <h3>Trademark Filing History</h3>
          <div className="documents-count">
            {documents.length} {documents.length === 1 ? 'Document' : 'Documents'}
          </div>
        </div>

        {documents.length > 0 ? (
          <table className="documents-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Type</th>
                <th>File</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc, idx) => (
                <tr key={idx}>
                  <td className="doc-date">{formatDate(doc.date)}</td>
                  <td className="doc-description">
                    {doc.description || 'No description available'}
                  </td>
                  <td className="doc-type">{doc.type || 'N/A'}</td>
                  <td>
                    {doc.url ? (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="download-link"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        View File
                      </a>
                    ) : (
                      'N/A'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-documents">
            <p>No documents found for this trademark application.</p>
          </div>
        )}
      </div>
    </div>
  );
};


export default TrademarkDetails;
