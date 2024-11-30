import React, { useState } from 'react';
import { OktoProvider, BuildType } from 'okto-sdk-react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './LoginPage';
import HomePage from './HomePage';

const OKTO_CLIENT_API_KEY = process.env.REACT_APP_OKTO_CLIENT_API_KEY;

function App() {
  console.log('App component rendered');
  const [authToken, setAuthToken] = useState(null);

  const handleLogout = () => {
    console.log("setting auth token to null");
    setAuthToken(null);
  };

  return (
    <Router>
      <OktoProvider apiKey={OKTO_CLIENT_API_KEY} buildType={BuildType.SANDBOX}>
        <Routes>
          <Route 
            path="/" 
            element={
              <LoginPage 
                setAuthToken={setAuthToken} 
                authToken={authToken} 
                handleLogout={handleLogout}
              />
            } 
          />
          <Route 
            path="/home" 
            element={
              authToken ? 
                <HomePage authToken={authToken} handleLogout={handleLogout}/> : 
                <Navigate to="/" />
            } 
          />
        </Routes>
      </OktoProvider>
    </Router>
  );
}

export default App;