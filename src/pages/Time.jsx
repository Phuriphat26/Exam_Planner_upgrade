import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar'; 
import { ClockIcon, PlayIcon, PauseIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';

function Time() {
  const [currentTime, setCurrentTime] = useState(new Date());
  

  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);


  const [todaySubject, setTodaySubject] = useState('กำลังโหลด...');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [initialSeconds, setInitialSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(false);
  const [initialSubject, setInitialSubject] = useState('');
  const [isRescheduled, setIsRescheduled] = useState(false);


  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);


  useEffect(() => {
    const fetchPlans = async () => {
      setIsLoadingPlans(true);
      try {
        const res = await fetch("http://localhost:5000/calender/api/exam-plans/", {
          credentials: 'include'
        });
        
        if (!res.ok) throw new Error('Failed to fetch plans');
        
        const data = await res.json();
        
        if (Array.isArray(data) && data.length > 0) {
          setPlans(data);
          
          const savedId = localStorage.getItem("selectedPlanId");
          const planExists = data.some(p => p._id === savedId);

          if (savedId && planExists) {
            setSelectedPlanId(savedId);
          } else {
            setSelectedPlanId(data[0]._id);
            localStorage.setItem("selectedPlanId", data[0]._id);
          }
        } else {
          setPlans([]);
          setTodaySubject("ไม่พบแผนการสอบ");
          localStorage.removeItem("selectedPlanId");
        }
      } catch (error) {
        console.error("Fetch plans error:", error);
        setTodaySubject("กรุณา Login หรือลองใหม่");
        setPlans([]);
      } finally {
        setIsLoadingPlans(false);
      }
    };
    
    fetchPlans();
  }, []);


  useEffect(() => {
    if (!selectedPlanId) return;

    const fetchTodayEvent = async () => {
      setIsLoadingEvent(true);
      setIsActive(false); 
      setIsRescheduled(false);

      try {
        const res = await fetch("http://localhost:5000/calender/api/schedule", {
          credentials: 'include'
        });
        
        if (!res.ok) throw new Error('Failed to fetch schedule');
        
        const data = await res.json();
        const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
        
        const todayTasks = data.filter(t => {
          const tDate = String(t.date).split('T')[0];
          return t.exam_id === selectedPlanId && tDate === todayStr;
        });

    
        const rescheduleMarker = todayTasks.find(t => t.status === 'rescheduled');
        if (rescheduleMarker) {
          setIsRescheduled(true);
          setTodaySubject("⛔ วันนี้เลื่อนตาราง");
          setSecondsLeft(0);
          setInitialSeconds(0);
          setInitialSubject('');
          return;
        }

  
        const activeTask = todayTasks.find(t => 
          t.subject !== 'Free Slot' && t.status !== 'completed'
        );

        if (activeTask?.startTime && activeTask?.endTime) {
          const duration = calculateDuration(activeTask.startTime, activeTask.endTime);
          setSecondsLeft(duration);
          setInitialSeconds(duration);
          setTodaySubject(activeTask.subject);
          setInitialSubject(activeTask.subject);
        } else {
          setTodaySubject('ไม่มีเรียนในช่วงนี้ / อ่านครบแล้ว');
          setSecondsLeft(0);
          setInitialSeconds(0);
          setInitialSubject('');
        }

      } catch (error) {
        console.error("Fetch event error:", error);
        setTodaySubject('โหลดข้อมูลไม่สำเร็จ');
      } finally {
        setIsLoadingEvent(false);
      }
    };

    fetchTodayEvent();
  }, [selectedPlanId]);


  useEffect(() => {
    if (!isActive || secondsLeft <= 0) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsActive(false);
          setTodaySubject('🎉 จบ Session!');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, secondsLeft]);


  const calculateDuration = (start, end) => {
    try {
      const [h1, m1] = start.split(':').map(Number);
      const [h2, m2] = end.split(':').map(Number);
      const startSec = h1 * 3600 + m1 * 60;
      const endSec = h2 * 3600 + m2 * 60;
      return Math.max(0, endSec - startSec);
    } catch {
      return 0;
    }
  };

  const formatTime = (seconds) => {
    if (seconds <= 0) return "00:00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const progress = initialSeconds > 0 
    ? Math.min(100, ((initialSeconds - secondsLeft) / initialSeconds) * 100)
    : 0;

  const handlePlanChange = (e) => {
    const newId = e.target.value;
    setSelectedPlanId(newId);
    localStorage.setItem("selectedPlanId", newId);
  };

  const handleReset = () => {
    setIsActive(false);
    setSecondsLeft(initialSeconds);
    setTodaySubject(initialSubject || 'ไม่มีเรียนในช่วงนี้');
  };

  const circleRadius = 45;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference * (1 - progress / 100);

  return (
    <div className="flex h-screen bg-gradient-to-br from-indigo-50 to-blue-100">
      <Sidebar />
      <main className="flex-1 flex flex-col p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <ClockIcon className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-800">Focus Timer</h1>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">เวลาปัจจุบัน</div>
            <div className="text-xl font-bold text-gray-800">
              {currentTime.toLocaleTimeString('th-TH')}
            </div>
          </div>
        </header>

        <div className="mb-6 flex justify-center">
          <select 
            className="w-full max-w-md p-3 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-indigo-500 bg-white"
            value={selectedPlanId}
            onChange={handlePlanChange}
            disabled={isLoadingPlans}
          >
            {isLoadingPlans && <option>กำลังโหลด...</option>}
            {!isLoadingPlans && plans.length === 0 && <option>ไม่พบแผนการสอบ</option>}
            {plans.map(p => (
              <option key={p._id} value={p._id}>{p.exam_title}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center space-y-8">
          {isRescheduled ? (
            <div className="flex flex-col items-center justify-center p-10 bg-white rounded-3xl shadow-xl border-4 border-gray-200 max-w-lg">
              <ExclamationTriangleIcon className="w-32 h-32 text-gray-400 mb-4" />
              <h2 className="text-3xl font-bold text-gray-600">วันนี้เลื่อนตาราง</h2>
              <p className="text-gray-500 mt-2 text-center">
                คุณได้ทำการเลื่อนการอ่านหนังสือของวันนี้ออกไปแล้ว
              </p>
              <p className="text-indigo-500 font-semibold mt-4">
                พักผ่อนให้เต็มที่ แล้วเริ่มใหม่พรุ่งนี้นะครับ! ✌️
              </p>
            </div>
          ) : (
            <>
              <div className="relative w-80 h-80">
                <svg className="w-full h-full -rotate-90 transform">
                  <circle 
                    cx="50%" 
                    cy="50%" 
                    r={`${circleRadius}%`}
                    fill="none" 
                    stroke="#E5E7EB" 
                    strokeWidth="12" 
                  />
                  <circle 
                    cx="50%" 
                    cy="50%" 
                    r={`${circleRadius}%`}
                    fill="none" 
                    stroke="#6366F1" 
                    strokeWidth="12" 
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round" 
                    className="transition-all duration-300"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-6xl font-bold text-gray-800 tracking-wide tabular-nums">
                    {formatTime(secondsLeft)}
                  </div>
                  <div className="text-lg text-indigo-600 font-medium mt-2 max-w-[200px] truncate text-center px-2">
                    {isLoadingEvent ? 'กำลังโหลด...' : todaySubject}
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setIsActive(!isActive)}
                  disabled={secondsLeft <= 0}
                  className={`flex items-center gap-2 px-8 py-3 rounded-full text-white font-bold shadow-lg transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                    isActive ? 'bg-orange-500 hover:bg-orange-600' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {isActive ? (
                    <>
                      <PauseIcon className="w-5 h-5"/> พัก
                    </>
                  ) : (
                    <>
                      <PlayIcon className="w-5 h-5"/> เริ่ม
                    </>
                  )}
                </button>
                
                <button 
                  onClick={handleReset}
                  disabled={!initialSeconds}
                  className="flex items-center gap-2 px-8 py-3 bg-white text-gray-700 border border-gray-300 rounded-full font-bold shadow hover:bg-gray-50 transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <ArrowPathIcon className="w-5 h-5"/> รีเซ็ต
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default Time;