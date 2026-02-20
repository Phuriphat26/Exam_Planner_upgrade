import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import PreDetail from "./pages/PreDetail";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import AddNew from "./pages/AddNew";
import Profile from "./pages/Profile";
import Subject from './pages/Subject';
import ExamPlanDetail from './pages/ExamPlanDetail';
import Calendar from "./pages/Calendar";
import ExamPlanList from './pages/ExamPlanList';
import './index.css';
import Timer from "./pages/Time";
import ExamPlannerEdit from "./pages/ExamPlannerEdit";
import Subjectedit from "./pages/Subjectedit";
import Admin from "./pages/Admin";
import DayDetailPage from "./pages/DayDetailPage"; 

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PreDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/home" element={<Home />} />
        
        {/* Route for adding new item */}
        <Route path="/Admin" element={<Admin/>} /> 
    
        <Route path="/add" element={<AddNew />} />
        
        <Route path="/Profile" element={<Profile />} />
        <Route path="/subject" element={<Subject />} />
        
        {/* Route นี้สำหรับ "ดูรายละเอียดแผนสอบ" */}
        <Route path="/exam-plan/:id" element={<ExamPlanDetail />} />
        
        <Route path="/Calendar" element={<Calendar />} />
        
        {/* [NEW] Route สำหรับหน้ารายละเอียดประจำวัน (To-Do List & Schedule) */}
        <Route path="/schedule/day/:date" element={<DayDetailPage />} />

        <Route path="/ExamPlanList" element={<ExamPlanList />} />
        <Route path="/time" element={<Timer />} />
        
        {/* Route แก้ไขแผนสอบ */}
        <Route path="/exam-planner/edit/:planId" element={<ExamPlannerEdit />}/>
        <Route path="/course-planner/edit" element={<Subjectedit />} />
        
      </Routes>
    </Router>
  );
}

export default App;