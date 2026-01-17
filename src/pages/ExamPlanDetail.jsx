import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Sidebar from "../components/Sidebar"; 
import { 
    ArrowLeftIcon, 
    CalendarDaysIcon, 
    CheckCircleIcon, 
    ListBulletIcon,
    XCircleIcon,
    ArrowUturnLeftIcon
} from '@heroicons/react/24/outline';

import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
ChartJS.register(ArcElement, Tooltip, Legend);

// --- 1. Helper Functions ---
const formatExamDateTime = (dateString) => {
    if (!dateString) return { date: "ไม่ระบุวันที่", time: "ไม่ระบุเวลา" };
    const date = new Date(dateString);
    const dateOptions = { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Bangkok' };
    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Bangkok' };
    return {
        date: date.toLocaleDateString('th-TH', dateOptions),
        time: date.toLocaleTimeString('th-TH', timeOptions).replace(' ', '')
    };
};

const formatChapterDate = (dateString) => {
    if (!dateString) return "ไม่ระบุวันที่";
    const date = new Date(dateString);
    const options = { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Bangkok' };
    return date.toLocaleDateString('th-TH', options);
};

const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
};

// --- 2. Calendar Component (แก้ไขสีให้ตรงกัน) ---
const CalendarView = ({ chapterDetails, examDate, completedChapters }) => {
    const getInitialDate = () => {
        if (chapterDetails && chapterDetails.length > 0 && chapterDetails[0].date) {
            return new Date(chapterDetails[0].date);
        }
        if (examDate) return new Date(examDate);
        return new Date();
    };
    const [displayDate, setDisplayDate] = useState(getInitialDate);
    
    const handlePrevMonth = () => { setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() - 1, 1)); };
    const handleNextMonth = () => { setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 1)); };
    
    const monthName = displayDate.toLocaleDateString('th-TH', { month: 'long', timeZone: 'Asia/Bangkok' });
    const year = displayDate.toLocaleDateString('th-TH', { year: 'numeric', timeZone: 'Asia/Bangkok' });
    const weekdays = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
    
    const getCalendarDays = () => {
        const yearNum = displayDate.getFullYear();
        const monthNum = displayDate.getMonth(); 
        const firstDayOfMonth = new Date(yearNum, monthNum, 1);
        const daysInMonth = new Date(yearNum, monthNum + 1, 0).getDate();
        const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; 
        const daysArray = [];
        for (let i = 0; i < startDayOfWeek; i++) { daysArray.push(null); }
        for (let i = 1; i <= daysInMonth; i++) { daysArray.push(new Date(yearNum, monthNum, i)); }
        return daysArray;
    };
    
    const days = getCalendarDays();
    const examDateObj = examDate ? new Date(examDate) : null;

    // --- LOGIC เช็คสี (ปรับเป็น Red-300) ---
    const getDayStatus = (date) => {
        if (!date) return 'bg-transparent'; 
        
        if (examDateObj && isSameDay(date, examDateObj)) { 
            return 'bg-yellow-300 text-yellow-900 font-semibold'; 
        }
        
        const chaptersOnThisDay = chapterDetails.filter(ch => ch.date && isSameDay(new Date(ch.date), date));
        
        if (chaptersOnThisDay.length > 0) {
            
            const hasPostponed = chaptersOnThisDay.some(ch => {
                const status = (ch.status || '').toLowerCase().trim();
                return status === 'postponed' || status === 'rescheduled' || status === 'เลื่อน';
            });

            if (hasPostponed) return 'bg-gray-300 text-gray-600 line-through'; 

            const allCompleted = chaptersOnThisDay.every(ch => {
                const status = (ch.status || '').toLowerCase().trim();
                return status === 'completed' || status === 'done';
            });
            
            // ใช้สีเขียวอ่อน (Green-300) เมื่อเสร็จ
            if (allCompleted) return 'bg-green-300 text-green-900 font-medium'; 

            // ใช้สีแดงอ่อน (Red-300) แทนสีชมพู เพื่อให้ตรงกับกราฟ
            return 'bg-red-300 text-red-900 font-medium'; 
        }
        
        return 'bg-gray-100 text-gray-600'; 
    };
    
    const completedCount = completedChapters;
    const pendingCount = chapterDetails.filter(ch => ch.status !== 'completed').length; 
    const totalCountForChart = completedCount + pendingCount;
    const completedPercent = totalCountForChart > 0 ? Math.round((completedCount / totalCountForChart) * 100) : 0;
    
    const chartData = {
        labels: ['อ่านแล้ว', 'ยังไม่อ่าน'],
        datasets: [{
            data: [completedCount, pendingCount], 
            // ปรับสี Chart ให้ตรงกับปฏิทิน (Green-300 และ Red-300)
            backgroundColor: ['#86efac', '#fca5a5'], 
            borderColor: ['#ffffff', '#ffffff'],
            borderWidth: 2,
        }],
    };
    
    const chartOptions = {
        responsive: true, maintainAspectRatio: false, cutout: '70%',
        plugins: {
            legend: { display: true, position: 'bottom', labels: { font: { family: 'Sarabun, sans-serif', size: 14 }, padding: 20 } },
            tooltip: { callbacks: { label: (context) => (context.label || '') + ': ' + (context.parsed || 0) + ' บท' } }
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-lg">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">ตารางการอ่าน</h3>
                <div className="flex justify-between items-center mb-4">
                    <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-100"><ArrowLeftIcon className="h-5 w-5 text-gray-600" /></button>
                    <span className="font-semibold">{monthName} {year}</span>
                    <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-100"><ArrowLeftIcon className="h-5 w-5 text-gray-600 transform rotate-180" /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center">
                    {weekdays.map(wd => (<div key={wd} className="text-xs font-medium text-gray-500 mb-2">{wd}</div>))}
                    {days.map((date, index) => (
                        <div key={index} className={`${getDayStatus(date)} h-10 w-10 flex items-center justify-center rounded-lg text-sm transition-colors duration-200`}>
                            {date ? date.getDate() : ''}
                        </div>
                    ))}
                </div>
                {/* Legend: แก้สีให้ตรงกับปฏิทิน */}
                <div className="flex justify-start gap-4 mt-6 flex-wrap">
                    <div className="flex items-center"><span className="h-4 w-4 bg-green-300 rounded mr-2"></span><span className="text-sm text-gray-600">อ่านแล้ว</span></div>
                    {/* เปลี่ยนสีตัวอย่างเป็น Red-300 */}
                    <div className="flex items-center"><span className="h-4 w-4 bg-red-300 rounded mr-2"></span><span className="text-sm text-gray-600">ยังไม่อ่าน</span></div>
                    <div className="flex items-center"><span className="h-4 w-4 bg-gray-300 rounded mr-2"></span><span className="text-sm text-gray-600 line-through">เลื่อนแล้ว</span></div>
                    <div className="flex items-center"><span className="h-4 w-4 bg-yellow-300 rounded mr-2"></span><span className="text-sm text-gray-600">วันสอบ</span></div>
                </div>
            </div>
            
            {/* Chart Section */}
            <div className="md:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-lg">
                    <h4 className="text-xl font-semibold text-gray-800 mb-4 text-center">ภาพรวมความคืบหน้า</h4>
                    <div style={{ position: 'relative', height: '250px' }}><Doughnut data={chartData} options={chartOptions} /></div>
                    <div className="text-center mt-6">
                        <p className="text-3xl font-bold text-blue-800">{completedPercent}%</p>
                        <p className="text-sm text-blue-700">สำเร็จ</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- 3. Checklist Component (เหมือนเดิม) ---
const ChecklistView = ({ 
    groupedChapters, 
    sortedDates, 
    onStatusChange, 
    onSave, 
    isSaving,
    onReschedule,
    isRescheduling
}) => {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h3 className="text-xl font-semibold text-gray-800 mb-6">ความคืบหน้า</h3>
            
            <div className="space-y-8">
                {sortedDates.length > 0 ? sortedDates.map((dateKey) => {
                    const chaptersForDay = groupedChapters[dateKey] || [];
                    
                    const allCompleted = chaptersForDay.every(ch => ch.status === 'completed');
                    const hasPostponed = chaptersForDay.some(ch => ch.status === 'postponed');
                    
                    return (
                        <div key={dateKey}>
                            <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-2">
                                <h4 className="text-lg font-bold text-gray-900">
                                    {formatChapterDate(dateKey)}
                                </h4>
                                
                                {allCompleted ? (
                                    <span className="flex items-center px-3 py-1 text-sm font-semibold text-green-600 bg-green-100 rounded-lg">
                                        <CheckCircleIcon className="h-4 w-4 mr-1.5" />
                                        อ่านจบแล้ว
                                    </span>
                                ) : hasPostponed ? (
                                    <span className="flex items-center px-3 py-1 text-sm font-semibold text-gray-500 bg-gray-100 rounded-lg border border-gray-200">
                                        <ArrowUturnLeftIcon className="h-4 w-4 mr-1.5" />
                                        เลื่อนแล้ว
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => onReschedule(dateKey)}
                                        disabled={isRescheduling || isSaving}
                                        className="flex items-center px-3 py-1 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg 
                                                   transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <XCircleIcon className="h-4 w-4 mr-1.5" />
                                        {isRescheduling ? 'กำลังเลื่อน...' : 'เลื่อนวันนี้'}
                                    </button>
                                )}
                            </div>
                            
                            <div className="space-y-4">
                                {chaptersForDay.map((chapter) => (
                                    <div key={chapter.slot_id} className="pl-2 group">
                                        <div className={`p-3 rounded-xl transition-all ${chapter.status === 'postponed' ? 'bg-gray-50' : 'hover:bg-gray-50'}`}>
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-2">
                                                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                                            {chapter.startTime} - {chapter.endTime}
                                                        </span>
                                                    </p>
                                                    <p className={`font-medium text-gray-800 ${chapter.status === 'postponed' ? 'text-gray-400 line-through' : ''}`}>
                                                        {chapter.subject}
                                                    </p>
                                                </div>

                                                <div className="ml-4 flex items-center h-full pt-1">
                                                    {chapter.status === 'postponed' ? (
                                                        <span className="text-xs text-gray-400 font-medium px-2 py-1 bg-gray-100 rounded-md">
                                                            เลื่อน
                                                        </span>
                                                    ) : (
                                                        <label className="relative inline-flex items-center cursor-pointer">
                                                            <input 
                                                                type="checkbox"
                                                                className="sr-only peer"
                                                                checked={chapter.status === 'completed'}
                                                                onChange={(e) => onStatusChange(chapter.slot_id, e.target.checked)}
                                                                disabled={isSaving || isRescheduling} 
                                                            />
                                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer 
                                                                          peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] 
                                                                          after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 
                                                                          after:transition-all peer-checked:bg-blue-600"></div>
                                                        </label>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                }) : (
                    <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <ListBulletIcon className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                        <p>ไม่พบรายละเอียดบทเรียน</p>
                    </div>
                )}
            </div>

            <div className="mt-8 text-right sticky bottom-0 bg-white/90 backdrop-blur-sm p-4 border-t border-gray-100 -mx-6 -mb-6 rounded-b-2xl">
                <button
                    onClick={onSave}
                    disabled={isSaving || isRescheduling}
                    className="px-8 py-2.5 bg-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-200 
                               hover:bg-blue-700 hover:shadow-blue-300 transform hover:-translate-y-0.5 transition-all 
                               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                    {isSaving ? 'กำลังบันทึก...' : (isRescheduling ? '...' : 'บันทึกความคืบหน้า')}
                </button>
            </div>
        </div>
    );
};

// --- 4. Main Component ---
export default function ExamPlanDetail() {
    const { id } = useParams();
    const [plan, setPlan] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('checklist'); 
    
    const [chapterDetails, setChapterDetails] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isRescheduling, setIsRescheduling] = useState(false);

    const fetchPlanDetail = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await axios.get(
                `http://localhost:5000/calender/api/exam-plan/${id}`, 
                { withCredentials: true }
            );
            setPlan(response.data);
            
            if (response.data.study_plan) {
                setChapterDetails(response.data.study_plan);
            }
        } catch (err) {
            console.error("❌ Failed to fetch exam plan detail:", err);
            setError("ไม่สามารถดึงข้อมูลแผนการสอบนี้ได้");
        } finally {
            setIsLoading(false);
        }
    }, [id]); 

    useEffect(() => {
        fetchPlanDetail();
    }, [fetchPlanDetail]); 

    const handleStatusChange = (slotId, isChecked) => {
        setChapterDetails(prevDetails => 
            prevDetails.map(ch => 
                ch.slot_id === slotId 
                    ? { ...ch, status: isChecked ? 'completed' : 'pending' } 
                    : ch
            )
        );
    };

    const handleSaveProgress = async () => {
        setIsSaving(true);
        try {
            await axios.put(
                `http://localhost:5000/calender/api/exam-plan/${id}/progress`,
                { chapters: chapterDetails }, 
                { withCredentials: true }
            );
        } catch (err) {
            console.error("❌ Failed to save progress:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRescheduleDay = async (dateToPostpone) => {
        if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการเลื่อนการอ่านของวันที่ ${formatChapterDate(dateToPostpone)}?\n\nงานที่ยังไม่เสร็จในวันนี้จะถูกเปลี่ยนสถานะเป็น "เลื่อนแล้ว"`)) {
            return;
        }
        
        setIsRescheduling(true);
        try {
            await axios.post(
                `http://localhost:5000/calender/api/exam-plan/${id}/reschedule`,
                { date: dateToPostpone }, 
                { withCredentials: true }
            );
            
            await fetchPlanDetail(); 
            
        } catch (err) {
            console.error("❌ Failed to reschedule:", err);
            alert(err.response?.data?.message || "เกิดข้อผิดพลาดในการเลื่อนวัน");
        } finally {
            setIsRescheduling(false);
        }
    };

    const completedChapters = chapterDetails.filter(ch => ch.status === 'completed').length;

    if (isLoading) {
        return ( <div className="flex bg-gray-50 min-h-screen"><Sidebar /><main className="flex-1 p-8 text-center text-blue-600">กำลังโหลดข้อมูล...</main></div> );
    }
    if (error) {
        return ( <div className="flex bg-gray-50 min-h-screen"><Sidebar /><main className="flex-1 p-8 text-center text-red-500">{error}</main></div> );
    }
    if (!plan) {
        return ( <div className="flex bg-gray-50 min-h-screen"><Sidebar /><main className="flex-1 p-8 text-center text-gray-500">ไม่พบข้อมูลแผนการสอบ</main></div> );
    }

    const { date: examDate, time: examTime } = formatExamDateTime(plan.exam_date);

    // Group chapters by Date
    const groupedChapters = chapterDetails.reduce((acc, chapter) => {
        const dateKey = chapter.date.split('T')[0]; 
        if (!acc[dateKey]) { acc[dateKey] = []; }
        acc[dateKey].push(chapter);
        return acc;
    }, {}); 
    const sortedDates = Object.keys(groupedChapters).sort((a, b) => new Date(a) - new Date(b));

    return (
        <div className="flex bg-gray-50 min-h-screen">
            <Sidebar />
            <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
                <div className="max-w-5xl mx-auto">
                    
                    {/* Header */}
                    <div className="mb-6">
                        <Link to="/subject" className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors">
                            <ArrowLeftIcon className="h-5 w-5 mr-2" />
                            กลับไปหน้ารวม
                        </Link>
                    </div>
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">{plan.exam_title}</h1>
                        <p className="text-lg text-gray-600">วันที่สอบ: {examDate} เวลา {examTime}</p>
                    </div>
                    
                    {/* Tabs */}
                    <div className="mb-6">
                        <div className="inline-flex rounded-lg shadow-sm bg-white p-1 border border-gray-100">
                            <button
                                onClick={() => setActiveTab('checklist')}
                                className={`px-6 py-2 rounded-md font-semibold text-sm transition-all ${activeTab === 'checklist' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-50'}`}
                            >
                                <ListBulletIcon className="h-5 w-5 inline mr-1.5" />
                                ความคืบหน้า
                            </button>
                            <button
                                onClick={() => setActiveTab('calendar')}
                                className={`px-6 py-2 rounded-md font-semibold text-sm transition-all ${activeTab === 'calendar' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-50'}`}
                            >
                                <CalendarDaysIcon className="h-5 w-5 inline mr-1.5" />
                                ตารางการอ่าน
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div>
                        {activeTab === 'checklist' && (
                            <ChecklistView 
                                groupedChapters={groupedChapters}
                                sortedDates={sortedDates}
                                onStatusChange={handleStatusChange}
                                onSave={handleSaveProgress}
                                isSaving={isSaving}
                                onReschedule={handleRescheduleDay}
                                isRescheduling={isRescheduling}
                            />
                        )}
                        {activeTab === 'calendar' && (
                            <CalendarView 
                                chapterDetails={chapterDetails} 
                                examDate={plan.exam_date}
                                completedChapters={completedChapters}
                            />
                        )}
                    </div>

                </div>
            </main>
        </div>
    );
}