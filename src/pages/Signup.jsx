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
    // ใช้ 'name' attribute ของ input เพื่อระบุ field ที่จะอัปเดต
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // ฟังก์ชันสำหรับส่งข้อมูลการสมัครสมาชิกไปยัง API
  const handleSignUp = async (e) => {
    e.preventDefault(); // ป้องกันการรีเฟรชหน้าเว็บ

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
        navigate('/login'); // กลับไปที่หน้าหลักหลังสมัครเสร็จ
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
        
        {/* ใช้ <form> และ onSubmit เพื่อจัดการการ submit */}
        <form onSubmit={handleSignUp}>
          <input
            type="text"
            name="username" // เพิ่ม name attribute
            placeholder="Username"
            value={formData.username} // เชื่อมกับ state
            onChange={handleChange} // เชื่อมกับ function
            required
            className="w-full px-8 py-2 rounded-full border-2 border-gray-300 bg-white text-gray-800 focus:border-gray-800 focus:outline-none mb-3"
          />
          <input
            type="email"
            name="email" // เพิ่ม name attribute
            placeholder="Email"
            value={formData.email} // เชื่อมกับ state
            onChange={handleChange} // เชื่อมกับ function
            required
            className="w-full px-8 py-2 rounded-full border-2 border-gray-300 bg-white text-gray-800 focus:border-gray-800 focus:outline-none mb-3"
          />
          <input
            type="password"
            name="password" // เพิ่ม name attribute
            placeholder="Password"
            value={formData.password} // เชื่อมกับ state
            onChange={handleChange} // เชื่อमกับ function
            required
            className="w-full px-8 py-2 rounded-full border-2 border-gray-300 bg-white text-gray-800 focus:border-gray-800 focus:outline-none mb-4"
          />
          <button 
            type="submit" // เปลี่ยนเป็น type="submit"
            className="w-full py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-800 transition-colors"
          >
            Sign Up
          </button>
        </form>
      </div>
    </div>
  );
}