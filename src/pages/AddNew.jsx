import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Sidebar from "../components/Sidebar";

export default function ExamPlannerAddNew() {

    const [examTitle, setExamTitle] = useState('');
    const [examSubjects, setExamSubjects] = useState([]); 
    const [examDate, setExamDate] = useState('');


    const [subjects, setSubjects] = useState([]);
    const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
    const [subjectError, setSubjectError] = useState('');


    const [prepStartDate, setPrepStartDate] = useState('');
    const [prepEndDate, setPrepEndDate] = useState('');
    const [defaultStartTime, setDefaultStartTime] = useState('09:00');
    const [defaultEndTime, setDefaultEndTime] = useState('17:00');
    

    const [dailySchedule, setDailySchedule] = useState([]);


    const [sendNotifications, setSendNotifications] = useState(true);


    useEffect(() => {
        const fetchSubjects = async () => {
            setIsLoadingSubjects(true);
            setSubjectError('');
            
            try {
   
                const API_URL = "http://localhost:5000/api/subjects/"; 
                
                const response = await axios.get(API_URL, { 
                    withCredentials: true,
                    timeout: 5000
                });
                
                if (Array.isArray(response.data)) {
                    setSubjects(response.data);
                } else {
                    setSubjects([]);
                }
                
            } catch (error) {
                console.error("❌ Failed to fetch subjects:", error);
                if (error.response?.status === 401) {
                    setSubjectError("กรุณาเข้าสู่ระบบก่อนใช้งาน");
                } else {
                    setSubjectError("ไม่สามารถดึงข้อมูลรายวิชาได้");
                }
            } finally {
                setIsLoadingSubjects(false);
            }
        };

        fetchSubjects();
    }, []);


    useEffect(() => {
        if (prepStartDate && prepEndDate && new Date(prepStartDate) <= new Date(prepEndDate)) {
            const start = new Date(prepStartDate);
            const end = new Date(prepEndDate);
            const days = [];
            
            for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
                days.push({
                    date: new Date(dt).toISOString().split('T')[0], // Format: "YYYY-MM-DD"
                    isAvailable: true,
                    startTime: defaultStartTime,
                    endTime: defaultEndTime,
                });
            }
            setDailySchedule(days);
        } else {
            setDailySchedule([]);
        }
    }, [prepStartDate, prepEndDate, defaultStartTime, defaultEndTime]);


    const formattedDays = useMemo(() => {
        return dailySchedule.map(day => {
            const dateObj = new Date(day.date + 'T00:00:00');
            return {
                ...day,
                displayDate: dateObj.toLocaleDateString('th-TH', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                }),
            };
        });
    }, [dailySchedule]);


    const handleDayChange = (index, field, value) => {
        const updatedSchedule = [...dailySchedule];
        updatedSchedule[index] = { ...updatedSchedule[index], [field]: value };
        setDailySchedule(updatedSchedule);
    };
    

    const handleSubjectChange = (e) => {
        const { value, checked } = e.target;
    
        if (checked) {
            const selectedSubject = subjects.find(s => s.title === value);
            if (selectedSubject) {
                setExamSubjects(prev => [
                    ...prev,
                    {
                        name: selectedSubject.title,
                        priority: selectedSubject.priority ?? 1,
                        color: selectedSubject.color || '#3B82F6', 
                        subject_code: selectedSubject.subject_code 
                    },
                ]);
            }
        } else {
            setExamSubjects(prev => prev.filter(subject => subject.name !== value));
        }
    };


    const handleCancel = () => {
        setExamTitle('');
        setExamSubjects([]);
        setExamDate('');
        setPrepStartDate('');
        setPrepEndDate('');
        setDefaultStartTime('09:00');
        setDefaultEndTime('17:00');
        setDailySchedule([]);
        setSendNotifications(true);
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!examTitle || !examDate) {
            alert("กรุณากรอกข้อมูลการสอบให้ครบถ้วน");
            return;
        }

        if (examSubjects.length === 0) {
            alert("กรุณาเลือกวิชาที่ต้องการวางแผนอย่างน้อย 1 วิชา");
            return;
        }

        const studyPlan = dailySchedule
            .filter(day => day.isAvailable)
            .map(({ date, startTime, endTime }) => ({ date, startTime, endTime }));

        if (studyPlan.length === 0) {
            alert("กรุณาเลือกวันว่างสำหรับอ่านหนังสืออย่างน้อย 1 วัน");
            return;
        }

        const payload = {
            examTitle,
            examSubjects, 
            examDate,
            studyPlan,
            sendNotifications,

            prepStartDate,
            prepEndDate,
            defaultStartTime,
            defaultEndTime
        };

        try {
            const res = await axios.post(
                "http://localhost:5000/api/exam-plan/", 
                payload,
                { withCredentials: true }
            );
            
            alert(res.data.message || "บันทึกแผนการเตรียมสอบสำเร็จ!");
            handleCancel(); 
        } catch (err) {
            console.error("Submission error:", err);
            alert(err.response?.data?.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        }
    };

    return (
        <div className="flex bg-gray-50 min-h-screen font-sans">
            <Sidebar />

            <div className="flex-1 p-4 sm:p-8">
                <div className="max-w-5xl mx-auto">
                    <h1 className="text-3xl font-bold mb-6 text-gray-800">วางแผนเตรียมสอบ 📅</h1>

                    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 sm:p-10 space-y-10">
                        
                   
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 border-b pb-2 border-gray-100">
                                <span className="bg-blue-100 text-blue-600 w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm">1</span>
                                <h2 className="text-xl font-semibold text-gray-700">ข้อมูลการสอบ</h2>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">ชื่อการสอบ <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        placeholder="เช่น สอบปลายภาค 1/2567" 
                                        value={examTitle} 
                                        onChange={e => setExamTitle(e.target.value)} 
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">วันที่สอบ <span className="text-red-500">*</span></label>
                                    <input 
                                        type="date" 
                                        value={examDate} 
                                        onChange={e => setExamDate(e.target.value)} 
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-700" 
                                    />
                                </div>
                                
                    
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                                        เลือกวิชาที่สอบ (และระดับความสำคัญ) <span className="text-red-500">*</span>
                                    </label>
                                    
                                    {isLoadingSubjects ? (
                                        <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500">
                                            กำลังโหลดรายวิชา...
                                        </div>
                                    ) : subjectError ? (
                                        <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm text-center">
                                            {subjectError} <br/>
                                            <a href="/Subject" className="underline font-semibold mt-1 inline-block">ไปเพิ่มรายวิชา</a>
                                        </div>
                                    ) : subjects.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {subjects.map((subject) => (
                                                <label 
                                                    key={subject._id} 
                                                    className={`
                                                        flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                                                        ${examSubjects.some(s => s.name === subject.title) 
                                                            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                                                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}
                                                    `}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        value={subject.title}
                                                        checked={examSubjects.some(s => s.name === subject.title)}
                                                        onChange={handleSubjectChange}
                                                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <div 
                                                                className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                                                                style={{ backgroundColor: subject.color || '#ccc' }}
                                                            ></div>
                                                            <span className="font-semibold text-gray-800 truncate">{subject.title}</span>
                                                        </div>
                                                        <div className="text-xs text-gray-500 flex justify-between">
                                                            <span>{subject.subject_code || ''}</span>
                                                            <span>Priority: {subject.priority}</span>
                                                        </div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center p-6 bg-yellow-50 rounded-xl border border-yellow-200 text-yellow-700">
                                            ไม่พบรายวิชา <a href="/Subject" className="font-bold underline">คลิกที่นี่เพื่อเพิ่มวิชาใหม่</a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

              
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 border-b pb-2 border-gray-100">
                                <span className="bg-purple-100 text-purple-600 w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm">2</span>
                                <h2 className="text-xl font-semibold text-gray-700">ช่วงเวลาเตรียมตัว</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">เริ่มเตรียมตัวตั้งแต่วันที่</label>
                                    <input 
                                        type="date" 
                                        value={prepStartDate} 
                                        onChange={e => setPrepStartDate(e.target.value)} 
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none transition" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">ถึงวันที่</label>
                                    <input 
                                        type="date" 
                                        value={prepEndDate} 
                                        onChange={e => setPrepEndDate(e.target.value)} 
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none transition" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">เวลาอ่าน (เริ่ม)</label>
                                    <input 
                                        type="time" 
                                        value={defaultStartTime} 
                                        onChange={e => setDefaultStartTime(e.target.value)} 
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none transition" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">เวลาอ่าน (จบ)</label>
                                    <input 
                                        type="time" 
                                        value={defaultEndTime} 
                                        onChange={e => setDefaultEndTime(e.target.value)} 
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none transition" 
                                    />
                                </div>
                            </div>
                        </div>

            
                        {formattedDays.length > 0 && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b pb-2 border-gray-100">
                                    <span className="bg-green-100 text-green-600 w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm">3</span>
                                    <h2 className="text-xl font-semibold text-gray-700">ปรับแต่งตารางรายวัน (ถ้าจำเป็น)</h2>
                                </div>

                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {formattedDays.map((day, index) => (
                                        <div 
                                            key={day.date} 
                                            className={`p-4 rounded-xl border transition-all ${day.isAvailable ? 'bg-white border-green-200 shadow-sm' : 'bg-gray-50 border-gray-200 opacity-60'}`}
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={day.isAvailable} 
                                                        onChange={e => handleDayChange(index, 'isAvailable', e.target.checked)} 
                                                        className="w-5 h-5 text-green-600 rounded border-gray-300 focus:ring-green-500 cursor-pointer" 
                                                    />
                                                    <span className={`font-semibold ${day.isAvailable ? 'text-gray-800' : 'text-gray-500'}`}>{day.displayDate}</span>
                                                </div>
                                                
                                                {day.isAvailable && (
                                                    <div className="flex items-center gap-2">
                                                        <input 
                                                            type="time" 
                                                            value={day.startTime} 
                                                            onChange={e => handleDayChange(index, 'startTime', e.target.value)} 
                                                            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 focus:ring-1 focus:ring-green-500 outline-none" 
                                                        />
                                                        <span className="text-gray-400">-</span>
                                                        <input 
                                                            type="time" 
                                                            value={day.endTime} 
                                                            onChange={e => handleDayChange(index, 'endTime', e.target.value)} 
                                                            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 focus:ring-1 focus:ring-green-500 outline-none" 
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

         
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-4">
                            <input
                                id="sendNotifications"
                                type="checkbox"
                                checked={sendNotifications}
                                onChange={(e) => setSendNotifications(e.target.checked)}
                                className="mt-1 w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                            />
                            <div>
                                <label htmlFor="sendNotifications" className="font-semibold text-gray-800 cursor-pointer select-none">
                                    เปิดการแจ้งเตือน
                                </label>
                                <p className="text-sm text-gray-500 mt-0.5">ระบบจะส่งอีเมลแจ้งเตือนเมื่อถึงเวลาอ่านหนังสือ</p>
                            </div>
                        </div>

          
                        <div className="flex gap-4 pt-4 border-t border-gray-100">
                            <button 
                                type="button" 
                                onClick={handleCancel} 
                                className="flex-1 px-6 py-3.5 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition"
                            >
                                ยกเลิก
                            </button>
                            <button 
                                type="submit" 
                                className="flex-[2] px-6 py-3.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-lg shadow-blue-200 transition transform active:scale-95"
                            >
                                สร้างแผนการเรียน 🚀
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}