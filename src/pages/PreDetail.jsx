// สันนิษฐานว่านี่คือไฟล์ PreDetail.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom'; 

export default function PreDetail() { 
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/login'); 
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-5xl w-full">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          
          <div>
            <h1 className="text-5xl font-bold text-blue-700 mb-4">
              Plan your exam schedule
            </h1>
            <p className="text-gray-600 text-lg mb-8">
              จัดตารางสอบของคุณให้ง่าย ไม่ว่าจะสอบถี่หรือสอบน้อย
              วางแผนชีวิตให้ดี ไม่มีพลาดนัดสำคัญ
            </p>
            <button 
              onClick={handleGetStarted} 
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105"
            >
              Get Started
            </button>
          </div>

        
          <div className="flex justify-center">
            <img
              src="/calendar.png" 
              alt="Exam illustration"
              className="w-full max-w-md object-contain"
            />
          </div>

        </div>
      </div>
    </div>
  );
}