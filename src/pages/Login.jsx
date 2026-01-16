import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

export default function StudyPlannerLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      alert('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }

    try {
      const res = await axios.post('http://localhost:5000/login/',
        { username, password },
        { withCredentials: true }
      );

      if (res.data.success) {
        // --- ⭐️ ส่วนสำคัญที่เพิ่มเข้ามา ⭐️ ---
        // ถ้ามี user_id ส่งมา ให้เก็บลง localStorage
        if (res.data.user_id) {
            localStorage.setItem('userId', res.data.user_id);
        }
        // --------------------------------

        alert('เข้าสู่ระบบสำเร็จ');

        if (res.data.role === 'admin') {
          navigate('/Admin');
        } else {
          navigate('/home');
        }

      } else {
        alert(res.data.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }

    } catch (err) {
      console.error('Login error:', err);
      // Backend (Flask) ส่ง 401 กลับมา axios จะเข้า catch block นี้
      if (err.response && err.response.data && err.response.data.message) {
          alert(err.response.data.message);
      } else {
          alert('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }
    }
  };

  const handleGoogleLogin = () => {
    console.log('Google login clicked');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Brand Section */}
      <div className="w-1/2 bg-white flex flex-col items-center justify-center p-12">
        <div className="max-w-md text-center">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">EXAM PLANNER</h1>
          <div className="flex justify-center">
            <img
              className='icons max-w-xs mx-auto'
              src="/icons.jpg"
              alt="Study Illustration"
            />
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-1/2 flex items-center justify-center p-12 bg-gradient-to-br from-blue-100 via-purple-50 to-yellow-50">
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-bold text-center mb-12">LOG IN</h2>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-6 py-4 rounded-full border-2 border-gray-300 bg-white text-gray-800 focus:border-gray-800 focus:outline-none"
              />
            </div>

            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-6 py-4 rounded-full border-2 border-gray-300 bg-white text-gray-800 focus:border-gray-800 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-700 text-white py-4 rounded-full font-semibold text-lg hover:bg-blue-800 transition-colors"
            >
              LOG IN
            </button>
          </form>

          <div className="text-center mt-6">
            ยังไม่มีบัญชีใช่ไหม{' '}
            <Link to="/signup" className="text-blue-600 hover:underline font-semibold">
              Sign Up
            </Link>
          </div>

          <div className="flex items-center my-8">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-4 text-gray-500">- or continue with -</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full bg-white border-2 border-gray-200 py-4 rounded-full font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-3"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}