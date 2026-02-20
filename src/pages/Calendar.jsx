import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Sidebar from "../components/Sidebar";
import { useNavigate } from 'react-router-dom';
import { 
    ChevronLeftIcon, 
    ChevronRightIcon, 
    CalendarDaysIcon,
    CheckCircleIcon,
    ClockIcon,
    BookOpenIcon
} from '@heroicons/react/24/outline';


const formatDateKey = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getCalendarDays = (currentDate) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const days = [];
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDayIndex = firstDayOfMonth.getDay(); 
    for (let i = 0; i < startDayIndex; i++) {
        days.push({ date: null, isCurrentMonth: false });
    }

    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
        days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    return days;
};

export default function Calendar() {
    const [currentDate, setCurrentDate] = useState(new Date()); 
    const navigate = useNavigate();

    const [planList, setPlanList] = useState([]); 
    const [selectedPlanId, setSelectedPlanId] = useState(localStorage.getItem("selectedPlanId") || ""); 
    const [planDetails, setPlanDetails] = useState(null); 
    const [isLoadingList, setIsLoadingList] = useState(true);


    useEffect(() => {
        const fetchPlanList = async () => {
            setIsLoadingList(true);
            try {
                const response = await axios.get("http://localhost:5000/calender/api/exam-plans/", { withCredentials: true });
                if (Array.isArray(response.data) && response.data.length > 0) {
                    setPlanList(response.data);

          
                    setSelectedPlanId(prevId => {
                      
                        if (!prevId) return response.data[0]._id;
                      
                        return prevId;
                    });
                 

                } else {
                    setPlanList([]);
                  
                }
            } catch (err) {
                console.error(err);
               
            } finally {
                setIsLoadingList(false);
            }
        };
        fetchPlanList();
    }, []); 

    useEffect(() => {
        if (!selectedPlanId) return;
        const fetchPlanDetails = async () => {
            try {
                const response = await axios.get(`http://localhost:5000/calender/api/exam-plan/${selectedPlanId}`, { withCredentials: true });
                setPlanDetails(response.data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchPlanDetails();
    }, [selectedPlanId]);

    // Data Processing
    const scheduleMap = useMemo(() => {
        const map = new Map();
        if (!planDetails) return map;
        const sessions = planDetails.study_plan || planDetails.generated_schedule || [];
        
        sessions.forEach(slot => {
            if (!slot.date) return;
            const dateKey = formatDateKey(slot.date);
            const existing = map.get(dateKey) || [];
            map.set(dateKey, [...existing, { ...slot, type: 'study' }]);
        });

        if (planDetails.exam_date) {
            const examDateKey = formatDateKey(planDetails.exam_date);
            const examSlot = { subject: planDetails.exam_title || 'Exam Day', type: 'exam', status: 'urgent' };
            const existing = map.get(examDateKey) || [];
            map.set(examDateKey, [examSlot, ...existing]); 
        }
        return map;
    }, [planDetails]);

    const calendarGrid = useMemo(() => getCalendarDays(currentDate), [currentDate]);

    const stats = useMemo(() => {
        if (!planDetails) return { total: 0, completed: 0, pending: 0, progress: 0 };
        const sessions = planDetails.study_plan || [];
        const realSessions = sessions.filter(s => s.status !== 'rescheduled');
        const total = realSessions.length;
        const completed = realSessions.filter(s => s.status === 'completed').length;
        const pending = realSessions.filter(s => s.status === 'pending').length;
        const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
        return { total, completed, pending, progress };
    }, [planDetails]);

    const changeMonth = (offset) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
    };

    return (
        <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
            <Sidebar />
            
            <div className="flex-1 flex flex-col h-full overflow-y-auto custom-page-scrollbar">
                <div className="max-w-[1600px] w-full mx-auto p-6 lg:p-10 space-y-8">
                    
                    {/* Header */}
                    <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div>
                            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                                <CalendarDaysIcon className="w-10 h-10 text-indigo-600" />
                                ตารางอ่านหนังสือ
                            </h1>
                            <p className="text-lg text-slate-500 mt-2 font-medium">
                                จัดการเวลาของคุณให้คุ้มค่าที่สุด 🚀
                            </p>
                        </div>

                        <div className="relative w-full md:w-80">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">เลือกแผนการสอบ</label>
                            <div className="relative">
                                <select
                                    value={selectedPlanId}
                                    onChange={(e) => setSelectedPlanId(e.target.value)}
                                    disabled={isLoadingList}
                                    className="w-full appearance-none bg-white border border-slate-200 text-slate-800 text-lg py-3 pl-5 pr-12 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold transition-all hover:border-indigo-300 cursor-pointer"
                                >
                                    {isLoadingList ? <option>กำลังโหลด...</option> : 
                                     planList.map(plan => <option key={plan._id} value={plan._id}>{plan.exam_title}</option>)}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                                    <svg className="h-5 w-5 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                                </div>
                            </div>
                        </div>
                    </header>

                   
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        <StatCard 
                            title="หัวข้อทั้งหมด" value={stats.total} 
                            icon={<BookOpenIcon className="w-8 h-8 text-white"/>} 
                            gradient="bg-gradient-to-br from-indigo-500 to-indigo-600"
                        />
                        <StatCard 
                            title="อ่านจบแล้ว" value={stats.completed} 
                            icon={<CheckCircleIcon className="w-8 h-8 text-white"/>} 
                            gradient="bg-gradient-to-br from-emerald-400 to-emerald-600"
                        />
                        <StatCard 
                            title="รออ่าน" value={stats.pending} 
                            icon={<ClockIcon className="w-8 h-8 text-white"/>} 
                            gradient="bg-gradient-to-br from-amber-400 to-orange-500"
                        />
                        
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-lg flex flex-col justify-center gap-2">
                            <div className="flex justify-between items-end">
                                <span className="text-base font-semibold text-slate-500">ความคืบหน้า</span>
                                <span className="text-3xl font-black text-slate-800">{stats.progress}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden mt-1">
                                <div 
                                    className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                                    style={{ width: `${stats.progress}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

               
                    <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
                    
                        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
                            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
                                {currentDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                            </h2>
                            <div className="flex gap-3">
                                <button onClick={() => changeMonth(-1)} className="p-3 hover:bg-slate-100 rounded-xl text-slate-600 transition-all border border-slate-200 hover:border-slate-300">
                                    <ChevronLeftIcon className="w-6 h-6" />
                                </button>
                                <button onClick={() => changeMonth(1)} className="p-3 hover:bg-slate-100 rounded-xl text-slate-600 transition-all border border-slate-200 hover:border-slate-300">
                                    <ChevronRightIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                      
                        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/80">
                            {['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'].map((d, i) => (
                                <div key={d} className={`py-4 text-center text-base font-bold tracking-wide ${i===0 || i===6 ? 'text-rose-500' : 'text-slate-500'}`}>
                                    {d}
                                </div>
                            ))}
                        </div>

                   
                        <div className="grid grid-cols-7 bg-slate-200 gap-px">
                            {calendarGrid.map((item, index) => {
                                if (!item.isCurrentMonth) return <div key={`empty-${index}`} className="bg-gray-50/50 min-h-[140px]" />;

                                const dateStr = formatDateKey(item.date);
                                const dayEvents = scheduleMap.get(dateStr) || [];
                                const isToday = dateStr === formatDateKey(new Date());
                                const isWeekend = item.date.getDay() === 0 || item.date.getDay() === 6;

                                return (
                                    <div 
                                        key={dateStr}
                                        onClick={() => item.date && navigate(`/schedule/day/${formatDateKey(item.date)}`)}
                                        className={`
                                            bg-white min-h-[140px] p-3 flex flex-col gap-2 transition-all cursor-pointer group
                                            hover:bg-indigo-50/30 hover:shadow-inner relative
                                        `}
                                    >
                                        <div className="flex justify-between items-start">
                                            <span className={`
                                                w-9 h-9 flex items-center justify-center rounded-xl text-lg font-bold transition-all
                                                ${isToday 
                                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110' 
                                                    : isWeekend ? 'text-rose-500 group-hover:bg-rose-50' : 'text-slate-700 group-hover:bg-slate-100'}
                                            `}>
                                                {item.date.getDate()}
                                            </span>
                                            {dayEvents.length > 0 && (
                                                <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                                                    {dayEvents.length}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar max-h-[100px] pr-1">
                                            {dayEvents.map((evt, i) => {
                                                const baseStyle = "px-3 py-1.5 rounded-lg text-sm font-medium truncate shadow-sm border-l-4 transition-transform hover:scale-[1.02]";
                                                let variantStyle = "bg-indigo-50 text-indigo-700 border-indigo-500";
                                                
                                                if (evt.type === 'exam') variantStyle = "bg-rose-50 text-rose-700 border-rose-500 font-bold ring-1 ring-rose-100";
                                                else if (evt.status === 'rescheduled') variantStyle = "bg-gray-100 text-gray-400 border-gray-400 line-through decoration-gray-400";
                                                else if (evt.status === 'completed') variantStyle = "bg-emerald-50 text-emerald-700 border-emerald-500 opacity-75";

                                                return (
                                                    <div key={i} className={`${baseStyle} ${variantStyle}`} title={evt.subject}>
                                                        {evt.type === 'exam' && '🎯 '}{evt.subject}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                .custom-page-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-page-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
                .custom-page-scrollbar::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 4px; }
            `}</style>
        </div>
    );
}


function StatCard({ title, value, icon, gradient }) {
    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-lg flex items-center justify-between relative overflow-hidden group">
           
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 blur-xl ${gradient}`}></div>
            
            <div className="relative z-10">
                <p className="text-base font-semibold text-slate-500 mb-1">{title}</p>
                <h3 className="text-4xl font-extrabold text-slate-800 tracking-tight group-hover:scale-105 transition-transform origin-left">
                    {value}
                </h3>
            </div>
            
            <div className={`${gradient} p-4 rounded-2xl shadow-lg transform group-hover:rotate-12 transition-transform duration-300`}>
                {icon}
            </div>
        </div>
    );
}