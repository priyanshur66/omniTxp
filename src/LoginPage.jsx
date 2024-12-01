import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useOkto } from 'okto-sdk-react';

const LoginPage = ({ setAuthToken }) => {
  const navigate = useNavigate();
  const { authenticate } = useOkto();

  const handleGoogleLogin = async (credentialResponse) => {
    const idToken = credentialResponse.credential;
    authenticate(idToken, async (authResponse, error) => {
      if (authResponse) {
        setAuthToken(authResponse.auth_token);
        navigate('/home');
      }
      if (error) {
        console.error('Authentication error:', error);
      }
    });
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between">
      {/* Main Content */}
      <div className="flex-grow flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-12 flex flex-col items-center">
          {/* Logo and Title */}
          <div className="text-center space-y-2">
            <h1 className="text-6xl font-bold text-purple-500 mb-24">
              Omnify
            </h1>
            <p className="text-gray-200 text-xl">Pay Anyone on aptos</p>
          </div>

          {/* Google Login */}
          <div>
            <GoogleLogin
              onSuccess={handleGoogleLogin}
              onError={(error) => {
                console.error('Login Failed', error);
              }}
              useOneTap
              type="standard"
              theme="filled_black"
              size="large"
              width="220px"
              height="100%"
              text="continue_with"
              shape="pill"
              logo_alignment="left"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center mb-12 py-4">
        <p className="text-gray-500 text-sm">Powered by octo</p>
      </footer>
    </div>
  );
};

export default LoginPage;
