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
  const [lawmaticsId, setLawmaticsId] = useState(''); // Changed from matterId to lawmaticsId
  const [validEntries, setValidEntries] = useState([]);
  const [errorEntries, setErrorEntries] = useState([]);
  const [bulkType, setBulkType] = useState('');
  const [file, setFile] = useState(null);
  const [selectedMatters, setSelectedMatters] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');
// Add these state variables
const [cronStatus, setCronStatus] = useState({ enabled: false, running: false });
const [isLoading, setIsLoading] = useState(false);

// Add this useEffect to monitor cron status
useEffect(() => {
  const fetchCronStatus = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/cron/status');
      setCronStatus(response.data);
    } catch (error) {
      console.error('Error fetching cron status:', error);
    }
  };

  // Fetch status initially and set up polling
  fetchCronStatus();
  const interval = setInterval(fetchCronStatus, 5000); // Poll every 5 seconds

  return () => clearInterval(interval);
}, []);

// Add these control functions
const handleStartCron = async () => {
  setIsLoading(true);
  try {
    await axios.post('http://localhost:3001/api/cron/start');
    setCronStatus(prev => ({ ...prev, enabled: true }));
  } catch (error) {
    console.error('Error starting cron:', error);
  }
  setIsLoading(false);
};

const handleStopCron = async () => {
  setIsLoading(true);
  try {
    await axios.post('http://localhost:3001/api/cron/stop');
    setCronStatus(prev => ({ ...prev, enabled: false }));
  } catch (error) {
    console.error('Error stopping cron:', error);
  }
  setIsLoading(false);
};

