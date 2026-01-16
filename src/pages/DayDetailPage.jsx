import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from "../components/Sidebar";
import { 
    ChevronLeftIcon, 
    BookOpenIcon, 
    CheckCircleIcon, 
    PlusIcon, 
    TrashIcon,
    ArrowLeftIcon
} from '@heroicons/react/24/solid';

export default function DayDetailPage() {
    const { date } = useParams(); // รับค่าวันที่จาก URL (yyyy-mm-dd)
    const navigate = useNavigate();

    // State
    const [studyTasks, setStudyTasks] = useState([]);
    const [personalTasks, setPersonalTasks] = useState([]);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    // Formatted Date (สำหรับแสดงผล)
    const displayDate = new Date(date).toLocaleDateString('th-TH', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    // 1. Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // A. ดึงตารางอ่านหนังสือทั้งหมด แล้ว Filter เอาเฉพาะวันนี้
                // (ในทางปฏิบัติควรมี API ดึงเฉพาะวัน แต่ใช้แบบนี้ไปก่อนเพื่อให้เข้ากับโค้ดเดิม)
                const planRes = await axios.get("http://localhost:5000/calender/api/schedule", { withCredentials: true });
                const todaysStudy = planRes.data.filter(item => item.date === date);
                setStudyTasks(todaysStudy);

                // B. ดึง Personal Tasks (API ใหม่)
                const taskRes = await axios.get(`http://localhost:5000/calender/api/custom-tasks?date=${date}`, { withCredentials: true });
                setPersonalTasks(taskRes.data);

            } catch (error) {
                console.error("Error fetching day details:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [date]);

    // 2. Add Personal Task
    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        try {
            const res = await axios.post("http://localhost:5000/calender/api/custom-tasks", {
                title: newTaskTitle,
                date: date
            }, { withCredentials: true });

            setPersonalTasks([...personalTasks, { 
                _id: res.data.id, 
                title: newTaskTitle, 
                isCompleted: false 
            }]);
            setNewTaskTitle("");
        } catch (error) {
            console.error("Error adding task:", error);
        }
    };

    // 3. Toggle Task Status
    const toggleTask = async (task) => {
        try {
            const newStatus = !task.isCompleted;
            // Update UI ทันทีเพื่อให้ลื่นไหล
            setPersonalTasks(prev => prev.map(t => t._id === task._id ? { ...t, isCompleted: newStatus } : t));
            
            // Call API
            await axios.put(`http://localhost:5000/calender/api/custom-tasks/${task._id}`, {
                isCompleted: newStatus
            }, { withCredentials: true });
        } catch (error) {
            console.error("Error updating task:", error);
        }
    };

    // 4. Delete Task
    const deleteTask = async (taskId) => {
        if (!window.confirm("ลบรายการนี้?")) return;
        try {
            setPersonalTasks(prev => prev.filter(t => t._id !== taskId));
            await axios.delete(`http://localhost:5000/calender/api/custom-tasks/${taskId}`, { withCredentials: true });
        } catch (error) {
            console.error("Error deleting task:", error);
        }
    };

    return (
        <div className="flex bg-gray-50 min-h-screen font-sans">
            <Sidebar />

            <div className="flex-1 p-4 sm:p-8">
                <div className="max-w-5xl mx-auto">
                    
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-6">
                        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100">
                            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">รายละเอียดประจำวัน</h1>
                            <p className="text-blue-600 font-medium">{displayDate}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* --- Column 1: ตารางอ่านหนังสือ (Fixed Schedule & Study) --- */}
                        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 h-fit">
                            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <BookOpenIcon className="w-5 h-5 text-blue-500" />
                                ตารางอ่านหนังสือ & สอบ
                            </h2>

                            {isLoading ? (
                                <p className="text-gray-400">กำลังโหลด...</p>
                            ) : studyTasks.length > 0 ? (
                                <div className="space-y-3">
                                    {studyTasks.map((slot, idx) => (
                                        <div key={idx} className={`p-4 rounded-xl border-l-4 ${slot.isExam ? 'bg-red-50 border-red-500' : 'bg-blue-50 border-blue-500'}`}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-bold text-gray-800">{slot.subject || 'ไม่ระบุวิชา'}</h3>
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        ⏰ {slot.startTime} - {slot.endTime}
                                                    </p>
                                                </div>
                                                {slot.status === 'completed' && <CheckCircleIcon className="w-6 h-6 text-green-500" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border-dashed border-2 border-gray-200">
                                    <p>วันนี้ไม่มีตารางอ่านหนังสือ</p>
                                    <p className="text-sm">พักผ่อนได้เต็มที่! 🎉</p>
                                </div>
                            )}
                        </div>

                        {/* --- Column 2: Personal To-Do List (Custom Tasks) --- */}
                        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 h-fit">
                            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <CheckCircleIcon className="w-5 h-5 text-green-500" />
                                สิ่งที่ต้องทำ (ส่วนตัว)
                            </h2>
                            <p className="text-xs text-gray-400 mb-4">รายการนี้จะไม่กระทบกับเวลาอ่านหนังสือ</p>

                            {/* Input Form */}
                            <form onSubmit={handleAddTask} className="flex gap-2 mb-6">
                                <input 
                                    type="text" 
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                    placeholder="เพิ่มงานใหม่... (เช่น ซื้อของ, ซักผ้า)"
                                    className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none"
                                />
                                <button type="submit" className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition-colors">
                                    <PlusIcon className="w-6 h-6" />
                                </button>
                            </form>

                            {/* Task List */}
                            <div className="space-y-2">
                                {personalTasks.map((task) => (
                                    <div 
                                        key={task._id} 
                                        className={`group flex items-center justify-between p-3 rounded-lg border transition-all ${
                                            task.isCompleted ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200 hover:border-green-300 shadow-sm'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <button 
                                                onClick={() => toggleTask(task)}
                                                className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                                    task.isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-green-500'
                                                }`}
                                            >
                                                {task.isCompleted && <CheckCircleIcon className="w-4 h-4" />}
                                            </button>
                                            <span className={`truncate ${task.isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                                {task.title}
                                            </span>
                                        </div>
                                        <button 
                                            onClick={() => deleteTask(task._id)}
                                            className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                                
                                {personalTasks.length === 0 && (
                                    <p className="text-center text-gray-400 text-sm py-4">ยังไม่มีรายการสิ่งที่ต้องทำ</p>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}