import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import TrademarkDetails from './components/TrademarkDetails';
import PatentDetails from './components/PatentDetails';
import './styles/App.css'; // Add this import


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/trademark/:appNumber" element={<TrademarkDetails />} />
        <Route path="/patent/:appNumber" element={<PatentDetails />} />
      </Routes>
    </Router>
  );
}

export default App;
