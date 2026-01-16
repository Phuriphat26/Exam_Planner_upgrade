import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
// import Sidebar from "../components/Sidebar"; // 1. [FIX] คอมเมนต์ออก

export default function AdminDashboard() {
  const [liveStats, setLiveStats] = useState(null);
  const [logHistory, setLogHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // ฟังก์ชันสำหรับดึงข้อมูลสรุป
  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:5000/admin/summary', { withCredentials: true });
      setLiveStats(res.data.live_stats);
      setLogHistory(res.data.log_history);
      setError(null);
    } catch (err) {
      console.error('Fetch summary error:', err);
      setError('ไม่สามารถดึงข้อมูลสรุปได้ หรือคุณไม่มีสิทธิ์เข้าถึง');
      // ถ้าโดน 403 (Forbidden) ให้เด้งกลับหน้า login
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  // ดึงข้อมูลครั้งแรกเมื่อเปิดหน้า
  useEffect(() => {
    fetchSummary();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ฟังก์ชันสำหรับ "กดปุ่มสรุป" (สร้าง Log ใหม่)
  const handleCreateSummary = async () => {
    if (!window.confirm('คุณต้องการสร้างรายงานสรุปผล ณ เวลานี้หรือไม่?')) {
      return;
    }
    try {
      await axios.post('http://localhost:5000/admin/create_summary', {}, { withCredentials: true });
      alert('สร้างรายงานสรุปผลสำเร็จ!');
      // ดึงข้อมูลใหม่เพื่ออัปเดตตาราง
      fetchSummary();
    } catch (err) {
      console.error('Create summary error:', err);
      alert('เกิดข้อผิดพลาดในการสร้างรายงานสรุปผล');
    }
  };

  // --- ⭐️ 1. เพิ่มฟังก์ชัน Logout ---
  const handleLogout = async () => {
    if (!window.confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
      return;
    }
    try {
      // (เราจะเรียกใช้ /logout/ ที่อยู่ในไฟล์ login_routes.py)
      await axios.post('http://localhost:5000/login/logout', {}, { withCredentials: true });
      alert('ออกจากระบบสำเร็จ');
      navigate('/login'); // เด้งกลับไปหน้า Login
    } catch (err) {
      console.error('Logout error:', err);
      alert('เกิดข้อผิดพลาดในการออกจากระบบ');
    }
  };

  if (loading) {
    return <div className="p-8">กำลังโหลด...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      
      {/* <Sidebar /> */}

      <div className="max-w-7xl mx-auto">
        
        {/* --- ⭐️ 2. แก้ไข Header ให้มีปุ่ม Logout --- */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">
            Admin Dashboard (หน้าสรุปผล)
          </h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            ออกจากระบบ
          </button>
        </div>
        {/* -------------------------------------- */}

        {/* ส่วนที่ 1: สถิติ ณ ปัจจุบัน (Live Stats) */}
        <div className="mb-8">
          {/* ... existing code ... */}
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">สถิติ ณ ปัจจุบัน (Live)</h2>
          {liveStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="ผู้ใช้ทั้งหมด (User)" value={liveStats.total_users} />
              <StatCard title="แอดมิน (Admin)" value={liveStats.total_admins} />
              <StatCard title="แผนการสอบ (Plans)" value={liveStats.total_plans} />
              <StatCard title="วิชา (Subjects)" value={liveStats.total_subjects} />
            </div>
          )}
        </div>

        {/* ส่วนที่ 2: ประวัติการสรุปผล (Log History) */}
        <div>
          {/* ... existing code ... */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-700">ประวัติการสรุปผล</h2>
            <button
              onClick={handleCreateSummary}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              + สร้างรายงานสรุป (กดสรุป)
            </button>
          </div>
          
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">แอดมินที่สร้าง</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Users</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Plans</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Subjects</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logHistory.length > 0 ? (
                  logHistory.map((log) => (
                    <tr key={log._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(log.log_timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.admin_username || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.total_users}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.total_plans}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.total_subjects}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                      ยังไม่มีประวัติการสรุปผล
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

// Helper Component สำหรับการ์ดสถิติ
const StatCard = ({ title, value }) => (
  <div className="bg-white p-6 rounded-lg shadow-md">
    <p className="text-sm font-medium text-gray-500">{title}</p>
    <p className="text-3xl font-bold text-gray-800">{value}</p>
  </div>
);