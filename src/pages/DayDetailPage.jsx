import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from "../components/Sidebar";
import { 
    BookOpenIcon, 
    CheckCircleIcon, 
    PlusIcon, 
    TrashIcon,
    ArrowLeftIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/solid';

export default function DayDetailPage() {
    const { date } = useParams(); 
    const navigate = useNavigate();

    // State
    const [studyTasks, setStudyTasks] = useState([]);
    const [personalTasks, setPersonalTasks] = useState([]);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isRescheduling, setIsRescheduling] = useState(false);

    const selectedPlanId = localStorage.getItem("selectedPlanId");

    const displayDate = (() => {
        try {
            const [year, month, day] = date.split('-');
            return new Date(year, month - 1, day).toLocaleDateString('th-TH', {
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric'
            });
        } catch {
            return date;
        }
    })();

    const fetchData = useCallback(async () => {
        if (!date) return;
        
        setIsLoading(true);
        try {
            const [planRes, taskRes] = await Promise.all([
                axios.get("http://localhost:5000/calender/api/schedule", { withCredentials: true }),
                axios.get(`http://localhost:5000/calender/api/custom-tasks?date=${date}`, { withCredentials: true })
            ]);
            
            // Filter for today's tasks
            const todaysStudy = planRes.data.filter(item => {
                if (!item.date) return false;
                const itemDate = String(item.date).split('T')[0];
                return itemDate === date;
            });
            setStudyTasks(todaysStudy);
            setPersonalTasks(taskRes.data || []);

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [date]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Add Personal Task
    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;
        
        try {
            const res = await axios.post("http://localhost:5000/calender/api/custom-tasks", {
                title: newTaskTitle, 
                date: date
            }, { withCredentials: true });
            
            setPersonalTasks(prev => [...prev, res.data]);
            setNewTaskTitle("");
        } catch (error) { 
            console.error(error);
            alert("ไม่สามารถเพิ่มงานได้");
        }
    };

    // Toggle Task
    const toggleTask = async (task) => {
        const newStatus = !task.isCompleted;
        setPersonalTasks(prev => prev.map(t => 
            t._id === task._id ? { ...t, isCompleted: newStatus } : t
        ));
        
        try {
            await axios.put(
                `http://localhost:5000/calender/api/custom-tasks/${task._id}`, 
                { isCompleted: newStatus }, 
                { withCredentials: true }
            );
        } catch (error) { 
            console.error(error);
            setPersonalTasks(prev => prev.map(t => 
                t._id === task._id ? { ...t, isCompleted: !newStatus } : t
            ));
        }
    };

    // Delete Task
    const deleteTask = async (taskId) => {
        if (!window.confirm("ลบรายการนี้?")) return;
        const originalTasks = [...personalTasks];
        setPersonalTasks(prev => prev.filter(t => t._id !== taskId));
        
        try {
            await axios.delete(
                `http://localhost:5000/calender/api/custom-tasks/${taskId}`, 
                { withCredentials: true }
            );
        } catch (error) { 
            console.error(error);
            setPersonalTasks(originalTasks);
        }
    };

    // Handle Reschedule
    const handleReschedule = async () => {
        if (!selectedPlanId) {
            alert("ไม่พบข้อมูลแผนการเรียน (กรุณากลับไปเลือกแผนที่หน้าแรกก่อน)");
            return;
        }
        
        if (!window.confirm(`ยืนยันการเลื่อนตารางของวันที่ ${displayDate} ออกไป?\n\n✅ วันนี้จะว่าง\n✅ ตารางจะถูกเลื่อนไปวันถัดไป`)) {
            return;
        }

        setIsRescheduling(true);
        try {
            await axios.post(
                `http://localhost:5000/calender/api/exam-plan/${selectedPlanId}/reschedule`,
                { date: date },
                { withCredentials: true }
            );
            alert(`✅ เลื่อนตารางสำเร็จ!`);
            fetchData(); // โหลดใหม่เพื่อให้เห็นสถานะ "เลื่อนแล้ว"
        } catch (error) {
            console.error("Reschedule Error:", error);
            alert("❌ เกิดข้อผิดพลาดในการจัดตารางใหม่");
        } finally {
            setIsRescheduling(false);
        }
    };

    return (
        <div className="flex bg-gray-50 min-h-screen font-sans">
            <Sidebar />
            <div className="flex-1 p-4 sm:p-8">
                <div className="max-w-5xl mx-auto">
                    
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 transition">
                                <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">รายละเอียดประจำวัน</h1>
                                <p className="text-blue-600 font-medium">{displayDate}</p>
                            </div>
                        </div>
                        
                        <button 
                            onClick={handleReschedule}
                            disabled={isRescheduling || studyTasks.length === 0}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white shadow-md transition-all ${
                                isRescheduling || studyTasks.length === 0
                                    ? 'bg-gray-400 cursor-not-allowed' 
                                    : 'bg-orange-500 hover:bg-orange-600 hover:shadow-lg'
                            }`}
                        >
                            <ArrowPathIcon className={`w-5 h-5 ${isRescheduling ? 'animate-spin' : ''}`} />
                            {isRescheduling ? 'กำลังจัดตาราง...' : 'เลื่อนตาราง'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Study Schedule Column */}
                        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 h-fit">
                            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <BookOpenIcon className="w-5 h-5 text-blue-500" />
                                ตารางอ่านหนังสือ & สอบ
                            </h2>

                            {isLoading ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-400 mt-2">กำลังโหลด...</p>
                                </div>
                            ) : studyTasks.length > 0 ? (
                                <div className="space-y-3">
                                    {studyTasks.map((slot, idx) => {
                                        if (slot.status === 'rescheduled') {
                                            return (
                                                <div key={idx} className="p-4 rounded-xl border-l-4 border-gray-400 bg-gray-50 flex items-center gap-3">
                                                    <ExclamationTriangleIcon className="w-8 h-8 text-gray-400" />
                                                    <div>
                                                        <h3 className="font-bold text-gray-600 text-lg">เลื่อนตารางแล้ว</h3>
                                                        <p className="text-sm text-gray-500">ตารางวันนี้ถูกเลื่อนไปวันถัดไป</p>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return (
                                            <div key={idx} className={`p-4 rounded-xl border-l-4 transition hover:shadow-md ${slot.isExam ? 'bg-red-50 border-red-500' : 'bg-blue-50 border-blue-500'}`}>
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <h3 className="font-bold text-gray-800 text-lg">{slot.subject || 'ไม่ระบุวิชา'}</h3>
                                                        <p className="text-sm text-gray-500 mt-1">⏰ {slot.startTime} - {slot.endTime}</p>
                                                    </div>
                                                    {slot.status === 'completed' && <CheckCircleIcon className="w-6 h-6 text-green-500 flex-shrink-0" />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border-dashed border-2 border-gray-200">
                                    <p className="font-medium">วันนี้ไม่มีตารางอ่านหนังสือ</p>
                                </div>
                            )}
                        </div>

                        {/* Personal Tasks Column (เหมือนเดิม) */}
                        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 h-fit">
                            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <CheckCircleIcon className="w-5 h-5 text-green-500" />
                                สิ่งที่ต้องทำ (ส่วนตัว)
                            </h2>
                            <form onSubmit={handleAddTask} className="flex gap-2 mb-4">
                                <input type="text" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="เพิ่มงานใหม่..." className="flex-1 px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-green-500" />
                                <button type="submit" className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg"><PlusIcon className="w-6 h-6" /></button>
                            </form>
                            <div className="space-y-2">
                                {personalTasks.map((task) => (
                                    <div key={task._id} className="flex items-center justify-between p-3 rounded-lg border bg-white">
                                        <div className="flex items-center gap-3 overflow-hidden flex-1">
                                            <button onClick={() => toggleTask(task)} className={`w-5 h-5 rounded border flex items-center justify-center ${task.isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}>
                                                {task.isCompleted && <CheckCircleIcon className="w-4 h-4" />}
                                            </button>
                                            <span className={`truncate ${task.isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{task.title}</span>
                                        </div>
                                        <button onClick={() => deleteTask(task._id)} className="text-gray-300 hover:text-red-500"><TrashIcon className="w-5 h-5" /></button>
                                    </div>
                                ))}
                                {personalTasks.length === 0 && <p className="text-center text-gray-400 text-sm py-4">ยังไม่มีรายการ</p>}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}