import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import { useNavigate } from 'react-router-dom';

export default function CoursePlannerEdit() {
    const navigate = useNavigate();
    const [subjects, setSubjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

  
    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                // เรียก API ดึงรายวิชา
                const res = await axios.get(
                    "http://localhost:5000/subject/",
                    { withCredentials: true }
                );

                const rawData = Array.isArray(res.data) ? res.data : []; 

                // Map ข้อมูลจาก Database มาเป็น State ของ React
                const fetchedSubjects = rawData.map(item => ({
                    _id: item._id, 
                    title: item.title || '',
                    subject_code: item.subject_code || item.subject || '', 
                    credits: item.credits?.toString() || '0',
                    priority: item.priority || 2,
                    difficulty: item.difficulty || 3,
                    color: item.color || '#3B82F6',
                    exam_date: item.exam_date || '',
                   
                    rawTopics: item.topics 
                        ? item.topics.map(t => (typeof t === 'string' ? t : t.name)).join(', ')
                        : '',
                    isDeleted: false,
                }));

                setSubjects(fetchedSubjects);
                setIsLoading(false);
            } catch (err) {
                console.error("Error fetching subjects:", err);
                if (err.response && err.response.status === 401) {
                     setError("กรุณา Login ก่อนจึงจะสามารถแก้ไขรายวิชาได้");
                } else {
                    setError("ไม่สามารถโหลดรายวิชาได้ กรุณาลองอีกครั้ง");
                }
                setIsLoading(false);
            }
        };

        fetchSubjects();
    }, []);


    const handleSubjectChange = (index, e) => {
        const { name, value } = e.target;
        const list = [...subjects];
        list[index][name] = value;
        setSubjects(list);
    };

    const handleMarkForDeletion = (index) => {
        const list = [...subjects];
        list[index].isDeleted = !list[index].isDeleted;
        setSubjects(list);
    };

    const handleGoToAdd = () => navigate('/course-planner/add');
    const handleBackToDashboard = () => navigate('/');

    const handleSubmit = async (e) => {
        e.preventDefault();

        const subjectsToUpdate = subjects.filter(sub => !sub.isDeleted && sub._id);
        const subjectsToDelete = subjects.filter(sub => sub.isDeleted && sub._id);

        for (const subject of subjectsToUpdate) {
            if (!subject.title.trim() || !subject.subject_code.trim()) {
                alert(`กรุณากรอก "ชื่อวิชา" และ "รหัสวิชา" ให้ครบถ้วน (วิชาลำดับที่ ${subjects.indexOf(subject) + 1})`);
                return;
            }
            if (isNaN(subject.credits) || Number(subject.credits) < 0) {
                alert(`หน่วยกิตของวิชา "${subject.title}" ต้องเป็นตัวเลขบวก`);
                return;
            }
        }

      
        const updatePromises = subjectsToUpdate.map(subject => {
    
            const topicsArray = subject.rawTopics
                ? subject.rawTopics.split(',').map(t => t.trim()).filter(t => t !== '')
                : [];

            const payload = {
                title: subject.title,
                subject_code: subject.subject_code,
                credits: parseInt(subject.credits, 10),
                priority: parseInt(subject.priority, 10),
                difficulty: parseInt(subject.difficulty, 10),
                color: subject.color,
                exam_date: subject.exam_date || null,
                topics: topicsArray
            };
            return axios.put(`http://localhost:5000/subject/${subject._id}`, payload, { withCredentials: true });
        });

   
        const deletePromises = subjectsToDelete.map(subject => 
            axios.delete(`http://localhost:5000/subject/${subject._id}`, { withCredentials: true })
        );

        try {
            await Promise.all([...updatePromises, ...deletePromises]);
            alert("บันทึกการแก้ไขสำเร็จ!");
            window.location.reload();
        } catch (err) {
            console.error("Submission Error:", err);
            if (err.response && err.response.status === 401) {
                alert("กรุณา login ก่อน");
            } else {
                alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
            }
        }
    };

 
    if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-gray-50 text-blue-600">กำลังโหลดข้อมูล...</div>;
    
    if (error) return (
        <div className="flex min-h-screen bg-gray-50 font-sans">
            <Sidebar />
            <div className="flex-1 p-8 flex items-center justify-center">
                <div className="text-center p-8 bg-white rounded-xl shadow border border-red-100">
                    <p className="text-lg text-red-600 mb-4">{error}</p>
                    <button onClick={handleBackToDashboard} className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">กลับหน้าหลัก</button>
                </div>
            </div>
        </div>
    );

    if (subjects.length === 0) return (
        <div className="flex min-h-screen bg-gray-50 font-sans">
            <Sidebar />
            <div className="flex-1 p-8">
                <h1 className="text-3xl font-bold mb-6 text-gray-800">แก้ไขรายวิชา</h1>
                <div className="bg-white rounded-2xl shadow p-10 text-center border border-gray-200">
                    <p className="text-gray-500 mb-6">ยังไม่มีรายวิชาในระบบ</p>
                    <button onClick={handleGoToAdd} className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md">เพิ่มรายวิชาใหม่ ➕</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex min-h-screen bg-gray-50 font-sans">
            <Sidebar />

            <div className="flex-1 p-4 sm:p-8">
                <div className="max-w-6xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold text-gray-800">แก้ไขรายวิชา 📝</h1>
                        <button onClick={handleGoToAdd} className="text-blue-600 hover:text-blue-800 font-semibold text-sm">
                            + เพิ่มวิชาใหม่
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {subjects.map((subject, index) => (
                            <div 
                                key={subject._id || index} 
                                className={`
                                    bg-white border rounded-xl p-6 relative transition-all shadow-sm
                                    ${subject.isDeleted ? 'border-red-300 bg-red-50/50 opacity-60' : 'border-gray-200 hover:border-blue-300'}
                                `}
                            >
                              
                                <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-gray-100 text-gray-600 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                                            {index + 1}
                                        </span>
                                        <div 
                                            className="w-4 h-4 rounded-full border border-gray-200"
                                            style={{ backgroundColor: subject.color }}
                                        ></div>
                                        <span className="font-semibold text-gray-700">
                                            {subject.title || 'Untitled Course'}
                                        </span>
                                    </div>
                                    
                                    <button
                                        type="button"
                                        onClick={() => handleMarkForDeletion(index)}
                                        className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                                            subject.isDeleted 
                                                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                                : 'bg-red-100 text-red-600 hover:bg-red-200'
                                        }`}
                                    >
                                        {subject.isDeleted ? "⟲ ยกเลิกการลบ" : "🗑 ลบวิชานี้"}
                                    </button>
                                </div>

                                <fieldset disabled={subject.isDeleted} className="grid grid-cols-1 md:grid-cols-12 gap-6">
                               
                                    <div className="md:col-span-5">
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">ชื่อวิชา</label>
                                        <input
                                            type="text"
                                            name="title"
                                            value={subject.title}
                                            onChange={e => handleSubjectChange(index, e)}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                        />
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">รหัสวิชา</label>
                                        <input
                                            type="text"
                                            name="subject_code"
                                            value={subject.subject_code}
                                            onChange={e => handleSubjectChange(index, e)}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm uppercase"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">สี</label>
                                        <input
                                            type="color"
                                            name="color"
                                            value={subject.color}
                                            onChange={e => handleSubjectChange(index, e)}
                                            className="w-full h-[38px] p-0 border border-gray-300 rounded-lg cursor-pointer"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">หน่วยกิต</label>
                                        <input
                                            type="number"
                                            name="credits"
                                            value={subject.credits}
                                            onChange={e => handleSubjectChange(index, e)}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                        />
                                    </div>

                         
                                    <div className="md:col-span-4">
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Priority (ความสำคัญ)</label>
                                        <select
                                            name="priority"
                                            value={subject.priority}
                                            onChange={e => handleSubjectChange(index, e)}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                                        >
                                            <option value="1">1 - น้อย</option>
                                            <option value="2">2 - ปานกลาง</option>
                                            <option value="3">3 - มาก</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-4">
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Difficulty (ความยาก)</label>
                                        <select
                                            name="difficulty"
                                            value={subject.difficulty}
                                            onChange={e => handleSubjectChange(index, e)}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                                        >
                                            <option value="1">1 - ง่ายมาก</option>
                                            <option value="2">2 - ง่าย</option>
                                            <option value="3">3 - ปานกลาง</option>
                                            <option value="4">4 - ยาก</option>
                                            <option value="5">5 - ยากมาก</option>
                                        </select>
                                    </div>

                           
                                    <div className="md:col-span-12">
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">หัวข้อย่อย (คั่นด้วยจุลภาค)</label>
                                        <textarea
                                            name="rawTopics"
                                            value={subject.rawTopics}
                                            onChange={e => handleSubjectChange(index, e)}
                                            rows="2"
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                                            placeholder="เช่น บทที่ 1, บทที่ 2, Quiz"
                                        ></textarea>
                                    </div>
                                </fieldset>
                            </div>
                        ))}

             
                        <div className="sticky bottom-4 z-10 flex justify-end gap-4 bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-gray-200 shadow-lg">
                            <button
                                type="button"
                                onClick={handleBackToDashboard}
                                className="px-6 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition"
                            >
                                ยกเลิก / กลับ
                            </button>
                            <button
                                type="submit"
                                className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:shadow-lg hover:scale-105 transition transform active:scale-95"
                            >
                                บันทึกการเปลี่ยนแปลง ✅
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}