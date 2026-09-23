import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Board from './pages/Board';
import './assets/style.css';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route 
          path="/board" 
          element={
            <ProtectedRoute>
              <Board />
            </ProtectedRoute>
          } 
        />
        <Route path="/" element={<Navigate to="/board" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
