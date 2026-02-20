import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { BookOpenIcon, ClockIcon, AcademicCapIcon, CalendarDaysIcon } from '@heroicons/react/24/solid';


function SummaryCard({ title, value, icon: Icon, className = "" }) {
  return (
    <div className={`bg-white shadow-lg rounded-2xl p-6 border border-gray-100 hover:shadow-xl transition-all ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-gray-600 text-sm font-medium">{title}</p>
        {Icon && <Icon className="w-6 h-6 text-gray-400" />}
      </div>
      <p className="text-indigo-700 text-4xl font-extrabold">{value}</p>
    </div>
  );
}


export default function Home() {
  const [plans, setPlans] = useState([]); 
  const [selectedPlanId, setSelectedPlanId] = useState(null); 
  const [summary, setSummary] = useState(null); 
  
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState(null);


  const formatMinutesToHM = (minutes) => {
    if (minutes === null || isNaN(minutes) || minutes < 0) return "00:00";
    const totalMins = Math.round(minutes);
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  // โหลดรายชื่อแผน 
  useEffect(() => {
    console.log("🔄 Starting to fetch plans...");
    setLoadingPlans(true);
    setError(null);
    
    fetch("http://localhost:5000/home_bp/plans", {
      credentials: 'include'
    })
      .then((res) => {
        console.log("📡 Plans response status:", res.status);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log("📚 Plans loaded:", data);
        setPlans(data);
        if (data && data.length > 0) {
            const savedPlanId = localStorage.getItem("selectedPlanId");
            console.log("💾 Saved plan ID:", savedPlanId);
            
            if (savedPlanId && data.find(p => p._id === savedPlanId)) {
                console.log("✅ Using saved plan ID");
                setSelectedPlanId(savedPlanId);
            } else {
                console.log("✅ Using first plan:", data[0]._id);
                setSelectedPlanId(data[0]._id);
            }
        } else {
            console.log("⚠️ No plans found");
        }
        setLoadingPlans(false);
      })
      .catch((error) => {
        console.error("❌ Error fetching plans:", error);
        setError("ไม่สามารถโหลดแผนได้: " + error.message);
        setLoadingPlans(false);
      });
  }, []); 

  // โหลดข้อมูลสรุป 
  useEffect(() => {
    if (!selectedPlanId) {
      console.log("⚠️ No plan selected");
      setSummary(null); 
      return; 
    }

    console.log("🔄 Fetching summary for plan:", selectedPlanId);
    localStorage.setItem("selectedPlanId", selectedPlanId);

    setLoadingSummary(true);
    setError(null);
    
    fetch(`http://localhost:5000/home_bp/study_summary/${selectedPlanId}`, {
      credentials: 'include'
    })
      .then((res) => {
        console.log("📡 Summary response status:", res.status);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log("📊 Summary loaded:", data);
        console.log("📊 Days read:", data.days_read);
        console.log("📊 Days remaining:", data.days_remaining);
        console.log("📊 Subject count:", data.subject_count);
        console.log("📊 Total duration:", data.total_duration_minutes);
        console.log("📊 Today study:", data.today_study);
        
        setSummary(data); 
        setLoadingSummary(false);
      })
      .catch((error) => {
        console.error("❌ Error fetching summary:", error);
        setError("ไม่สามารถโหลดข้อมูลสรุปได้: " + error.message);
        setLoadingSummary(false);
      });
  }, [selectedPlanId]); 

  const totalDays = (summary ? summary.days_read + summary.days_remaining : 0);
  const progressPercent = totalDays > 0 
    ? Math.round((summary.days_read / totalDays) * 100) 
    : 0;

  if (loadingPlans) {
    return (
      <div className="flex bg-gradient-to-br from-blue-50 via-white to-indigo-50 min-h-screen">
        <Sidebar />
        <div className="flex-1 p-8 flex justify-center items-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-xl text-gray-700">กำลังโหลดแผน...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex bg-gradient-to-br from-blue-50 via-white to-indigo-50 min-h-screen">
        <Sidebar />
        <div className="flex-1 p-8">
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-xl font-bold text-red-800">เกิดข้อผิดพลาด</h3>
            </div>
            <p className="text-red-700">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              ลองใหม่อีกครั้ง
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-gradient-to-br from-blue-50 via-white to-indigo-50 min-h-screen font-sans">
      <Sidebar />
      
      <div className="flex-1 p-8">
        
      
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-6">📊 Dashboard</h1>
          
          
          <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <AcademicCapIcon className="w-6 h-6 text-blue-600" />
              <label htmlFor="plan-select" className="text-lg font-semibold text-gray-700">เลือกแผนการสอบ:</label>
              <select
                id="plan-select"
                className="flex-1 max-w-md p-3 border-2 border-gray-200 rounded-lg shadow-sm bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                value={selectedPlanId || ''}
                onChange={(e) => {
                  console.log("🔄 Plan changed to:", e.target.value);
                  setSelectedPlanId(e.target.value);
                }}
              >
                {plans.length === 0 ? (
                  <option value="">ไม่มีแผน</option>
                ) : (
                  plans.map((plan) => (
                    <option key={plan._id} value={plan._id}>
                      📚 {plan.exam_title}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>

        
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 shadow-xl rounded-2xl p-8 mb-8 text-white">
          {loadingSummary ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4"></div>
              <p>กำลังโหลดข้อมูล...</p>
            </div>
          ) : !summary ? (
            <div className="text-center py-10">
              <BookOpenIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">ไม่พบข้อมูลสรุป</p>
              <p className="text-sm opacity-75 mt-2">กรุณาตรวจสอบ Console สำหรับข้อมูลเพิ่มเติม</p>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDaysIcon className="w-8 h-8" />
                  <h2 className="text-3xl font-extrabold">
                    เนื้อหาที่ต้องอ่านวันนี้!
                  </h2>
                </div>
                {summary.today_study ? (
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <p className="text-2xl font-bold mb-2 flex items-center gap-2">
                      <BookOpenIcon className="w-6 h-6" />
                      {summary.today_study.subject}
                    </p>
                    <p className="text-lg flex items-center gap-2">
                      <ClockIcon className="w-5 h-5" />
                      เวลา: <span className="font-mono bg-white/20 px-3 py-1 rounded-lg">{summary.today_study.time}</span> น.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <p className="text-lg">
                      🎉 วันนี้ไม่มีแผนการอ่านหนังสือ - พักผ่อนได้เลย!
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex-shrink-0 relative">
                 <div className="w-36 h-36 rounded-full border-4 border-white/30 flex flex-col items-center justify-center bg-white/10 backdrop-blur-sm shadow-2xl">
                    <ClockIcon className="w-8 h-8 mb-2 opacity-80" />
                    <span className="text-3xl font-bold">
                        {formatMinutesToHM(summary.total_duration_minutes)}
                    </span>
                    <span className="text-sm opacity-75">ชั่วโมง</span>
                 </div>
              </div>
            </div>
          )}
        </div>

    
        {summary && !loadingSummary && (
          <div className="bg-white shadow-lg rounded-2xl p-6 mb-8 border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800">ความคืบหน้าของแผน</h3>
                <p className="text-sm text-gray-500 mt-1">
                  อ่านไปแล้ว {summary.days_read} จาก {totalDays} วัน
                </p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-blue-600">{progressPercent}%</span>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden shadow-inner">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-6 rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-2"
                style={{ width: `${progressPercent}%` }}
              >
                {progressPercent > 10 && (
                  <span className="text-white text-xs font-bold">{progressPercent}%</span>
                )}
              </div>
            </div>
          </div>
        )}


        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SummaryCard 
            title="วันที่อ่านแล้ว" 
            value={loadingSummary ? '-' : (summary?.days_read ?? 0)}
            icon={BookOpenIcon}
            className="border-l-4 border-green-500"
          />
          <SummaryCard 
            title="วันที่เหลือ" 
            value={loadingSummary ? '-' : (summary?.days_remaining ?? 0)}
            icon={CalendarDaysIcon}
            className="border-l-4 border-orange-500"
          />
          <SummaryCard 
            title="วิชาทั้งหมด" 
            value={loadingSummary ? '-' : (summary?.subject_count ?? 0)}
            icon={AcademicCapIcon}
            className="border-l-4 border-blue-500"
          />
        </div>

      </div>
    </div>
  );
}