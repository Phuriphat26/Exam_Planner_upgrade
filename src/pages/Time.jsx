import React, { useState, useEffect } from 'react';

// --- [Mock Sidebar] ---
// (Sidebar จำลอง, ให้ลบส่วนนี้ออก
// และ uncomment import ด้านล่าง เมื่อนำไปใช้จริง)

// --- [จบ Mock Sidebar] ---

import Sidebar from '../components/Sidebar'; // <-- (เมื่อนำไปใช้จริง ให้เปิดคอมเมนต์นี้)


function Time() {
  // State สำหรับเวลาปัจจุบัน (มุมบนขวา)
  const [currentTime, setCurrentTime] = useState(new Date());

  // --- State ใหม่สำหรับ Dropdown ---
  const [plans, setPlans] = useState([]); // เก็บรายชื่อแผน
  const [selectedPlanId, setSelectedPlanId] = useState(''); // เก็บ ID แผนที่เลือก
  const [isLoadingPlans, setIsLoadingPlans] = useState(true); // สถานะโหลด Dropdown

  // State สำหรับ Timer
  const [todaySubject, setTodaySubject] = useState('เลือกแผน...');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [initialSeconds, setInitialSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(false); // สถานะโหลด Event

  // --- 1. Effect สำหรับนาฬิกา (มุมบนขวา) ---
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- 2. Effect สำหรับดึง "รายชื่อแผน" (สำหรับ Dropdown) ---
  useEffect(() => {
    setIsLoadingPlans(true);
    fetch("http://127.0.0.1:5000/api/get_all_plans")
      .then((res) => res.json())
      .then((data) => {
        setPlans(data || []); // ป้องกัน data เป็น null
        if (data && data.length > 0) {
          setSelectedPlanId(data[0]._id); // เลือกแผนแรกเป็น default
        } else {
          setTodaySubject("ไม่พบแผน");
        }
        setIsLoadingPlans(false);
      })
      .catch((error) => {
        console.error("Error fetching plans:", error);
        setTodaySubject("โหลดล้มเหลว");
        setIsLoadingPlans(false);
      });
  }, []); // รันครั้งเดียว

  // --- 3. Effect สำหรับดึง "Event ของวันนี้" (เมื่อเลือกแผน) ---
  useEffect(() => {
    if (!selectedPlanId) {
      setTodaySubject("เลือกแผน...");
      setSecondsLeft(0);
      setInitialSeconds(0);
      setIsActive(false);
      return; // ถ้ายังไม่เลือกแผน ก็ไม่ต้องทำอะไร
    }

    setIsLoadingEvent(true);
    setIsActive(false); // หยุด timer เมื่อเปลี่ยนแผน
    
    fetch(`http://127.0.0.1:5000/api/get_today_event/${selectedPlanId}`)
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
      })
      .then(todayEvent => {
        if (todayEvent && todayEvent.startTime && todayEvent.endTime) {
          const durationSeconds = calculateDuration(todayEvent.startTime, todayEvent.endTime);
          setSecondsLeft(durationSeconds);
          setInitialSeconds(durationSeconds);
          setTodaySubject(todayEvent.subject);
        } else {
          setTodaySubject('ไม่มีแผนสำหรับวันนี้');
          setSecondsLeft(0);
          setInitialSeconds(0);
        }
        setIsLoadingEvent(false);
      })
      .catch(error => {
        console.error("Error fetching today event:", error);
        setTodaySubject('เชื่อมต่อล้มเหลว');
        setIsLoadingEvent(false);
      });
  }, [selectedPlanId]); // รันใหม่ทุกครั้งที่เปลี่ยน selectedPlanId

  
  // --- 4. [แก้ไข] Effect สำหรับการนับถอยหลัง ---
  useEffect(() => {
    let timer = null;

    if (isActive) {
      // ถ้า isActive (กด Start)
      timer = setInterval(() => {
        
        setSecondsLeft(prevSeconds => {
          if (prevSeconds <= 1) {
            // ถ้านับถึง 0
            clearInterval(timer); // หยุด interval
            setIsActive(false);    // ปิดสวิตช์
            setTodaySubject('อ่านจบแล้ว!'); // เปลี่ยนข้อความ
            return 0; // คืนค่า 0
          }
          // ถ้านยังไม่ถึง 0
          return prevSeconds - 1; // ลดค่า 1
        });

      }, 1000);

    } 
    
    // Cleanup function: ทำงานเมื่อ component unmount หรือ dependency (isActive) เปลี่ยน
    return () => {
      if (timer) {
        clearInterval(timer); // ล้าง interval เก่าทิ้ง
      }
    };
  }, [isActive]); // <-- [แก้ไข] ให้ขึ้นอยู่กับ 'isActive' เท่านั้น
  

  // --- Helper Functions ---
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
    const options = { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hour12: true };
    // ใช้ 'th-TH' เพื่อแสดงผลภาษาไทย
    return date.toLocaleString('th-TH', options).replace(',', ''); 
  };

  const formatCountdown = () => {
    const hours = Math.floor(secondsLeft / 3600);
    const minutes = Math.floor((secondsLeft % 3600) / 60);
    const seconds = secondsLeft % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // --- Button Handlers ---
  const toggleTimer = () => {
    if (secondsLeft > 0) { // ป้องกันการกด Start/Pause เมื่อเวลาเป็น 0
      setIsActive(!isActive);
    }
  };

  const resetTimer = () => {
    setIsActive(false);
    setSecondsLeft(initialSeconds);
    // ต้องดึง Subject กลับมาด้วย (ถ้า initialSeconds > 0)
    if (initialSeconds > 0) {
        // อาจจะต้องเก็บ initialSubject ไว้ใน state ด้วย
        // หรือง่ายกว่าคือ ปล่อยให้ useEffect[selectedPlanId] ทำงานใหม่
        // แต่การตั้งค่า subject ใหม่ทันทีจะดีกว่า
        // (เราต้องดึงข้อมูลอีกรอบ หรือเก็บ state ไว้)
        // [แบบง่าย]
        setTodaySubject(isLoadingEvent ? 'กำลังโหลด...' : (initialSeconds > 0 ? todaySubject : 'ไม่มีแผนสำหรับวันนี้'));
    }
  };

  // --- Render ---
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      {/* --- Main Content --- */}
      <main className="flex-1 flex flex-col p-8 overflow-y-auto">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <span className="text-sm font-medium text-gray-500 uppercase">TIMER</span>
          <span className="text-base font-medium text-gray-800">
            {formatCurrentTime(currentTime)}
          </span>
        </header>

        {/* Dropdown เลือกแผน */}
        <div className="mb-6 w-full max-w-xs">
           <label htmlFor="plan-select" className="block text-sm font-medium text-gray-700 mb-1">
             เลือกแผน:
           </label>
           <select
             id="plan-select"
             className="w-full p-2 border border-gray-300 rounded-lg shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
             value={selectedPlanId}
             onChange={(e) => setSelectedPlanId(e.target.value)}
             disabled={isLoadingPlans}
           >
             {isLoadingPlans ? (
                <option value="">กำลังโหลด...</option>
             ) : (
               plans.length > 0 ? (
                 plans.map((plan) => (
                   <option key={plan._id} value={plan._id}>
                     {plan.exam_title}
                   </option>
                 ))
               ) : (
                 <option value="">ไม่พบแผน</option>
               )
             )}
           </select>
         </div>


        {/* Timer Container */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-8">
          
          {/* Timer Circle */}
          <div className="relative w-80 h-80 md:w-96 md:h-96">
            <div className="absolute inset-0 bg-white rounded-full shadow-xl"></div>
            <div className="absolute inset-2 bg-white rounded-full border-8 border-gray-100"></div>
            <div className="absolute inset-0 rounded-full border-[12px] border-blue-500 shadow-inner"></div>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              {isLoadingEvent ? (
                <span className="text-2xl font-bold text-gray-500">Loading...</span>
              ) : (
                <>
                  <div className="text-6xl md:text-7xl font-bold text-gray-800 tracking-wider">
                    {formatCountdown()}
                  </div>
                  <div className="text-2xl font-medium text-blue-600 mt-2">
                    {todaySubject}
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Timer Controls */}
          <div className="flex space-x-4">
            <button 
              className={`w-32 py-3 rounded-full text-white font-semibold shadow-lg transition-all
                          ${isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}
                          ${(secondsLeft <= 0 || isLoadingEvent) ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={toggleTimer}
              disabled={secondsLeft <= 0 || isLoadingEvent}
            >
              {isActive ? 'Pause' : 'Start'}
            </button>
            <button 
              className={`w-32 py-3 rounded-full font-semibold shadow-lg transition-all
                          bg-gray-100 text-gray-700 hover:bg-gray-200
                          ${(secondsLeft <= 0 || isLoadingEvent || isActive) ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={resetTimer}
              disabled={secondsLeft <= 0 || isLoadingEvent || isActive}
            >
              Reset
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Time;

