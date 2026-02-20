import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom'; 
import { AcademicCapIcon, EyeIcon, PencilSquareIcon } from '@heroicons/react/24/solid'; 
import Sidebar from "../components/Sidebar";


const formatExamDate = (dateString) => {
    if (!dateString) return "ไม่ระบุวันที่";
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
};

const formatStudyDay = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', { weekday: 'long' });
};

const getDifficulty = (subjects) => {
    if (!subjects || subjects.length === 0) {
        return { text: 'N/A', color: 'bg-gray-100 text-gray-800' };
    }
    // คำนวณความยากจาก Priority สูงสุด
    const maxPriority = Math.max(...subjects.map(s => s.priority || 1));
    if (maxPriority >= 3) {
        return { text: 'ยาก', color: 'bg-red-100 text-red-800' };
    }
    if (maxPriority === 2) {
        return { text: 'ปานกลาง', color: 'bg-yellow-100 text-yellow-800' };
    }
    return { text: 'ง่าย', color: 'bg-green-100 text-green-800' };
};



export default function Subject() {
    const [plans, setPlans] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPlans = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await axios.get(
                    "http://localhost:5000/calender/api/exam-plans/", 
                    { withCredentials: true }
                );
                setPlans(response.data);
                console.log("Fetched plans:", response.data);
            } catch (err) {
                console.error("❌ Failed to fetch exam plans:", err);
                setError("ไม่สามารถดึงข้อมูลแผนการสอบได้");
            } finally {
                setIsLoading(false);
            }
        };

        fetchPlans();
    }, []);



    const renderPlanCard = (plan) => {
        const difficulty = getDifficulty(plan.subjects);

        return (
           
            <div 
                key={plan._id} 
                className="bg-white p-6 rounded-2xl shadow-lg transition-all hover:shadow-xl h-full flex flex-col"
            >
                <div className="flex-grow">
                    <div className="flex justify-between items-start mb-2">
                        <h2 className="text-2xl font-bold text-gray-800 line-clamp-2">
                            {plan.exam_title}
                        </h2>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${difficulty.color}`}>
                            {difficulty.text}
                        </span>
                    </div>

                    <div className="flex items-center text-gray-600 mb-4">
                        <AcademicCapIcon className="h-5 w-5 mr-2 text-blue-500" />
                        <p>
                            วันที่สอบ: {formatExamDate(plan.exam_date)}
                        </p>
                    </div>

                    <h3 className="text-md font-semibold text-gray-700 mt-5 mb-3 border-t pt-3">
                        ช่วงเวลาสำหรับอ่านหนังสือ
                    </h3>
                    
                    <div className="flex flex-wrap gap-2">
                        {plan.raw_study_plan_input && plan.raw_study_plan_input.slice(0, 3).map((slot, index) => (
                            <span 
                                key={index} 
                                className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap"
                            >
                                {formatStudyDay(slot.date)} {slot.startTime} - {slot.endTime}
                            </span>
                        ))}
                         {plan.raw_study_plan_input && plan.raw_study_plan_input.length > 3 && (
                            <span className="text-xs text-gray-500 mt-1 ml-1">
                                และอื่นๆ อีก {plan.raw_study_plan_input.length - 3} วัน...
                            </span>
                        )}
                        {!plan.raw_study_plan_input || plan.raw_study_plan_input.length === 0 ? (
                            <p className="text-sm text-gray-500">ยังไม่ได้กำหนดเวลาอ่าน</p>
                        ) : null}
                    </div>
                </div>

                <div className="border-t border-gray-200 mt-6 pt-4 flex justify-end gap-3">
                    <Link 
                        to={`/exam-plan/${plan._id}`}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition flex items-center gap-1.5"
                    >
                        <EyeIcon className="h-4 w-4" />
                        ดูรายละเอียด
                    </Link>
                    
                    <Link 
                        to={`/exam-planner/edit/${plan._id}`} 
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition flex items-center gap-1.5"
                    >
                        <PencilSquareIcon className="h-4 w-4" />
                        แก้ไข
                    </Link>
                </div>
                
            </div>
        );
    };

    return (
        <div className="flex bg-gray-50 min-h-screen">
            
            <Sidebar />
            
            <div className="flex-1 p-4 sm:p-8">
                <div className="max-w-5xl mx-auto">
                    
                    <h1 className="text-3xl font-extrabold text-gray-900 mb-8 border-b pb-4">
                        แผนการอ่านหนังสือทั้งหมด
                    </h1>

                    {isLoading ? (
                        <div className="text-center py-10 text-blue-600">กำลังโหลดข้อมูล...</div>
                    ) : error ? (
                        <div className="text-center py-10 text-red-500">{error}</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {plans.length > 0 ? (
                                plans.map(plan => renderPlanCard(plan))
                            ) : (
                                <div className="col-span-1 md:col-span-2 text-center bg-white p-10 rounded-xl shadow-md">
                                    <p className="text-xl font-semibold text-gray-600 mb-4">ไม่พบแผนการสอบ</p>
                                    <p className="text-gray-500">โปรดเริ่มสร้างแผนการอ่านหนังสือใหม่เพื่อเตรียมตัวสอบ</p>
                                </div>
                            )}
                        </div>
                    )}


                    {!isLoading && (
                        <div className="mt-12 flex justify-center">
       
                            <Link 
                                to="/create-plan" 
                                className="px-8 py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-all text-lg flex items-center gap-2"
                            >
                                <PencilSquareIcon className="h-6 w-6" />
                                สร้างแผนการอ่านใหม่
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
