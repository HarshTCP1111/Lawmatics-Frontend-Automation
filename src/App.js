import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import TrademarkDetails from './components/TrademarkDetails';
import PatentDetails from './components/PatentDetails';
import './styles/App.css';

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
        <Route 
          path="/trademark/:appNumber" 
          element={
            <ProtectedRoute>
              <TrademarkDetails />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/patent/:appNumber" 
          element={
            <ProtectedRoute>
              <PatentDetails />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
