import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { ClockIcon, PlayIcon, PauseIcon, ArrowPathIcon } from '@heroicons/react/24/solid';

function Time() {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Dropdown
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);

  // Timer
  const [todaySubject, setTodaySubject] = useState('เลือกแผน...');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [initialSeconds, setInitialSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(false);
  const [initialSubject, setInitialSubject] = useState(''); // เพิ่มเก็บ subject ดั้งเดิม

  // 1. นาฬิกามุมบนขวา
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. ดึงรายชื่อแผน
  useEffect(() => {
    console.log("⏰ Fetching plans for timer...");
    setIsLoadingPlans(true);
    
    fetch("http://127.0.0.1:5000/api/get_all_plans", {
      credentials: 'include'
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("⏰ Plans loaded:", data);
        setPlans(data || []);
        if (data && data.length > 0) {
          setSelectedPlanId(data[0]._id);
        } else {
          setTodaySubject("ไม่พบแผน");
        }
        setIsLoadingPlans(false);
      })
      .catch((error) => {
        console.error("❌ Error fetching plans:", error);
        setTodaySubject("โหลดล้มเหลว");
        setIsLoadingPlans(false);
      });
  }, []);

  // 3. ดึง Event ของวันนี้
  useEffect(() => {
    if (!selectedPlanId) {
      setTodaySubject("เลือกแผน...");
      setSecondsLeft(0);
      setInitialSeconds(0);
      setIsActive(false);
      return;
    }

    console.log("⏰ Fetching today's event for plan:", selectedPlanId);
    setIsLoadingEvent(true);
    setIsActive(false);
    
    fetch(`http://127.0.0.1:5000/api/get_today_event/${selectedPlanId}`, {
      credentials: 'include'
    })
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
      })
      .then(todayEvent => {
        console.log("⏰ Today's event:", todayEvent);
        
        if (todayEvent && todayEvent.startTime && todayEvent.endTime) {
          const durationSeconds = calculateDuration(todayEvent.startTime, todayEvent.endTime);
          setSecondsLeft(durationSeconds);
          setInitialSeconds(durationSeconds);
          setTodaySubject(todayEvent.subject);
          setInitialSubject(todayEvent.subject); // เก็บ subject ดั้งเดิม
        } else {
          setTodaySubject('ไม่มีแผนสำหรับวันนี้');
          setSecondsLeft(0);
          setInitialSeconds(0);
          setInitialSubject('');
        }
        setIsLoadingEvent(false);
      })
      .catch(error => {
        console.error("❌ Error fetching today event:", error);
        setTodaySubject('เชื่อมต่อล้มเหลว');
        setIsLoadingEvent(false);
      });
  }, [selectedPlanId]);

  // 4. Countdown
  useEffect(() => {
    let timer = null;

    if (isActive) {
      timer = setInterval(() => {
        setSecondsLeft(prevSeconds => {
          if (prevSeconds <= 1) {
            clearInterval(timer);
            setIsActive(false);
            setTodaySubject('🎉 อ่านจบแล้ว!');
            return 0;
          }
          return prevSeconds - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isActive]);

  // Helper Functions
  const calculateDuration = (start, end) => {
    try {
      const [startH, startM] = start.split(':').map(Number);
      const [endH, endM] = end.split(':').map(Number);
      const startTimeInSeconds = (startH * 3600) + (startM * 60);
      const endTimeInSeconds = (endH * 3600) + (endM * 60);
      return endTimeInSeconds - startTimeInSeconds;
    } catch {
      return 0;
    }
  };

  const formatCurrentTime = (date) => {
    const options = { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    };
    return date.toLocaleString('th-TH', options);
  };

  const formatCountdown = () => {
    const hours = Math.floor(secondsLeft / 3600);
    const minutes = Math.floor((secondsLeft % 3600) / 60);
    const seconds = secondsLeft % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Progress calculation
  const progress = initialSeconds > 0 ? ((initialSeconds - secondsLeft) / initialSeconds) * 100 : 0;

  // Button Handlers
  const toggleTimer = () => {
    if (secondsLeft > 0) {
      setIsActive(!isActive);
    }
  };

  const resetTimer = () => {
    setIsActive(false);
    setSecondsLeft(initialSeconds);
    setTodaySubject(initialSubject || 'ไม่มีแผนสำหรับวันนี้');
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <Sidebar />

      <main className="flex-1 flex flex-col p-8 overflow-y-auto">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <ClockIcon className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-800">Timer</h1>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 uppercase tracking-wide">เวลาปัจจุบัน</div>
            <div className="text-lg font-semibold text-gray-800">
              {formatCurrentTime(currentTime)}
            </div>
          </div>
        </header>

        {/* Dropdown */}
        <div className="mb-8 bg-white rounded-xl shadow-md p-4 border border-gray-100">
          <label htmlFor="plan-select" className="block text-sm font-semibold text-gray-700 mb-2">
            📚 เลือกแผนการสอบ:
          </label>
          <select
            id="plan-select"
            className="w-full max-w-md p-3 border-2 border-gray-200 rounded-lg shadow-sm bg-white text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
            disabled={isLoadingPlans}
          >
            {isLoadingPlans ? (
              <option value="">กำลังโหลด...</option>
            ) : plans.length > 0 ? (
              plans.map((plan) => (
                <option key={plan._id} value={plan._id}>
                  {plan.exam_title}
                </option>
              ))
            ) : (
              <option value="">ไม่พบแผน</option>
            )}
          </select>
        </div>

        {/* Timer Container */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-8">
          
          {/* Timer Circle */}
          <div className="relative w-80 h-80 md:w-96 md:h-96">
            {/* Background Circle */}
            <div className="absolute inset-0 bg-white rounded-full shadow-2xl"></div>
            
            {/* Progress Circle (SVG) */}
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r="45%"
                fill="none"
                stroke="#E5E7EB"
                strokeWidth="12"
              />
              <circle
                cx="50%"
                cy="50%"
                r="45%"
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 45} ${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                className="transition-all duration-300"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366F1" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
              </defs>
            </svg>
            
            {/* Timer Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
              {isLoadingEvent ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                  <span className="text-lg font-medium text-gray-500">กำลังโหลด...</span>
                </div>
              ) : (
                <>
                  <div className="text-6xl md:text-7xl font-bold text-gray-800 tracking-wider mb-3">
                    {formatCountdown()}
                  </div>
                  <div className="text-xl md:text-2xl font-semibold text-indigo-600 px-4">
                    {todaySubject}
                  </div>
                  {initialSeconds > 0 && (
                    <div className="text-sm text-gray-500 mt-2">
                      {Math.round(progress)}% เสร็จสิ้น
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* Timer Controls */}
          <div className="flex gap-4">
            <button 
              className={`flex items-center gap-2 px-8 py-4 rounded-full text-white font-semibold shadow-lg transition-all transform hover:scale-105
                          ${isActive 
                            ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600' 
                            : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'}
                          ${(secondsLeft <= 0 || isLoadingEvent) ? 'opacity-50 cursor-not-allowed scale-100' : ''}`}
              onClick={toggleTimer}
              disabled={secondsLeft <= 0 || isLoadingEvent}
            >
              {isActive ? (
                <>
                  <PauseIcon className="w-5 h-5" />
                  Pause
                </>
              ) : (
                <>
                  <PlayIcon className="w-5 h-5" />
                  Start
                </>
              )}
            </button>
            
            <button 
              className={`flex items-center gap-2 px-8 py-4 rounded-full font-semibold shadow-lg transition-all transform hover:scale-105
                          bg-white text-gray-700 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50
                          ${(secondsLeft <= 0 || isLoadingEvent || isActive) ? 'opacity-50 cursor-not-allowed scale-100' : ''}`}
              onClick={resetTimer}
              disabled={secondsLeft <= 0 || isLoadingEvent || isActive}
            >
              <ArrowPathIcon className="w-5 h-5" />
              Reset
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Time;