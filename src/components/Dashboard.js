import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../utils/api';
import axios from 'axios';
import './Dashboard.css';
import logo from '../logo.webp';

const Dashboard = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('single');
  const [applicationNumber, setApplicationNumber] = useState('');
  const [applicationType, setApplicationType] = useState('');
  const [lawmaticsId, setLawmaticsId] = useState('');
  const [validEntries, setValidEntries] = useState([]);
  const [errorEntries, setErrorEntries] = useState([]);
  const [bulkType, setBulkType] = useState('');
  const [file, setFile] = useState(null);
  const [selectedMatters, setSelectedMatters] = useState([]);
  const [cronStatus, setCronStatus] = useState({ enabled: false, running: false, lastRun: null });
  const [isLoading, setIsLoading] = useState(false);
  const [processingMatters, setProcessingMatters] = useState(new Set());
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  const showNotification = (message, type = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 5000);
  };

  // Helper function for status classes
  const getStatusClass = (status) => {
    const statusMap = {
      'Automation Completed': 'completed',
      'No Updates Found': 'no-updates', 
      'Processing...': 'processing',
      'Failed': 'failed',
      'Pending Automation': 'pending'
    };
    return statusMap[status] || 'pending';
  };

  // Monitor automation status
  useEffect(() => {
    const fetchCronStatus = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/automation/status');
        setCronStatus(response.data);
      } catch (error) {
        console.error('Error fetching automation status:', error);
      }
    };

    fetchCronStatus();
    const interval = setInterval(fetchCronStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  // Load matters and sync with backend status
  useEffect(() => {
    loadMattersFromBackend();
    
    // Poll for status updates every 3 seconds
    const statusInterval = setInterval(() => {
      syncMatterStatuses();
    }, 3000);

    return () => clearInterval(statusInterval);
  }, []);

  // Sync matter statuses with backend
  const syncMatterStatuses = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/matters');
      const backendMatters = response.data;
      
      setValidEntries(prev => prev.map(entry => {
        const backendMatter = backendMatters.find(m => m.lawmaticsID === entry.lawmaticsID);
        if (backendMatter && backendMatter.status !== entry.status) {
          return { ...entry, status: backendMatter.status };
        }
        return entry;
      }));
    } catch (error) {
      console.error('Error syncing matter statuses:', error);
    }
  };

  const loadMattersFromBackend = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/matters');
      const matters = response.data;
      const formattedEntries = matters.map((matter, index) => ({
        srNo: index + 1,
        matterType: matter.type,
        applicationNumber: matter.applicationNumber,
        lawmaticsID: matter.lawmaticsID,
        status: matter.status || 'Pending Automation'
      }));
      setValidEntries(formattedEntries);
      localStorage.setItem('validEntries', JSON.stringify(formattedEntries));
    } catch (err) {
      console.error('Error loading matters:', err);
    }
  };

  // Helper function to update matter status in backend
  const updateMatterStatus = async (lawmaticsId, status) => {
    try {
      await axios.put(`http://localhost:5000/api/matters/${lawmaticsId}`, { status });
      
      // Update local state
      setValidEntries(prev => prev.map(entry => 
        entry.lawmaticsID === lawmaticsId ? { ...entry, status } : entry
      ));
    } catch (error) {
      console.error('Error updating matter status:', error);
    }
  };

  // Automation Control Functions
  const handleStartAutomation = async () => {
    setIsLoading(true);
    try {
      await axios.post('http://localhost:5000/api/automation/start');
      showNotification('Scheduled automation started', 'success');
    } catch (error) {
      console.error('Error starting automation:', error);
      showNotification('Failed to start automation', 'error');
    }
    setIsLoading(false);
  };

  const handleStopAutomation = async () => {
    setIsLoading(true);
    try {
      await axios.post('http://localhost:5000/api/automation/stop');
      showNotification('Scheduled automation stopped', 'success');
    } catch (error) {
      console.error('Error stopping automation:', error);
      showNotification('Failed to stop automation', 'error');
    }
    setIsLoading(false);
  };

  const handleRunAllMatters = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/automation/run-once');
      showNotification(`Processed ${response.data.processed} new documents out of ${response.data.total} matters`, 'success');
      
      // Refresh matters to get updated statuses
      setTimeout(() => {
        loadMattersFromBackend();
      }, 2000);
    } catch (error) {
      console.error('Error running automation:', error);
      showNotification('Failed to run automation', 'error');
    }
    setIsLoading(false);
  };

  // Update process single matter to set backend status
  const handleProcessSingleMatter = async (lawmaticsId) => {
    setProcessingMatters(prev => new Set([...prev, lawmaticsId]));
    
    try {
      // Update status to "Processing" immediately
      await updateMatterStatus(lawmaticsId, 'Processing...');
      
      const response = await axios.post('http://localhost:5000/api/automation/process-single', { lawmaticsId });
      
      if (response.data.success) {
        const newStatus = response.data.processed ? 'Automation Completed' : 'No Updates Found';
        await updateMatterStatus(lawmaticsId, newStatus);
        showNotification(`Matter processed: ${response.data.message}`, 'success');
      } else {
        await updateMatterStatus(lawmaticsId, 'Failed');
        showNotification(`Failed: ${response.data.message}`, 'error');
      }
    } catch (error) {
      await updateMatterStatus(lawmaticsId, 'Failed');
      showNotification('Failed to process matter', 'error');
    } finally {
      setProcessingMatters(prev => {
        const newSet = new Set(prev);
        newSet.delete(lawmaticsId);
        return newSet;
      });
    }
  };

  const handleProcessSelectedMatters = async () => {
    if (selectedMatters.length === 0) {
      showNotification('Please select matters to process', 'warning');
      return;
    }

    setIsLoading(true);
    
    // Add all selected matters to processing set
    setProcessingMatters(prev => new Set([...prev, ...selectedMatters]));
    
    try {
      // Update all selected matters to processing status
      await Promise.all(
        selectedMatters.map(lawmaticsId => 
          updateMatterStatus(lawmaticsId, 'Processing...')
        )
      );

      const response = await axios.post('http://localhost:5000/api/automation/process-multiple', { 
        lawmaticsIds: selectedMatters 
      });
      
      if (response.data.success) {
        // Update statuses based on individual results
        if (response.data.results) {
          for (const result of response.data.results) {
            const status = result.success 
              ? (result.processed ? 'Automation Completed' : 'No Updates Found')
              : 'Failed';
            await updateMatterStatus(result.lawmaticsId, status);
          }
        }
        
        showNotification(`Processed ${response.data.processed} new documents out of ${response.data.total} selected matters`, 'success');
        setSelectedMatters([]);
      } else {
        // If bulk operation failed, mark all as failed
        await Promise.all(
          selectedMatters.map(lawmaticsId => 
            updateMatterStatus(lawmaticsId, 'Failed')
          )
        );
        showNotification(`Failed: ${response.data.message}`, 'error');
      }
    } catch (error) {
      console.error('Error processing multiple matters:', error);
      // Mark all as failed on error
      await Promise.all(
        selectedMatters.map(lawmaticsId => 
          updateMatterStatus(lawmaticsId, 'Failed')
        )
      );
      showNotification('Failed to process matters', 'error');
    } finally {
      setIsLoading(false);
      // Remove all selected matters from processing set
      setProcessingMatters(prev => {
        const newSet = new Set(prev);
        selectedMatters.forEach(id => newSet.delete(id));
        return newSet;
      });
    }
  };

  // Existing functions
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleSingleSubmit = () => {
    if (!applicationNumber || !applicationType || !lawmaticsId) {
      alert('Please fill all fields including Lawmatics ID');
      return;
    }
    
    if (!/^\d+$/.test(lawmaticsId)) {
      alert('Lawmatics ID must be a numeric value');
      return;
    }
    
    const entry = [{ 
      appNum: applicationNumber.trim(), 
      type: applicationType,
      lawmaticsId: lawmaticsId.trim()
    }];
    
    processEntries(entry);
    setLawmaticsId('');
  };

  const handleBulkUpload = () => {
    if (!file) {
      alert('Please upload a CSV file');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.trim().split('\n');
      
      const startIndex = lines[0].toLowerCase().includes('applicationnumber') ? 1 : 0;
      
      const entries = lines.slice(startIndex).map((line, index) => {
        const [appNum, appType, lawmaticsId] = line.split(',').map(item => item ? item.trim() : '');
        return { 
          appNum: appNum || '', 
          type: appType || '', 
          lawmaticsId: lawmaticsId || '' 
        };
      }).filter(entry => entry.appNum && entry.type && entry.lawmaticsId);
      
      if (entries.length === 0) {
        alert('No valid data found in CSV file. Please check the format.');
        return;
      }
      
      processEntries(entries);
    };
    reader.onerror = () => {
      alert('Error reading file');
    };
    reader.readAsText(file);
  };

  const validateApplication = (appNum, type) => {
    if (type === 'Patent') {
      return (
        /^\d{8}$/.test(appNum) ||
        /^PCT\/[A-Z]{2}\d{2}\/\d{4,6}$/.test(appNum) ||
        /^PCT[A-Z]{2}\d{4,6}$/.test(appNum)
      );
    }
    return /^\d{8}$/.test(appNum) && type === 'Trademark';
  };

  const processEntries = async (entries) => {
    const valid = [];
    const invalid = [];
    
    for (const { appNum, type, lawmaticsId } of entries) {
      const isValidApp = validateApplication(appNum, type);
      const isValidLawmaticsId = /^\d+$/.test(lawmaticsId);
      
      if (isValidApp && isValidLawmaticsId) {
        try {
          // Make the API call and wait for response
          const response = await axios.post('http://localhost:5000/api/matters', {
            applicationNumber: appNum,
            lawmaticsID: lawmaticsId,
            type: type
          });
          
          if (response.data.success) {
            const entry = {
              srNo: validEntries.length + valid.length + 1,
              matterType: type,
              applicationNumber: appNum,
              lawmaticsID: lawmaticsId,
              status: 'Pending Automation'
            };
            valid.push(entry);
            console.log('✅ Matter added to backend:', appNum);
          }
        } catch (error) {
          console.error('❌ Error adding matter to backend:', error.response?.data || error.message);
          let reason = 'Backend error: ' + (error.response?.data?.error || error.message);
          invalid.push({ 
            row: errorEntries.length + invalid.length + 1, 
            appNum, 
            lawmaticsId,
            reason 
          });
        }
      } else {
        let reason = '';
        if (!isValidApp && !isValidLawmaticsId) {
          reason = 'Invalid Application Format and Invalid Lawmatics ID';
        } else if (!isValidApp) {
          reason = 'Invalid Application Format';
        } else {
          reason = 'Invalid Lawmatics ID (must be numeric)';
        }
        
        invalid.push({ 
          row: errorEntries.length + invalid.length + 1, 
          appNum, 
          lawmaticsId,
          reason 
        });
      }
    }
    
    const updatedValid = [...validEntries, ...valid];
    setValidEntries(updatedValid);
    setErrorEntries([...errorEntries, ...invalid]);
    
    localStorage.setItem('validEntries', JSON.stringify(updatedValid));
    localStorage.setItem('errorEntries', JSON.stringify([...errorEntries, ...invalid]));
    
    // Show notification
    if (valid.length > 0) {
      showNotification(`Successfully added ${valid.length} matter(s)`, 'success');
    }
    if (invalid.length > 0) {
      showNotification(`${invalid.length} matter(s) failed to add`, 'error');
    }
  };

  const handleDelete = (lawmaticsID) => {
    const updated = validEntries.filter(entry => entry.lawmaticsID !== lawmaticsID);
    const reindexed = updated.map((e, i) => ({ ...e, srNo: i + 1 }));
    setValidEntries(reindexed);
    localStorage.setItem('validEntries', JSON.stringify(reindexed));
    
    axios.delete(`http://localhost:5000/api/matters/${lawmaticsID}`).catch(console.error);
  };

  const toggleMatterSelection = (lawmaticsID) => {
    setSelectedMatters(prev => 
      prev.includes(lawmaticsID) 
        ? prev.filter(id => id !== lawmaticsID)
        : [...prev, lawmaticsID]
    );
  };

  const selectAllMatters = () => {
    setSelectedMatters(validEntries.map(entry => entry.lawmaticsID));
  };

  const deselectAllMatters = () => {
    setSelectedMatters([]);
  };

  return (
    <div className="dashboard-container">
      {/* Notification */}
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <header className="dashboard-header">
        <div className="header-left">
          <img src={logo} alt="Lawmatics Logo" className="logo-img"/>
        </div>
        <div className="header-title">
          <h1>LAWMATICS USPTO AUTOMATION DASHBOARD</h1>
        </div>
        <div className="header-right">
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      {/* Automation Control Panel */}
      <div className="automation-control-panel">
        <h3>Automation Control Center</h3>
        <div className="control-buttons">
          <button 
            onClick={handleStartAutomation} 
            disabled={cronStatus.enabled || isLoading}
            className={cronStatus.enabled ? 'active' : ''}
          >
            {cronStatus.running ? 'Running...' : 'Start Scheduled Automation'}
          </button>
          
          <button 
            onClick={handleStopAutomation} 
            disabled={!cronStatus.enabled || isLoading}
          >
            Stop Scheduled Automation
          </button>
          
          <button 
            onClick={handleRunAllMatters} 
            disabled={cronStatus.running || isLoading}
          >
            Run All Matters Now
          </button>

          <button 
            onClick={handleProcessSelectedMatters} 
            disabled={selectedMatters.length === 0 || isLoading}
            className="process-selected-btn"
          >
            Process Selected ({selectedMatters.length})
          </button>
        </div>
        
        <div className="status-indicator">
          <span className={`status-dot ${cronStatus.enabled ? 'running' : 'stopped'}`}></span>
          Status: {cronStatus.enabled ? 'Scheduled Automation Running' : 'Scheduled Automation Stopped'}
          {cronStatus.running && ' (Processing...)'}
          {cronStatus.lastRun && ` | Last run: ${new Date(cronStatus.lastRun).toLocaleString()}`}
        </div>
      </div>

      <div className="dashboard-toggle">
        <button className={viewMode === 'single' ? 'active' : ''} onClick={() => setViewMode('single')}>Single Entry</button>
        <span>or</span>
        <button className={viewMode === 'bulk' ? 'active' : ''} onClick={() => setViewMode('bulk')}>Bulk Upload</button>
      </div>

      {viewMode === 'single' && (
        <div className="form-section">
          <input 
            type="text" 
            placeholder="Enter Application Number" 
            value={applicationNumber} 
            onChange={(e) => setApplicationNumber(e.target.value)} 
          />
          <input 
            type="text" 
            placeholder="Enter Lawmatics ID (numeric)" 
            value={lawmaticsId} 
            onChange={(e) => setLawmaticsId(e.target.value.replace(/\D/g, ''))}
          />
          <select value={applicationType} onChange={(e) => setApplicationType(e.target.value)}>
            <option value="">Select Matter Type</option>
            <option value="Trademark">Trademark</option>
            <option value="Patent">Patent</option>
          </select>
          <button onClick={handleSingleSubmit}>Submit</button>
        </div>
      )}

      {viewMode === 'bulk' && (
        <div className="form-section">
          <input type="file" accept=".csv,.txt" onChange={(e) => setFile(e.target.files[0])} />
          <button onClick={handleBulkUpload}>Upload</button>
          <button 
            onClick={() => {
              const csvContent = `applicationNumber,applicationType,lawmaticsId\n12345678,Trademark,1001\n98765432,Patent,1002\nPCT/US22/12345,Patent,1003`;
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'bulk_upload_template.csv';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            }}
            className="download-template-btn"
          >
            Download CSV Template
          </button>
          <div style={{marginTop: '10px'}}>
            <small><b>CSV format:</b> applicationNumber,applicationType,lawmaticsId (one per line)</small>
          </div>
        </div>
      )}

      {/* Selection Controls */}
      <div className="selection-controls">
        <div className="selection-info">
          <span>{selectedMatters.length} matters selected</span>
        </div>
        <div className="selection-buttons">
          <button onClick={selectAllMatters}>Select All</button>
          <button onClick={deselectAllMatters}>Deselect All</button>
        </div>
      </div>

      {/* Matters Table */}
      <table className="automation-table">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                onChange={(e) => {
                  if (e.target.checked) {
                    selectAllMatters();
                  } else {
                    deselectAllMatters();
                  }
                }}
                checked={selectedMatters.length === validEntries.length && validEntries.length > 0}
              />
            </th>
            <th>Sr. No.</th>
            <th>Matter Type</th>
            <th>Application Number</th>
            <th>Lawmatics ID</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {validEntries.map(entry => (
            <tr key={entry.lawmaticsID} className={processingMatters.has(entry.lawmaticsID) ? 'processing' : ''}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedMatters.includes(entry.lawmaticsID)}
                  onChange={() => toggleMatterSelection(entry.lawmaticsID)}
                />
              </td>
              <td>{entry.srNo}</td>
              <td>{entry.matterType}</td>
              <td>
                <a
                  href={`/${entry.matterType.toLowerCase()}/${encodeURIComponent(entry.applicationNumber.replaceAll('/', ''))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {entry.applicationNumber}
                </a>
              </td>
              <td>{entry.lawmaticsID}</td>
              <td>
                <span className={`status-badge ${getStatusClass(entry.status)}`}>
                  {processingMatters.has(entry.lawmaticsID) ? '⏳ Processing...' : entry.status}
                </span>
              </td>
              <td>
                <div className="action-buttons">
                  <button 
                    onClick={() => handleProcessSingleMatter(entry.lawmaticsID)}
                    disabled={processingMatters.has(entry.lawmaticsID) || isLoading}
                    className="process-btn"
                  >
                    {processingMatters.has(entry.lawmaticsID) ? 'Processing...' : 'Process Now'}
                  </button>
                  <button 
                    onClick={() => handleDelete(entry.lawmaticsID)} 
                    className="delete-btn"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {errorEntries.length > 0 && (
        <div className="error-section">
          <h3>Invalid Entries</h3>
          <ul>
            {errorEntries.map((err, idx) => (
              <li key={idx}>Row {err.row}: {err.appNum} (Lawmatics ID: {err.lawmaticsId}) - {err.reason}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Dashboard;