import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
  async function fetchProfile() {
    try {
      const response = await fetch('http://localhost:5000/profile_bp/', {
        method: 'GET',
        credentials: 'include', // ส่ง cookie/session ไปด้วย
      });

      const data = await response.json();
      console.log(data);

      if (response.status === 401) {
        navigate('/login');
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }

  fetchProfile();
}, [navigate]);

  if (loading) return <div>กำลังโหลดข้อมูล...</div>;

  if (!profile) return <div>ไม่พบข้อมูลผู้ใช้</div>;

  return (
    <div>
      <h2>ข้อมูลโปรไฟล์</h2>
      <p><strong>Username:</strong> {profile.username}</p>
      <p><strong>Email:</strong> {profile.email || '-'}</p>
      {/* เพิ่มข้อมูลอื่น ๆ ตามต้องการ */}
    </div>
  );
}

export default ProfilePage;
