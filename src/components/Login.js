import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendOTP, verifyOTP } from '../utils/api';
import logo from '../logo.webp';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const otpRefs = useRef([]);

  useEffect(() => {
    // Focus on first OTP input when OTP is sent
    if (otpSent && otpRefs.current[0]) {
      otpRefs.current[0].focus();
    }
  }, [otpSent]);

  const handleSendOTP = async () => {
    if (!email) {
      setError('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      await sendOTP(email);
      setOtpSent(true);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      setError('Please enter the complete OTP');
      return;
    }

    setLoading(true);
    try {
      await verifyOTP(email, otpValue);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    // Allow only numbers
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // Auto-focus to next input
    if (value && index < 5) {
      otpRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    if (/^\d{6}$/.test(pastedData)) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      
      // Focus on the last input
      if (otpRefs.current[5]) {
        otpRefs.current[5].focus();
      }
    }
  };

  return (
    <div className="auth-container flex-center">
      <div className="auth-card">
        <div className="auth-header">
          <img src={logo} alt="Lawmatics Logo" className="auth-logo" />
          <h1 className="auth-title">LAWMATICS USPTO AUTOMATION DASHBOARD</h1>
        </div>
        
        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="email" className="form-label">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input"
            placeholder="Please Enter Authorized Email ID"
            disabled={otpSent}
          />
        </div>

        {otpSent && (
          <div className="form-group">
            <label htmlFor="otp" className="form-label">
              OTP (Check your email)
            </label>
            <div className="otp-container">
              <div className="otp-boxes">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (otpRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={handlePaste}
                    className="otp-input"
                    autoComplete="one-time-code"
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={otpSent ? handleVerifyOTP : handleSendOTP}
          disabled={loading}
          className="btn btn-primary btn-block"
        >
          {loading && <span className="loading-spinner"></span>}
          {loading ? 'Processing...' : otpSent ? 'Verify OTP' : 'Generate OTP'}
        </button>

        {otpSent && (
          <div className="resend-otp">
            Didn't receive the code? <a className="resend-link" onClick={handleSendOTP}>Resend OTP</a>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;