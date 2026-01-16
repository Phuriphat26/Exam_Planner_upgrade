import React from "react";
import { Calendar, LogOut, Plus } from "lucide-react";
// 1. เปลี่ยนจาก Link เป็น NavLink
import { NavLink, useNavigate, Link } from "react-router-dom";

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const response = await fetch("http://localhost:5000/login/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const data = await response.json();

      if (data.success) {
        navigate("/login");
      }
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // 2. กำหนดสไตล์ Active และ Inactive ไว้ในตัวแปร
  const activeClass =
    "w-full text-left px-3 py-2 rounded-lg bg-indigo-50 text-indigo-600 font-medium";
  const inactiveClass =
    "w-full text-left px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg";

  // 3. สร้างฟังก์ชันสำหรับเช็ค className ของ NavLink
  const getNavLinkClass = ({ isActive }) => (isActive ? activeClass : inactiveClass);

  return (
    <div className="h-screen w-56 bg-white shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 px-4 py-6">
          <Calendar className="text-indigo-500" />
          <h1 className="text-lg font-semibold text-indigo-600">Exam Planner</h1>
        </div>

        <nav className="flex flex-col gap-2 px-4">
          {/* 4. เปลี่ยน Link เป็น NavLink และใช้ className แบบฟังก์ชัน */}
          {/* 5. เพิ่ม 'end' ให้ Dashboard เพื่อไม่ให้มัน active ตลอดเวลา (เพราะ / ไปซ้ำกับ /Calendar) */}
          <NavLink to="/home" className={getNavLinkClass} end>
            Dashboard
          </NavLink>
          <NavLink to="/Calendar" className={getNavLinkClass}>
            Calendar
          </NavLink>
          <NavLink to="/Subject" className={getNavLinkClass}>
            Subject
          </NavLink>
          <NavLink to="/time" className={getNavLinkClass}>
            Time
          </NavLink>
          <NavLink to="/ExamPlanList" className={getNavLinkClass}>
            แผนการอ่าน
          </NavLink>

          {/* ปุ่ม Add New ยังใช้ Link ได้ เพราะมีสไตล์ที่ต่างกันอยู่แล้ว */}
          <Link
            to="/add"
            className="mt-4 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-100 to-blue-50 text-indigo-600 font-medium hover:from-indigo-200 hover:to-blue-100 transition"
          >
            <Plus size={16} /> Add New
          </Link>
        </nav>
      </div>

      <div className="px-4 pb-6">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-gray-500 hover:text-red-500"
        >
          <LogOut size={16} /> Log Out
        </button>
      </div>
    </div>
  );
}