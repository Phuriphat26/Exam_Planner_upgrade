import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar"; // << 1. อย่าลืม import Sidebar ของคุณ

// --- Component ย่อยสำหรับ Card สรุปผล (ปรับปรุง UI) ---
function SummaryCard({ title, value, icon, className = "" }) {
  return (
    <div className={`bg-white shadow-lg rounded-2xl p-6 text-center ${className}`}>
      {/* สามารถเพิ่ม Icon ได้ถ้าต้องการ */}
      {icon && <div className="mb-2 text-3xl text-blue-500 flex justify-center">{icon}</div>}
      <p className="text-gray-600 text-lg mb-2">{title}</p>
      <p className="text-indigo-700 text-5xl font-extrabold">{value}</p>
    </div>
  );
}

// --- Component หลักของหน้า Home (ปรับปรุง UI) ---
export default function Home() {
  // State สำหรับเก็บข้อมูล
  const [plans, setPlans] = useState([]); // 1. เก็บ "รายชื่อ" แผนทั้งหมด
  const [selectedPlanId, setSelectedPlanId] = useState(null); // 2. เก็บ "ID" แผนที่เลือก
  const [summary, setSummary] = useState(null); // 3. เก็บ "ข้อมูลสรุป" ของแผนที่เลือก
  
  // State สำหรับจัดการการโหลด
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // --- ฟังก์ชันสำหรับแปลงนาที เป็น "HH:MM" ---
  const formatMinutesToHM = (minutes) => {
    if (minutes === null || isNaN(minutes) || minutes < 0) {
      return "00:00";
    }
    const totalMins = Math.round(minutes);
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    
    const paddedHours = String(hours).padStart(2, '0');
    const paddedMins = String(mins).padStart(2, '0');
    
    return `${paddedHours}:${paddedMins}`;
  };

  // --- Effect 1: ดึง "รายชื่อ" แผนทั้งหมด (แค่ครั้งเดียว) ---
  useEffect(() => {
    setLoadingPlans(true);
    fetch("http://127.0.0.1:5000/home_bp/plans") 
      .then((res) => res.json())
      .then((data) => {
        setPlans(data);
        if (data && data.length > 0) {
          // พยายามหาแผน active ถ้าไม่มี เลือกแผนแรก
          const activePlan = data.find(p => p.status === 'active'); // สมมติว่ามี field status ใน plans list
          setSelectedPlanId(activePlan ? activePlan._id : data[0]._id);
        }
        setLoadingPlans(false);
      })
      .catch((error) => {
        console.error("Error fetching plans:", error);
        setLoadingPlans(false);
      });
  }, []); 

  // --- Effect 2: ดึง "ข้อมูลสรุป" (เมื่อ 'selectedPlanId' เปลี่ยน) ---
  useEffect(() => {
    if (!selectedPlanId) {
      setSummary(null); 
      return; 
    }

    setLoadingSummary(true);
    fetch(`http://127.0.0.1:5000/home_bp/study_summary/${selectedPlanId}`)
      .then((res) => res.json())
      .then((data) => {
        setSummary(data); 
        setLoadingSummary(false);
      })
      .catch((error) => {
        console.error("Error fetching summary:", error);
        setLoadingSummary(false);
      });
  }, [selectedPlanId]); 

  
  // --- คำนวณเปอร์เซ็นต์ความคืบหน้า ---
  const totalDays = (summary ? summary.days_read + summary.days_remaining : 0);
  const progressPercent = totalDays > 0 
    ? Math.round((summary.days_read / totalDays) * 100) 
    : 0;

  // --- ส่วนแสดงผล (Render) ---
  if (loadingPlans) {
    return (
      <div className="flex bg-gray-100 min-h-screen">
        {/* <Sidebar /> */}
        <div className="flex-1 p-8 flex justify-center items-center">
          <p className="text-xl text-gray-700">กำลังโหลดรายการแผน...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-gray-100 min-h-screen">
      { <Sidebar /> }
      
      {/* --- Main Content Area --- */}
      <div className="flex-1 p-8">
        
        {/* --- Dropdown สำหรับเลือกแผน --- */}
        <div className="mb-8 flex items-center">
          <label htmlFor="plan-select" className="mr-3 text-lg font-semibold text-gray-700">เลือกแผน:</label>
          <div className="relative inline-block w-64"> {/* เพิ่ม div เพื่อควบคุมความกว้าง */}
            <select
              id="plan-select"
              className="block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150 ease-in-out"
              value={selectedPlanId || ''}
              onChange={(e) => setSelectedPlanId(e.target.value)}
            >
              {plans.length === 0 ? (
                <option value="">ไม่มีแผน</option>
              ) : (
                plans.map((plan) => (
                  <option key={plan._id} value={plan._id}>
                    {plan.exam_title} 
                  </option>
                ))
              )}
            </select>
            {/* Custom arrow for select */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
        </div>

        {/* --- Today's Card (Top) --- */}
        <div className="bg-white shadow-xl rounded-2xl p-8 mb-8 border border-gray-200"> {/* เพิ่ม shadow-xl และ border */}
          {loadingSummary ? (
            <div className="text-center py-10 text-gray-600">กำลังโหลดข้อมูลแผน...</div>
          ) : !summary ? (
            <div className="text-center py-10 text-gray-600">ไม่พบข้อมูลสำหรับแผนนี้</div>
          ) : (
            <div className="flex flex-col md:flex-row justify-between items-center md:items-start space-y-6 md:space-y-0">
              {/* ส่วนข้อความ */}
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-3xl font-extrabold mb-2 text-gray-900">
                  เนื้อหาที่ต้องอ่านวันนี้ !
                </h2>
                {summary.today_study ? (
                  <p className="text-xl text-gray-600">
                    <span className="font-semibold text-blue-700">{summary.today_study.subject}</span> เวลา: {summary.today_study.time} น.
                  </p>
                ) : (
                  <p className="text-xl text-gray-600">
                    วันนี้ไม่มีแผนการอ่านหนังสือ
                  </p>
                )}
              </div>
              
              {/* ส่วนแสดงเวลารวม (คำนวณจาก Backend) */}
              <div className="flex-shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 p-1.5 rounded-full shadow-lg"> {/* Gradient border */}
                <div className="w-40 h-40 rounded-full bg-white flex items-center justify-center text-indigo-700 text-4xl font-extrabold border-4 border-white">
                  {formatMinutesToHM(summary.total_duration_minutes)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* --- Progress Bar Card --- */}
        {summary && !loadingSummary && (
          <div className="bg-white shadow-lg rounded-2xl p-6 mb-8 border border-gray-200">
            <div className="flex justify-between items-center mb-4"> {/* เพิ่ม mb-4 */}
              <h3 className="text-2xl font-bold text-gray-800">ความคืบหน้าของแผน</h3>
              <span className="text-xl font-semibold text-blue-600">{progressPercent}%</span>
            </div>
            {/* แถบ Progress Bar */}
            <div className="w-full bg-blue-100 rounded-full h-3 overflow-hidden"> {/* ปรับสี bg และความสูง */}
              <div 
                className="bg-gradient-to-r from-blue-400 to-indigo-600 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* --- Summary Cards (Bottom Grid) --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6"> {/* ปรับ gap */}
          <SummaryCard 
            title="วันที่อ่านแล้ว" 
            value={loadingSummary ? '...' : (summary ? summary.days_read : 0)} 
            // icon={<i className="fas fa-calendar-check"></i>} {/* ตัวอย่าง icon */}
          />
          <SummaryCard 
            title="วันที่เหลือ" 
            value={loadingSummary ? '...' : (summary ? summary.days_remaining : 0)} 
            // icon={<i className="fas fa-calendar-alt"></i>}
          />
          <SummaryCard 
            title="วิชาทั้งหมด" 
            value={loadingSummary ? '...' : (summary ? summary.subject_count : 0)} 
            // icon={<i className="fas fa-book"></i>}
          />
        </div>

      </div>
    </div>
  );
}

