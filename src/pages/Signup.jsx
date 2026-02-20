import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Signup() {
  const navigate = useNavigate();

  // State สำหรับเก็บข้อมูลจากฟอร์ม
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });

  // ฟังก์ชันสำหรับอัปเดต state เมื่อผู้ใช้พิมพ์ใน input
  const handleChange = (e) => {

    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // ฟังก์ชันสำหรับส่งข้อมูลการสมัครสมาชิกไปยัง API
  const handleSignUp = async (e) => {
    e.preventDefault(); 

    try {
      const response = await fetch('http://localhost:5000/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        alert('สมัครสมาชิกสำเร็จ!');
        navigate('/login'); 
      } else {
        alert('เกิดข้อผิดพลาด: ' + result.message);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-50 to-yellow-50">
      <div className="w-96 bg-white shadow-lg rounded-2xl p-10">
        <h2 className="text-2xl font-bold text-center mb-6">Sign Up</h2>
        
     
        <form onSubmit={handleSignUp}>
          <input
            type="text"
            name="username" 
            placeholder="Username"
            value={formData.username} 
            onChange={handleChange} 
            required
            className="w-full px-8 py-2 rounded-full border-2 border-gray-300 bg-white text-gray-800 focus:border-gray-800 focus:outline-none mb-3"
          />
          <input
            type="email"
            name="email" 
            placeholder="Email"
            value={formData.email} 
            onChange={handleChange} 
            required
            className="w-full px-8 py-2 rounded-full border-2 border-gray-300 bg-white text-gray-800 focus:border-gray-800 focus:outline-none mb-3"
          />
          <input
            type="password"
            name="password" 
            placeholder="Password"
            value={formData.password} 
            onChange={handleChange} 
            required
            className="w-full px-8 py-2 rounded-full border-2 border-gray-300 bg-white text-gray-800 focus:border-gray-800 focus:outline-none mb-4"
          />
          <button 
            type="submit" 
            className="w-full py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-800 transition-colors"
          >
            Sign Up
          </button>
        </form>
      </div>
    </div>
  );
}