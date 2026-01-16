import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from "../components/Sidebar";
import { useNavigate } from 'react-router-dom';

export default function CoursePlannerAddNew() {
    const navigate = useNavigate();

    // State สำหรับฟอร์ม (ปรับให้ตรงกับ Backend ใหม่)
    const [subjects, setSubjects] = useState([
        { 
            title: '', 
            subject_code: '', 
            credits: '', 
            priority: 2,       // 1=Low, 2=Medium, 3=High
            difficulty: 3,     // 1-5
            exam_date: '',     // YYYY-MM-DD
            color: '#3B82F6',  // Default Blue
            rawTopics: ''      // รับค่าเป็น String (เช่น "บทที่ 1, บทที่ 2") แล้วค่อยแปลงเป็น Array
        },
    ]);

    const [existingSubjects, setExistingSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- Fetching Logic (GET) ---
    const fetchExistingSubjects = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(
                "http://localhost:5000/subject/",
                { withCredentials: true }
            );
            setExistingSubjects(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Error fetching subjects:", err);
            if (err.response && err.response.status === 401) {
                setError("กรุณา Login ก่อนใช้งาน");
            } else {
                setError("เกิดข้อผิดพลาดในการดึงข้อมูล");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExistingSubjects();
    }, []);

    // --- Handlers ---
    const handleSubjectChange = (index, e) => {
        const { name, value } = e.target;
        const list = [...subjects];
        list[index][name] = value;
        setSubjects(list);
    };

    const handleAddSubject = () => {
        setSubjects([...subjects, { 
            title: '', subject_code: '', credits: '', 
            priority: 2, difficulty: 3, exam_date: '', 
            color: '#10B981', rawTopics: '' 
        }]);
    };

    const handleRemoveSubject = (index) => {
        if (subjects.length <= 1) return;
        const list = [...subjects];
        list.splice(index, 1);
        setSubjects(list);
    };

    const handleCancel = () => {
        setSubjects([{ 
            title: '', subject_code: '', credits: '', 
            priority: 2, difficulty: 3, exam_date: '', 
            color: '#3B82F6', rawTopics: '' 
        }]);
    };

    const handleGoToEdit = () => {
        navigate('/course-planner/edit');
    };

    // --- Submission Logic (POST) ---
    const handleSubmit = async (e) => {
        e.preventDefault();

        // 1. Client-side Validation
        for (const sub of subjects) {
            if (!sub.title.trim() || !sub.subject_code.trim()) {
                alert('กรุณากรอก "ชื่อวิชา" และ "รหัสวิชา" ให้ครบถ้วน');
                return;
            }
            if (!sub.credits || isNaN(sub.credits) || Number(sub.credits) < 0) {
                alert(`หน่วยกิตของวิชา "${sub.title}" ไม่ถูกต้อง`);
                return;
            }
        }

        // 2. Prepare Payload (Map State -> Backend Schema)
        const payload = subjects.map(sub => {
            // แปลง rawTopics (String) -> Topics Array
            // เช่น "Intro, Loop, Array" -> ["Intro", "Loop", "Array"]
            const topicsArray = sub.rawTopics
                ? sub.rawTopics.split(',').map(t => t.trim()).filter(t => t !== '')
                : [];

            return {
                title: sub.title,
                subject_code: sub.subject_code,
                credits: parseInt(sub.credits, 10),
                priority: parseInt(sub.priority, 10),
                difficulty: parseInt(sub.difficulty, 10),
                exam_date: sub.exam_date || null, // ส่ง null ถ้าไม่กรอก
                color: sub.color,
                topics: topicsArray
            };
        });

        // 3. Send API
        try {
            const res = await axios.post(
                "http://localhost:5000/subject/",
                payload,
                { withCredentials: true }
            );
            alert(res.data.message || "เพิ่มรายวิชาสำเร็จ!");
            handleCancel();
            fetchExistingSubjects();
        } catch (err) {
            console.error("Submission Error:", err);
            const errMsg = err.response?.data?.message || "เกิดข้อผิดพลาดในการบันทึก";
            const errDetail = err.response?.data?.errors ? `\n(${err.response.data.errors.join(', ')})` : '';
            alert(errMsg + errDetail);
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50 font-sans">
            <Sidebar />

            <div className="flex-1 p-4 sm:p-8">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-3xl font-bold mb-6 text-gray-800">จัดการรายวิชา</h1>

                    {/* --- Display Existing Subjects --- */}
                    <div className="mb-8 p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-gray-700 flex items-center gap-2">
                                📚 วิชาในคลังของคุณ
                                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-sm">
                                    {existingSubjects.length}
                                </span>
                            </h2>
                        </div>

                        {loading && <div className="text-center py-4 text-gray-500">กำลังโหลดข้อมูล...</div>}
                        {error && <div className="text-red-500 bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>}

                        {!loading && !error && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-80 overflow-y-auto p-1">
                                {existingSubjects.length > 0 ? (
                                    existingSubjects.map((subject, idx) => (
                                        <div key={idx} className="relative p-4 rounded-lg border border-gray-200 hover:shadow-md transition bg-white group">
                                            {/* Color Strip */}
                                            <div 
                                                className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-lg" 
                                                style={{ backgroundColor: subject.color || '#ddd' }}
                                            ></div>
                                            
                                            <div className="pl-3">
                                                <h3 className="font-bold text-gray-800 truncate">{subject.title}</h3>
                                                <div className="text-xs text-gray-500 mb-2 font-mono bg-gray-100 inline-block px-1.5 rounded">
                                                    {subject.subject_code}
                                                </div>
                                                <div className="flex justify-between text-sm text-gray-600 mt-2">
                                                    <span>⭐ Priority: {subject.priority}</span>
                                                    <span>📅 {subject.exam_date || '-'}</span>
                                                </div>
                                                {subject.topics && subject.topics.length > 0 && (
                                                    <div className="mt-2 text-xs text-gray-400">
                                                        {subject.topics.length} หัวข้อย่อย
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-400 col-span-3 text-center py-4">ยังไม่มีข้อมูลรายวิชา</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* --- Add New Subject Form --- */}
                    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 sm:p-10 space-y-8 border border-gray-100">
                        <div className="flex justify-between items-center border-b pb-4">
                            <h2 className="text-2xl font-bold text-gray-800">เพิ่มวิชาใหม่</h2>
                        </div>

                        {subjects.map((subject, index) => (
                            <div key={index} className="relative bg-gray-50/80 rounded-xl p-6 border border-gray-200 transition hover:border-blue-300">
                                {/* Number Badge */}
                                <span className="absolute -top-3 -left-3 bg-blue-600 text-white rounded-full h-8 w-8 flex items-center justify-center font-bold shadow-md z-10">
                                    {index + 1}
                                </span>

                                {/* Remove Button */}
                                {subjects.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveSubject(index)}
                                        className="absolute -top-3 -right-3 bg-white text-red-500 border border-red-200 rounded-full h-8 w-8 flex items-center justify-center hover:bg-red-50 hover:border-red-400 transition shadow-sm z-10"
                                    >
                                        ✕
                                    </button>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                    
                                    {/* Row 1: Basic Info */}
                                    <div className="md:col-span-6">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">ชื่อวิชา <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            name="title"
                                            value={subject.title}
                                            onChange={e => handleSubjectChange(index, e)}
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                            placeholder="เช่น Machine Learning"
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-4">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">รหัสวิชา <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            name="subject_code"
                                            value={subject.subject_code}
                                            onChange={e => handleSubjectChange(index, e)}
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition uppercase"
                                            placeholder="เช่น ITDS201"
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">สีประจำวิชา</label>
                                        <div className="flex items-center h-[42px] border border-gray-300 rounded-lg overflow-hidden cursor-pointer">
                                            <input
                                                type="color"
                                                name="color"
                                                value={subject.color}
                                                onChange={e => handleSubjectChange(index, e)}
                                                className="w-full h-full p-0 border-0 cursor-pointer"
                                            />
                                        </div>
                                    </div>

                                    {/* Row 2: Stats */}
                                    <div className="md:col-span-3">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">หน่วยกิต</label>
                                        <input
                                            type="number"
                                            name="credits"
                                            value={subject.credits}
                                            onChange={e => handleSubjectChange(index, e)}
                                            min="0"
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="3"
                                        />
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">ความสำคัญ (Priority)</label>
                                        <select
                                            name="priority"
                                            value={subject.priority}
                                            onChange={e => handleSubjectChange(index, e)}
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        >
                                            <option value="1">🟢 น้อย (1)</option>
                                            <option value="2">🟡 ปานกลาง (2)</option>
                                            <option value="3">🔴 มาก (3)</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">ความยาก (1-5)</label>
                                        <select
                                            name="difficulty"
                                            value={subject.difficulty}
                                            onChange={e => handleSubjectChange(index, e)}
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        >
                                            <option value="1">1 - ง่ายมาก</option>
                                            <option value="2">2 - ง่าย</option>
                                            <option value="3">3 - ปานกลาง</option>
                                            <option value="4">4 - ยาก</option>
                                            <option value="5">5 - ยากมาก</option>
                                        </select>
                                    </div>

                                    {/* Row 3: Topics */}
                                    <div className="md:col-span-12">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                                            หัวข้อย่อย / บทเรียน (ใช้ "," คั่นแต่ละหัวข้อ)
                                        </label>
                                        <textarea
                                            name="rawTopics"
                                            value={subject.rawTopics}
                                            onChange={e => handleSubjectChange(index, e)}
                                            rows="3"
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                            placeholder="เช่น บทนำ, ตัวแปร, Loop, Array, OOP (พิมพ์แยกด้วยเครื่องหมายจุลภาค)"
                                        ></textarea>
                                        <p className="text-xs text-gray-400 mt-1 text-right">
                                            * ระบบจะนำหัวข้อเหล่านี้ไปสร้าง Checkbox สำหรับติดตามความคืบหน้า
                                        </p>
                                    </div>

                                </div>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={handleAddSubject}
                            className="w-full py-3 rounded-xl border-2 border-dashed border-blue-300 text-blue-600 font-semibold hover:bg-blue-50 hover:border-blue-500 transition flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            เพิ่มวิชาอีก
                        </button>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 pt-6 justify-end border-t border-gray-100">
                             <button
                                type="button"
                                onClick={handleGoToEdit}
                                className="px-6 py-3 rounded-full bg-indigo-50 text-indigo-600 font-semibold hover:bg-indigo-100 transition"
                            >
                                ✏️ แก้ไข/ลบ รายวิชา
                            </button>
                            <div className="flex gap-4 ml-auto">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="px-6 py-3 rounded-full bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition"
                                >
                                    ล้างค่า
                                </button>
                                <button
                                    type="submit"
                                    className="px-8 py-3 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold hover:shadow-lg transform active:scale-95 transition"
                                >
                                    บันทึกข้อมูล ✅
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}