const handleRunOnce = async () => {
  setIsLoading(true);
  try {
    await axios.post('http://localhost:3001/api/cron/run-once');
    // Status will update via polling
  } catch (error) {
    console.error('Error running manual job:', error);
  }
  setIsLoading(false);
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

  useEffect(() => {
    const storedValid = localStorage.getItem('validEntries');
    const storedInvalid = localStorage.getItem('errorEntries');

    if (storedValid) setValidEntries(JSON.parse(storedValid));
    if (storedInvalid) setErrorEntries(JSON.parse(storedInvalid));
    
    // Load existing matters from backend on component mount
    axios.get('http://localhost:5000/api/matters')
      .then(response => {
        const matters = response.data;
        const formattedEntries = matters.map((matter, index) => ({
          srNo: index + 1,
          matterType: matter.type,
          applicationNumber: matter.applicationNumber,
          lawmaticsID: matter.lawmaticsID, // Use lawmaticsID directly
          status: 'Pending Automation'
        }));
        setValidEntries(formattedEntries);
        localStorage.setItem('validEntries', JSON.stringify(formattedEntries));
      })
      .catch(err => console.error('Error loading matters:', err));
  }, []);

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
    
    // Validate Lawmatics ID is numeric
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
    setLawmaticsId(''); // Reset field after submission
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
      
      // Skip header row if it exists
      const startIndex = lines[0].toLowerCase().includes('applicationnumber') ? 1 : 0;
      
      const entries = lines.slice(startIndex).map((line, index) => {
        const [appNum, appType, lawmaticsId] = line.split(',').map(item => item ? item.trim() : '');
        return { 
          appNum: appNum || '', 
          type: appType || '', 
          lawmaticsId: lawmaticsId || '' 
        };
      }).filter(entry => entry.appNum && entry.type && entry.lawmaticsId); // Filter out empty rows
      
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

  const processEntries = (entries) => {
    const valid = [];
    const invalid = [];
    
    entries.forEach(({ appNum, type, lawmaticsId }) => {
      // Validate both application number and lawmatics ID
      const isValidApp = validateApplication(appNum, type);
      const isValidLawmaticsId = /^\d+$/.test(lawmaticsId);
      
      if (isValidApp && isValidLawmaticsId) {
        const entry = {
          srNo: validEntries.length + valid.length + 1,
          matterType: type,
          applicationNumber: appNum,
          lawmaticsID: lawmaticsId, // Use the provided Lawmatics ID
          status: 'Pending Automation'
        };
        valid.push(entry);
        
        // Save to backend map.json
        axios.post('http://localhost:5000/api/matters', {
          applicationNumber: appNum,
          lawmaticsID: lawmaticsId,
          type: type
        }).catch(err => console.error(err));
        
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
    });
    
    const updatedValid = [...validEntries, ...valid];
    setValidEntries(updatedValid);
    setErrorEntries([...errorEntries, ...invalid]);
    
    localStorage.setItem('validEntries', JSON.stringify(updatedValid));
    localStorage.setItem('errorEntries', JSON.stringify([...errorEntries, ...invalid]));
  };

  const handleDelete = (lawmaticsID) => {
    const updated = validEntries.filter(entry => entry.lawmaticsID !== lawmaticsID);
    const reindexed = updated.map((e, i) => ({ ...e, srNo: i + 1 }));
    setValidEntries(reindexed);
    localStorage.setItem('validEntries', JSON.stringify(reindexed));
    
    // Also remove from backend map.json
    axios.delete(`http://localhost:5000/api/matters/${lawmaticsID}`).catch(console.error);
  };

  const handleStatusChange = async (lawmaticsID, newStatus) => {
    const updated = validEntries.map(entry => {
      if (entry.lawmaticsID === lawmaticsID) {
        axios.put(`http://localhost:5000/api/matters/${lawmaticsID}`, { status: newStatus }).catch(console.error);
        return { ...entry, status: newStatus };
      }
      return entry;
    });
    setValidEntries(updated);
    localStorage.setItem('validEntries', JSON.stringify(updated));
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedMatters.length === 0) return;

    try {
      const newStatus = bulkAction === 'start' ? 'Automation Started' : 
                       bulkAction === 'abort' ? 'Automation Stopped' : 
                       'Push for Automation';

      await Promise.all(
        selectedMatters.map(lawmaticsID => 
          axios.put(`http://localhost:5000/api/matters/${lawmaticsID}`, { status: newStatus })
        )
      );

      setValidEntries(prev => 
        prev.map(entry => 
          selectedMatters.includes(entry.lawmaticsID) ? { ...entry, status: newStatus } : entry
        )
      );
      
      setSelectedMatters([]);
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  return (
    <div className="dashboard-container">
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
            onChange={(e) => setLawmaticsId(e.target.value.replace(/\D/g, ''))} // Only allow numbers
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
          // Create dummy CSV content
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

      <div className="action-controls">
        <div className="bulk-actions">
          <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}>
            <option value="">Bulk Action</option>
            <option value="start">Start Automation</option>
            <option value="abort">Abort Automation</option>
            <option value="push">Push for Automation</option>
          </select>
          <button onClick={handleBulkAction} disabled={!bulkAction || selectedMatters.length === 0}>
            Apply to Selected ({selectedMatters.length})
          </button>
          <button onClick={selectAllMatters}>Select All</button>
          <button onClick={() => {
            localStorage.clear();
            setValidEntries([]);
            setErrorEntries([]);
          }} className="reset-btn">Reset All</button>
        </div>
      </div>
{/* 👉 Add here */}
<div className="cron-control-panel">
  <h3>Automation Control</h3>
  <div className="control-buttons">
    <button 
      onClick={handleStartCron} 
      disabled={cronStatus.enabled || isLoading}
      className={cronStatus.enabled ? 'active' : ''}
    >
      {cronStatus.running ? 'Running...' : 'Start Automation'}
    </button>
    
    <button 
      onClick={handleStopCron} 
      disabled={!cronStatus.enabled || isLoading}
    >
      Stop Automation
    </button>
    
    <button 
      onClick={handleRunOnce} 
      disabled={cronStatus.running || isLoading}
    >
      Run Once Now
    </button>
  </div>
  
  <div className="status-indicator">
    <span className={`status-dot ${cronStatus.enabled ? 'running' : 'stopped'}`}></span>
    Status: {cronStatus.enabled ? 'Running' : 'Stopped'}
    {cronStatus.running && ' (Processing)'}
    {cronStatus.lastRun && ` | Last run: ${new Date(cronStatus.lastRun).toLocaleString()}`}
  </div>
</div>
{/* 👆 Add before table */}
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
                    setSelectedMatters([]);
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
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {validEntries.map(entry => (
            <tr key={entry.lawmaticsID}>
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
                <select
                  value={entry.status}
                  onChange={(e) => handleStatusChange(entry.lawmaticsID, e.target.value)}
                >
                  <option value="Pending Automation">Mark as Pending</option>
                  <option value="Push for Automation">Push for Automation</option>
                  <option value="Automation Started">Automation Started</option>
                  <option value="Automation Stopped">Stop Automation</option>
                </select>
              </td>
              <td>
                <button onClick={() => handleDelete(entry.lawmaticsID)} className="delete-btn">
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {errorEntries.length > 0 && (
        <div style={{ marginTop: '30px', color: '#b91c1c' }}>
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