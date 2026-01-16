import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await axios.get('http://localhost:5000/check/', {
          withCredentials: true,
        });
        if (res.data.logged_in) {
          setUsername(res.data.username);
        } else {
          navigate('/login');
        }
      } catch (err) {
        console.error('Session check error:', err);
        navigate('/login');
      }
    };
    checkSession();
  }, [navigate]);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Welcome, {username}!</h1>
      <p>ยินดีต้อนรับกลับเข้าสู่ระบบ 🎉</p>
    </div>
  );
}
