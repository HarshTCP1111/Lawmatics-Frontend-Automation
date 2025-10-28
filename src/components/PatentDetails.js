import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './PatentDetails.css';

const PatentDetails = () => {
  const { appNumber } = useParams();
  const decodedAppNumber = decodeURIComponent(appNumber);

  const [patentData, setPatentData] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`https://lawmatics-backend-692908019770.asia-south1.run.app/api/patent/${encodeURIComponent(decodedAppNumber)}/documents`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status}`);
        }
        
        const data = await response.json();
        setPatentData(data);
        setDocuments(data.documents || []);
      } catch (err) {
        console.error('Error fetching patent details:', err);
        setError(err.message);
        setPatentData(null);
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [decodedAppNumber]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="patent-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading patent details...</div>
        </div>
      </div>
    );
  }

  if (error || !patentData) {
    return (
      <div className="patent-container">
        <div className="error-container">
          <h3>No Data Available</h3>
          <p>No patent data found for application #{decodedAppNumber}</p>
        </div>
      </div>
    );
  }

  const { title = 'Title not available' } = patentData;

  return (
    <div className="patent-container">
      {/* Clean Header */}
      <div className="patent-header">
        <h1>Patent Application Details</h1>
        <div className="app-number">Application Number: {decodedAppNumber}</div>
      </div>

      {/* Documents Section */}
      <div className="documents-section">
        <div className="section-header">
          <h3>Patent File Wrapper</h3>
          <div className="documents-count">
            {documents.length} {documents.length === 1 ? 'Document' : 'Documents'}
          </div>
        </div>

        {documents.length > 0 ? (
          <table className="documents-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Code</th>
                <th>Description</th>
                <th>Category</th>
                <th>File</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc, idx) => (
                <tr key={idx}>
                  <td className="doc-date">{formatDate(doc.date)}</td>
                  <td>
                    <span className="doc-code">{doc.documentCode || 'N/A'}</span>
                  </td>
                  <td className="doc-description">
                    {doc.documentCodeDescriptionText || 'No description available'}
                  </td>
                  <td className="doc-category">{doc.category || 'N/A'}</td>
                  <td>
                    {doc.file ? (
                      <a
                        href={`https://lawmatics-backend-692908019770.asia-south1.run.app/api/patent/download?url=${encodeURIComponent(doc.file)}`}
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
            <p>No documents found for this patent application.</p>
          </div>
        )}
      </div>
    </div>
  );
};


export default PatentDetails;

