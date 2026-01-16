import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Sidebar from "../components/Sidebar";
import { useNavigate } from 'react-router-dom'; // [1] เพิ่ม import useNavigate
import { ChevronLeftIcon, ChevronRightIcon, BookOpenIcon, ClockIcon } from '@heroicons/react/24/solid';

// --- Helper Functions (เหมือนเดิม) ---
const getDaysInMonth = (year, month) => {
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
        days.push(new Date(date));
        date.setDate(date.getDate() + 1);
    }
    return days;
};

const getMonthStartDay = (year, month) => {
    return new Date(year, month, 1).getDay();
};

const getLocalDateString = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function Calendar() {
    const [currentDate, setCurrentDate] = useState(new Date()); 
    const navigate = useNavigate(); // [2] ประกาศตัวแปร navigate

    // --- State ---
    const [planList, setPlanList] = useState([]); 
    const [selectedPlanId, setSelectedPlanId] = useState(""); 
    const [planDetails, setPlanDetails] = useState(null); 
    
    const [isLoadingList, setIsLoadingList] = useState(true);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [error, setError] = useState(null);

    // [3] ลบ State ของ Modal ออกไปเลย (ไม่ต้องใช้แล้ว)

    // 1. Fetch List
    useEffect(() => {
        const fetchPlanList = async () => {
            setIsLoadingList(true);
            setError(null);
            try {
                const response = await axios.get(
                    "http://localhost:5000/calender/api/exam-plans/", 
                    { withCredentials: true }
                );
                
                if (Array.isArray(response.data) && response.data.length > 0) {
                    setPlanList(response.data);
                    setSelectedPlanId(response.data[0]._id);
                    if (response.data[0].prep_start_date) {
                        const startDate = new Date(response.data[0].prep_start_date);
                        setCurrentDate(new Date(startDate.getFullYear(), startDate.getMonth(), 1));
                    }
                } else {
                    setPlanList([]);
                    setError("ไม่พบแผนการสอบ");
                }
            } catch (err) {
                console.error("Error fetching list:", err);
                setPlanList([]);
                setError(err.response?.data?.message || "ไม่สามารถดึงรายชื่อแผนได้");
            } finally {
                setIsLoadingList(false);
            }
        };
        fetchPlanList();
    }, []);

    // 2. Fetch Details
    useEffect(() => {
        if (!selectedPlanId) {
            setPlanDetails(null);
            return;
        }
        const fetchPlanDetails = async () => {
            setIsLoadingDetails(true);
            try {
                const response = await axios.get(
                    `http://localhost:5000/calender/api/exam-plan/${selectedPlanId}`,
                    { withCredentials: true }
                );
                setPlanDetails(response.data);
                setError(null);
                
                if (response.data.prep_start_date) {
                    const startDate = new Date(response.data.prep_start_date);
                    setCurrentDate(new Date(startDate.getFullYear(), startDate.getMonth(), 1));
                } else if (response.data.generated_schedule?.length > 0) {
                    const firstSlot = response.data.generated_schedule[0];
                    const [year, month] = firstSlot.date.split('-');
                    setCurrentDate(new Date(parseInt(year), parseInt(month) - 1, 1));
                } else if (response.data.study_plan?.length > 0) {
                    const firstSlot = response.data.study_plan[0];
                    const [year, month] = firstSlot.date.split('-');
                    setCurrentDate(new Date(parseInt(year), parseInt(month) - 1, 1));
                }
            } catch (err) {
                console.error("Error fetching details:", err);
                setPlanDetails(null);
                setError(err.response?.data?.message || "ไม่สามารถดึงรายละเอียดแผนได้");
            } finally {
                setIsLoadingDetails(false);
            }
        };
        fetchPlanDetails();
    }, [selectedPlanId]); 

    // UseMemos
    const scheduleMap = useMemo(() => {
        const newMap = new Map();
        if (!planDetails) return newMap;
        const sessions = planDetails.study_plan || planDetails.generated_schedule || [];
        
        sessions.forEach(slot => {
            if (!slot.date) return;
            const dateKey = slot.date; 
            const existingSlots = newMap.get(dateKey) || [];
            newMap.set(dateKey, [...existingSlots, slot]);
        });

        if (planDetails.exam_date) {
            const examDateKey = planDetails.exam_date;
            const examSlot = {
                subject: `🎯 สอบ: ${planDetails.exam_title || 'ไม่ระบุชื่อ'}`,
                isExam: true,
                startTime: '',
                endTime: ''
            };
            const existing = newMap.get(examDateKey) || [];
            newMap.set(examDateKey, [examSlot, ...existing]); 
        }
        return newMap;
    }, [planDetails]);

    const calendarGrid = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const startDay = getMonthStartDay(year, month);
        const grid = [];
        for (let i = 0; i < startDay; i++) grid.push({ date: null, isCurrentMonth: false });
        for (const day of daysInMonth) grid.push({ date: day, isCurrentMonth: true });
        return grid;
    }, [currentDate]);

    const goToNextMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    const goToPrevMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    const dayHeaders = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

    const stats = useMemo(() => {
        if (!planDetails) return { total: 0, completed: 0, pending: 0 };
        const sessions = planDetails.study_plan || planDetails.generated_schedule || [];
        return {
            total: sessions.length,
            completed: sessions.filter(s => s.status === 'completed').length,
            pending: sessions.filter(s => s.status === 'pending').length
        };
    }, [planDetails]);

    // [4] แก้ไขฟังก์ชันคลิก: เปลี่ยนเป็น navigate ไปหน้าใหม่
    const handleDayClick = (dateObj) => {
        if (!dateObj) return;
        const dateString = getLocalDateString(dateObj);
        // ลิงก์ไปที่ /schedule/day/2026-01-16 (ตามที่เราตั้งใน App.js)
        navigate(`/schedule/day/${dateString}`);
    };

    return (
        <div className="flex bg-gradient-to-br from-blue-50 via-white to-indigo-50 min-h-screen font-sans">
            <Sidebar />

            <div className="flex-1 p-4 sm:p-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header Card */}
                    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                                    📅 ปฏิทินการอ่านหนังสือ
                                </h1>
                                <div className="flex flex-wrap gap-3 text-sm">
                                    <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                                        <BookOpenIcon className="w-4 h-4" /> <span>ทั้งหมด: {stats.total}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-green-600 bg-green-50 px-3 py-1 rounded-full">
                                        <span>✓ เสร็จแล้ว: {stats.completed}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
                                        <ClockIcon className="w-4 h-4" /> <span>รอทำ: {stats.pending}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="w-full md:w-72">
                                <select
                                    value={selectedPlanId}
                                    onChange={(e) => setSelectedPlanId(e.target.value)}
                                    disabled={isLoadingList}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none shadow-sm disabled:opacity-50"
                                >
                                    {isLoadingList ? <option>กำลังโหลด...</option> : planList.length === 0 ? <option>ไม่พบแผนการสอบ</option> : planList.map(plan => <option key={plan._id} value={plan._id}>📚 {plan.exam_title || 'ไม่ระบุชื่อ'}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {error && <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg text-red-700">{error}</div>}

                    {/* Calendar Card */}
                    <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                        <div className="flex items-center justify-between mb-6 bg-gradient-to-r from-blue-500 to-indigo-600 p-5 rounded-xl text-white shadow-lg">
                            <button onClick={goToPrevMonth} className="p-2 rounded-lg hover:bg-white/20 transition-all"><ChevronLeftIcon className="w-6 h-6" /></button>
                            <h2 className="text-2xl font-bold">{currentDate.toLocaleString('th-TH', { month: 'long', year: 'numeric' })}</h2>
                            <button onClick={goToNextMonth} className="p-2 rounded-lg hover:bg-white/20 transition-all"><ChevronRightIcon className="w-6 h-6" /></button>
                        </div>

                        <div className="grid grid-cols-7 gap-2 mb-4">
                            {dayHeaders.map((day, idx) => (
                                <div key={day} className={`text-center py-2 font-semibold text-sm ${idx === 0 || idx === 6 ? 'text-red-500' : 'text-gray-600'}`}>{day}</div>
                            ))}
                        </div>

                        {isLoadingDetails ? (
                            <div className="h-96 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-7 gap-2 lg:gap-3">
                                {calendarGrid.map((day, index) => {
                                    if (!day.isCurrentMonth) {
                                        return <div key={`empty-${index}`} className="aspect-square rounded-xl bg-gray-50/50"></div>;
                                    }

                                    const dateString = getLocalDateString(day.date);
                                    const daySchedule = scheduleMap.get(dateString);
                                    const isToday = dateString === getLocalDateString(new Date());
                                    const hasSchedule = daySchedule && daySchedule.length > 0;
                                    const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;

                                    return (
                                        <div
                                            key={`day-${dateString}`}
                                            // [5] เรียกใช้ handleDayClick แบบใหม่
                                            onClick={() => handleDayClick(day.date)} 
                                            className={`aspect-square rounded-xl border-2 p-2 flex flex-col transition-all hover:shadow-lg hover:scale-105 overflow-hidden relative cursor-pointer ${ 
                                                isToday 
                                                    ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-300 shadow-lg' 
                                                    : hasSchedule
                                                    ? 'bg-white border-blue-200 hover:border-blue-400'
                                                    : 'bg-gray-50/50 border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-all ${
                                                    isToday ? 'bg-blue-600 text-white shadow-lg scale-110' : isWeekend ? 'text-red-500' : 'text-gray-700'
                                                }`}>
                                                    {day.date.getDate()}
                                                </span>
                                                {hasSchedule && !isToday && <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>}
                                            </div>

                                            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pointer-events-none">
                                                {daySchedule && daySchedule.length > 0 ? (
                                                    daySchedule.map((slot, i) => (
                                                        <div 
                                                            key={i} 
                                                            className={`text-[10px] p-1.5 rounded-md truncate font-medium ${
                                                                slot.isExam ? 'bg-red-500 text-white' : 'bg-blue-100 text-blue-800'
                                                            }`}
                                                            style={!slot.isExam ? { backgroundColor: `${slot.color}20`, color: '#1e3a8a' } : {}}
                                                        >
                                                            {slot.subject}
                                                        </div>
                                                    ))
                                                ) : null}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        
                         <div className="mt-6 pt-6 border-t border-gray-200">
                            <div className="flex flex-wrap gap-4 justify-center text-sm">
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-blue-500"></div><span className="text-gray-600">วันที่มีตารางอ่าน</span></div>
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-gradient-to-r from-red-500 to-pink-500"></div><span className="text-gray-600">วันสอบ</span></div>
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-blue-600 ring-2 ring-blue-300"></div><span className="text-gray-600">วันนี้</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* [6] ลบ <DayDetailModal /> ทิ้งไปแล้ว */}

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>
        </div>
    );
}