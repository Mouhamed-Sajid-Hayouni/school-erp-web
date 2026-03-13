import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Users, BookOpen, Home, X, Trash2, Edit2, Shield, GraduationCap, PlusCircle, Book, LayoutGrid, Calendar, ClipboardCheck, Award, LineChart, FileDown } from 'lucide-react';

// --- THE PDF FIX IS HERE ---
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // Modern Vite Import!

export default function Dashboard() {
  const navigate = useNavigate();
  const role = localStorage.getItem('role') || 'STUDENT';
  const isAdmin = role === 'ADMIN'; 
  const isTeacher = role === 'TEACHER';
  const isStudent = role === 'STUDENT';
  const isParent = role === 'PARENT';

  const[activeTab, setActiveTab] = useState((isStudent || isParent) ? 'my-portal' : 'home'); 
  const [stats, setStats] = useState({ totalUsers: 0, totalTeachers: 0, totalStudents: 0, totalAdmins: 0 });
  const [portalData, setPortalData] = useState<any>(null); 
  
  const[userList, setUserList] = useState<any[]>([]);
  const[teacherList, setTeacherList] = useState<any[]>([]); 
  const[classList, setClassList] = useState<any[]>([]);
  const[subjectList, setSubjectList] = useState<any[]>([]);
  const[scheduleList, setScheduleList] = useState<any[]>([]);

  const[isUserModalOpen, setIsUserModalOpen] = useState(false);
  const[userFormData, setUserFormData] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'TEACHER', classId: '', studentUserId: '' });
  const[isEditModalOpen, setIsEditModalOpen] = useState(false);
  const[editFormData, setEditFormData] = useState({ id: '', firstName: '', lastName: '', email: '' });
  const[selectedClass, setSelectedClass] = useState<any>(null);
  const[isClassModalOpen, setIsClassModalOpen] = useState(false);
  const[classFormData, setClassFormData] = useState({ name: '', academicYear: '2025-2026' });
  const[isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const[subjectFormData, setSubjectFormData] = useState({ name: '', coefficient: 1 });
  const[isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const[scheduleFormData, setScheduleFormData] = useState({ classId: '', subjectId: '', teacherId: '', dayOfWeek: 'Lundi', startTime: '08:00', endTime: '10:00' });

  const[attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]); 
  const[selectedScheduleId, setSelectedScheduleId] = useState('');
  const[attendanceRecords, setAttendanceRecords] = useState<any>({}); 

  const[selectedGradeClassId, setSelectedGradeClassId] = useState('');
  const[selectedGradeSubjectId, setSelectedGradeSubjectId] = useState('');
  const[gradeStudentsList, setGradeStudentsList] = useState<any[]>([]);
  const[isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const[currentGradingStudent, setCurrentGradingStudent] = useState<any>(null);
  const[gradeFormData, setGradeFormData] = useState({ examType: 'Devoir de Contrôle N°1', score: '', comments: '' });

  const handleLogout = () => { localStorage.removeItem('token'); localStorage.removeItem('role'); navigate('/'); };

  const fetchUsers = () => fetch('https://school-erp-api-3l16.onrender.com/api/users', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).then(res => res.json()).then(data => { if (!data.error) setUserList(data); }).catch(console.error);
  const fetchClasses = () => fetch('https://school-erp-api-3l16.onrender.com/api/classes', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).then(res => res.json()).then(data => { if (!data.error) setClassList(data); }).catch(console.error);
  const fetchStats = () => fetch('https://school-erp-api-3l16.onrender.com/api/stats', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).then(res => res.json()).then(data => { if (!data.error) setStats(data); }).catch(console.error);
  const fetchSubjects = () => fetch('https://school-erp-api-3l16.onrender.com/api/subjects', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).then(res => res.json()).then(data => { if (!data.error) setSubjectList(data); }).catch(console.error);
  const fetchTeachers = () => fetch('https://school-erp-api-3l16.onrender.com/api/teachers', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).then(res => res.json()).then(data => { if (!data.error) setTeacherList(data); }).catch(console.error);
  const fetchSchedules = () => fetch('https://school-erp-api-3l16.onrender.com/api/schedules', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).then(res => res.json()).then(data => { if (!data.error) setScheduleList(data); }).catch(console.error);
  const fetchPortalData = () => fetch('https://school-erp-api-3l16.onrender.com/api/my-portal', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).then(res => res.json()).then(data => { if (!data.error) setPortalData(data); }).catch(console.error);

  useEffect(() => { if (isAdmin || isTeacher) { fetchClasses(); fetchUsers(); fetchSubjects(); fetchTeachers(); fetchSchedules(); } },[]);

  useEffect(() => {
    if (activeTab === 'home' && isAdmin) fetchStats();
    if (activeTab === 'users' && isAdmin) fetchUsers();
    if (activeTab === 'classes' && (isAdmin || isTeacher)) fetchClasses();
    if (activeTab === 'subjects' && isAdmin) fetchSubjects();
    if (activeTab === 'schedules' && (isAdmin || isTeacher)) fetchSchedules(); 
    if (activeTab === 'my-portal' && (isStudent || isParent)) fetchPortalData(); 
  },[activeTab]);

  useEffect(() => {
    if (selectedScheduleId && attendanceDate) {
      fetch(`https://school-erp-api-3l16.onrender.com/api/attendance/${selectedScheduleId}?date=${attendanceDate}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
      .then(res => res.json()).then(data => { if (!data.error) { const loadedRecords: any = {}; data.forEach((record: any) => { loadedRecords[record.studentId] = record.status; }); setAttendanceRecords(loadedRecords); }});
    } else { setAttendanceRecords({}); }
  },[selectedScheduleId, attendanceDate]);
  const markAttendance = async (studentId: string, status: string) => { setAttendanceRecords({ ...attendanceRecords,[studentId]: status }); try { await fetch('https://school-erp-api-3l16.onrender.com/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify({ studentId, scheduleId: selectedScheduleId, status, date: attendanceDate }) }); } catch (err) { console.error("Failed to save"); } };

  const fetchGrades = () => {
    if (!selectedGradeClassId || !selectedGradeSubjectId) return;
    fetch(`https://school-erp-api-3l16.onrender.com/api/grades/${selectedGradeClassId}/${selectedGradeSubjectId}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).then(res => res.json()).then(data => { if (!data.error) setGradeStudentsList(data); }).catch(console.error);
  };
  useEffect(() => { fetchGrades(); },[selectedGradeClassId, selectedGradeSubjectId]);

  const handleSaveGrade = async (e: React.FormEvent) => { e.preventDefault(); try { const response = await fetch('https://school-erp-api-3l16.onrender.com/api/grades', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify({ studentId: currentGradingStudent.id, subjectId: selectedGradeSubjectId, examType: gradeFormData.examType, score: gradeFormData.score, comments: gradeFormData.comments }) }); if (response.ok) { setIsGradeModalOpen(false); setGradeFormData({ examType: 'Devoir de Contrôle N°1', score: '', comments: '' }); fetchGrades(); } else alert(`Error: ${(await response.json()).error}`); } catch (err) { alert("Failed to connect to the server."); } };

  // --- NEW MAGIC: GENERATE PDF (WITH SAFTEY CATCH!) ---
  const generatePDFBulletin = (student: any) => {
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text("RÉPUBLIQUE TUNISIENNE", 105, 20, { align: "center" });
      doc.setFontSize(14);
      doc.text("MINISTÈRE DE L'ÉDUCATION", 105, 28, { align: "center" });
      doc.setFontSize(22);
      doc.setTextColor(37, 99, 235); 
      doc.text("BULLETIN DE NOTES", 105, 45, { align: "center" });

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.text(`Élève: ${student.user.firstName} ${student.user.lastName}`, 20, 65);
      doc.text(`Classe: ${student.class?.name || 'N/A'}`, 20, 73);
      doc.text(`Année Scolaire: ${student.class?.academicYear || '2025-2026'}`, 130, 73);

      let totalPoints = 0;
      let totalCoefs = 0;

      const tableData = student.grades.map((g: any) => {
        const coef = g.subject.coefficient || 1;
        const total = g.score * coef;
        totalPoints += total;
        totalCoefs += coef;
        return[ g.subject.name, g.examType, coef.toString(), g.score.toFixed(2), total.toFixed(2), g.comments || "Bien" ];
      });

      const moyenneGenerale = totalCoefs > 0 ? (totalPoints / totalCoefs).toFixed(2) : "0.00";

      // THE FIX IS HERE: We call autoTable directly!
      autoTable(doc, {
        startY: 85,
        head: [['Matière', 'Examen', 'Coef', 'Note / 20', 'Total', 'Appréciations']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor:[37, 99, 235] },
        styles: { fontSize: 10 }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      
      doc.setFillColor(239, 246, 255); 
      doc.rect(120, finalY - 8, 70, 15, 'F');
      doc.text(`MOYENNE: ${moyenneGenerale} / 20`, 125, finalY);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'italic');
      doc.text("Le Directeur,", 150, finalY + 30);

      doc.save(`Bulletin_${student.user.firstName}_${student.user.lastName}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Error generating PDF! Check the console or make sure jspdf is installed.");
    }
  };

  const handleAddSchedule = async (e: React.FormEvent) => { e.preventDefault(); try { const response = await fetch('https://school-erp-api-3l16.onrender.com/api/schedules', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify(scheduleFormData) }); if (response.ok) { setIsScheduleModalOpen(false); fetchSchedules(); } } catch (err) {} };
  const handleDeleteSchedule = async (id: string) => { if (!window.confirm(`Delete?`)) return; try { const response = await fetch(`https://school-erp-api-3l16.onrender.com/api/schedules/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }}); if (response.ok) fetchSchedules(); } catch (err) {} };
  const handleAddSubject = async (e: React.FormEvent) => { e.preventDefault(); try { const response = await fetch('https://school-erp-api-3l16.onrender.com/api/subjects', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify(subjectFormData) }); if (response.ok) { setIsSubjectModalOpen(false); fetchSubjects(); } } catch (err) {} };
  const handleDeleteSubject = async (id: string) => { if (!window.confirm(`Delete?`)) return; try { const response = await fetch(`https://school-erp-api-3l16.onrender.com/api/subjects/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }}); if (response.ok) fetchSubjects(); } catch (err) {} };
  const handleViewClass = (clsId: string) => { fetch(`https://school-erp-api-3l16.onrender.com/api/classes/${clsId}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }}).then(res => res.json()).then(data => setSelectedClass(data)); };
  const handleDeleteClass = async (id: string) => { if (!window.confirm(`Delete?`)) return; try { const response = await fetch(`https://school-erp-api-3l16.onrender.com/api/classes/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }}); if (response.ok) fetchClasses(); } catch (err) {} };
  const handleAddClass = async (e: React.FormEvent) => { e.preventDefault(); try { const response = await fetch('https://school-erp-api-3l16.onrender.com/api/classes', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify(classFormData) }); if (response.ok) { setIsClassModalOpen(false); fetchClasses(); } } catch (err) {} };
  const handleDeleteUser = async (id: string) => { if (!window.confirm(`Delete?`)) return; try { const response = await fetch(`https://school-erp-api-3l16.onrender.com/api/users/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }}); if (response.ok) { fetchUsers(); fetchClasses(); fetchStats(); } } catch (err) {} };
  const handleAddUser = async (e: React.FormEvent) => { e.preventDefault(); try { const response = await fetch('https://school-erp-api-3l16.onrender.com/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify(userFormData) }); if (response.ok) { setIsUserModalOpen(false); setUserFormData({ firstName: '', lastName: '', email: '', password: '', role: 'TEACHER', classId: '', studentUserId: '' }); fetchUsers(); fetchClasses(); fetchTeachers(); } } catch (err) {} };
  const openEditModal = (user: any) => { setEditFormData({ id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email }); setIsEditModalOpen(true); };
  const handleEditUser = async (e: React.FormEvent) => { e.preventDefault(); try { const response = await fetch(`https://school-erp-api-3l16.onrender.com/api/users/${editFormData.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify({ firstName: editFormData.firstName, lastName: editFormData.lastName, email: editFormData.email }) }); if (response.ok) { setIsEditModalOpen(false); fetchUsers(); } } catch (err) {} };

  const renderStudentPortal = (studentData: any) => (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div>
          <h2 className="text-2xl font-bold mb-2">My Progress Dashboard</h2>
          <p className="text-blue-100">Welcome back, {studentData.user.firstName}! Here is your latest school data.</p>
        </div>
        <div className="text-right">
          <p className="text-blue-200 text-sm">Current Class</p>
          <h3 className="text-xl font-bold">{studentData.class?.name || "Not Assigned"}</h3>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center space-x-2 mb-4 text-purple-600">
          <Calendar size={24} /> <h3 className="text-lg font-bold text-gray-800">Weekly Timetable</h3>
        </div>
        {!studentData.class || studentData.class.schedules.length === 0 ? (
          <p className="text-gray-500 italic">No classes scheduled yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {studentData.class.schedules.map((sched: any) => (
              <div key={sched.id} className="p-4 bg-purple-50 rounded-lg border border-purple-100 flex items-start space-x-4">
                <div className="bg-purple-600 text-white px-3 py-1 rounded-lg text-center min-w-[70px]">
                  <p className="font-bold text-sm">{sched.dayOfWeek}</p>
                </div>
                <div>
                  <p className="font-bold text-gray-800">{sched.subject.name}</p>
                  <p className="text-sm text-gray-500">{sched.startTime} - {sched.endTime}</p>
                  <p className="text-xs text-gray-400 mt-1">Prof. {sched.teacher.user.lastName}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 text-blue-600">
              <Award size={24} /> <h3 className="text-lg font-bold text-gray-800">My Grades</h3>
            </div>
            {/* Download PDF Button! */}
            <button 
              onClick={() => generatePDFBulletin(studentData)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition cursor-pointer"
            >
              <FileDown size={16} /> Download Bulletin
            </button>
          </div>
          {studentData.grades.length === 0 ? (
            <p className="text-gray-500 italic">No grades published yet.</p>
          ) : (
            <div className="space-y-3">
              {studentData.grades.map((g: any) => (
                <div key={g.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div><p className="font-bold text-gray-800">{g.subject.name}</p><p className="text-xs text-gray-500">{g.examType}</p></div>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-lg font-bold">{g.score} / 20</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-2 mb-4 text-red-500">
            <ClipboardCheck size={24} /> <h3 className="text-lg font-bold text-gray-800">Recent Absences</h3>
          </div>
          {studentData.attendances.filter((a: any) => a.status === 'ABSENT').length === 0 ? (
            <p className="text-gray-500 italic">Perfect attendance! No absences recorded.</p>
          ) : (
            <div className="space-y-3">
              {studentData.attendances.filter((a: any) => a.status === 'ABSENT').map((a: any) => (
                <div key={a.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <div><p className="font-bold text-red-800">{a.schedule.subject.name}</p><p className="text-xs text-red-500">{new Date(a.date).toLocaleDateString()}</p></div>
                  <span className="px-3 py-1 bg-red-200 text-red-800 rounded-lg font-bold text-sm">Absent</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      
      <aside className="w-64 bg-blue-800 text-white flex flex-col">
        <div className="p-6 text-2xl font-bold border-b border-blue-700">School ERP</div>
        <nav className="flex-1 p-4 space-y-2">
          {(isAdmin || isTeacher) && <button onClick={() => { setActiveTab('home'); setSelectedClass(null); }} className={`w-full flex items-center space-x-3 p-3 rounded-lg transition ${activeTab === 'home' ? 'bg-blue-700' : 'hover:bg-blue-700'}`}><Home size={20} /> <span>Home</span></button>}
          {(isStudent || isParent) && <button onClick={() => { setActiveTab('my-portal'); setSelectedClass(null); }} className={`w-full flex items-center space-x-3 p-3 rounded-lg transition ${activeTab === 'my-portal' ? 'bg-blue-700' : 'hover:bg-blue-700'}`}><LineChart size={20} /> <span>My Progress</span></button>}
          {isAdmin && <button onClick={() => { setActiveTab('users'); setSelectedClass(null); }} className={`w-full flex items-center space-x-3 p-3 rounded-lg transition ${activeTab === 'users' ? 'bg-blue-700' : 'hover:bg-blue-700'}`}><Users size={20} /> <span>Users</span></button>}
          {(isAdmin || isTeacher) && <button onClick={() => { setActiveTab('classes'); setSelectedClass(null); }} className={`w-full flex items-center space-x-3 p-3 rounded-lg transition ${activeTab === 'classes' ? 'bg-blue-700' : 'hover:bg-blue-700'}`}><LayoutGrid size={20} /> <span>Classes</span></button>}
          {isAdmin && <button onClick={() => { setActiveTab('subjects'); setSelectedClass(null); }} className={`w-full flex items-center space-x-3 p-3 rounded-lg transition ${activeTab === 'subjects' ? 'bg-blue-700' : 'hover:bg-blue-700'}`}><Book size={20} /> <span>Subjects</span></button>}
          {(isAdmin || isTeacher) && <button onClick={() => { setActiveTab('schedules'); setSelectedClass(null); }} className={`w-full flex items-center space-x-3 p-3 rounded-lg transition ${activeTab === 'schedules' ? 'bg-blue-700' : 'hover:bg-blue-700'}`}><Calendar size={20} /> <span>Schedules</span></button>}
          {(isAdmin || isTeacher) && <button onClick={() => { setActiveTab('attendance'); setSelectedClass(null); }} className={`w-full flex items-center space-x-3 p-3 rounded-lg transition ${activeTab === 'attendance' ? 'bg-blue-700' : 'hover:bg-blue-700'}`}><ClipboardCheck size={20} /> <span>Attendance</span></button>}
          {(isAdmin || isTeacher) && <button onClick={() => { setActiveTab('grades'); setSelectedClass(null); }} className={`w-full flex items-center space-x-3 p-3 rounded-lg transition ${activeTab === 'grades' ? 'bg-blue-700' : 'hover:bg-blue-700'}`}><Award size={20} /> <span>Grades</span></button>}
        </nav>
        <div className="p-4 border-t border-blue-700"><button onClick={handleLogout} className="flex items-center space-x-3 p-3 hover:bg-red-600 w-full rounded-lg transition text-left"><LogOut size={20} /> <span>Logout</span></button></div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto relative">
        <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800 capitalize">{activeTab.replace('-', ' ')} Dashboard</h1>
          <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-semibold flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> Role: {role}</div>
        </header>

        {activeTab === 'my-portal' && portalData && (
          <div>
            {isStudent && renderStudentPortal(portalData)}
            {isParent && (
              <div className="space-y-8">
                <h2 className="text-xl font-bold text-gray-800">My Children</h2>
                {portalData.children.length === 0 ? (<p className="text-gray-500">No children linked.</p>) : (portalData.children.map((child: any) => (<div key={child.id}>{renderStudentPortal(child)}</div>)))}
              </div>
            )}
          </div>
        )}

        {/* Existing Admin Views (Hidden for brevity but identical to previous steps) */}
        {activeTab === 'home' && isAdmin && (<div className="space-y-6"><div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100"><h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome back! 👋</h2></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"><div className="bg-white p-6 rounded-xl shadow-sm flex items-center space-x-4 border-l-4 border-l-blue-500"><div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><Users size={24} /></div><div><p className="text-sm text-gray-500">Total Users</p><h3 className="text-2xl font-bold text-gray-800">{stats.totalUsers}</h3></div></div><div className="bg-white p-6 rounded-xl shadow-sm flex items-center space-x-4 border-l-4 border-l-indigo-500"><div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg"><BookOpen size={24} /></div><div><p className="text-sm text-gray-500">Teachers</p><h3 className="text-2xl font-bold text-gray-800">{stats.totalTeachers}</h3></div></div><div className="bg-white p-6 rounded-xl shadow-sm flex items-center space-x-4 border-l-4 border-l-green-500"><div className="p-3 bg-green-100 text-green-600 rounded-lg"><GraduationCap size={24} /></div><div><p className="text-sm text-gray-500">Students</p><h3 className="text-2xl font-bold text-gray-800">{stats.totalStudents}</h3></div></div><div className="bg-white p-6 rounded-xl shadow-sm flex items-center space-x-4 border-l-4 border-l-purple-500"><div className="p-3 bg-purple-100 text-purple-600 rounded-lg"><Shield size={24} /></div><div><p className="text-sm text-gray-500">Admins</p><h3 className="text-2xl font-bold text-gray-800">{stats.totalAdmins}</h3></div></div></div></div>)}
        {activeTab === 'grades' && (<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-6"><h2 className="text-xl font-bold text-gray-800 mb-6">Gradebook (Les Notes)</h2><div className="grid grid-cols-2 gap-6 mb-8 bg-gray-50 p-4 rounded-xl border border-gray-200"><div><label className="block text-sm font-bold text-gray-700 mb-2">1. Select Class</label><select className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" value={selectedGradeClassId} onChange={e => setSelectedGradeClassId(e.target.value)}><option value="">-- Choose Class --</option>{classList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div><label className="block text-sm font-bold text-gray-700 mb-2">2. Select Subject</label><select className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" value={selectedGradeSubjectId} onChange={e => setSelectedGradeSubjectId(e.target.value)}><option value="">-- Choose Subject --</option>{subjectList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div></div>{selectedGradeClassId && selectedGradeSubjectId ? (<table className="w-full text-left border-collapse border border-gray-100"><thead><tr className="bg-blue-50 text-blue-800 text-sm border-b border-blue-100"><th className="p-4 font-bold">Student Name</th><th className="p-4 font-bold">Existing Grades</th><th className="p-4 font-bold text-right">Actions</th></tr></thead><tbody>{gradeStudentsList.length === 0 ? (<tr><td colSpan={3} className="p-8 text-center text-gray-500">No students are enrolled in this class.</td></tr>) : (gradeStudentsList.map(student => (<tr key={student.id} className="border-b border-gray-50 hover:bg-gray-50"><td className="p-4 font-medium text-gray-800">{student.user.firstName} {student.user.lastName}</td><td className="p-4 flex flex-wrap gap-2">{student.grades.length === 0 ? (<span className="text-gray-400 text-sm italic">No grades recorded yet.</span>) : (student.grades.map((g: any) => (<span key={g.id} className="px-3 py-1 bg-green-100 text-green-800 border border-green-200 rounded-lg text-sm font-bold shadow-sm">{g.examType}: {g.score}/20</span>)))}</td><td className="p-4 text-right"><button onClick={() => { setCurrentGradingStudent(student); setIsGradeModalOpen(true); }} className="px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 font-bold rounded-lg text-sm transition">+ Add Exam Grade</button></td></tr>)))}</tbody></table>) : (<div className="text-center p-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">Please select a class and a subject above to open the Gradebook.</div>)}</div>)}
        {activeTab === 'attendance' && (<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-6"><div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-gray-800">Track Attendance (L'Appel)</h2></div><div className="grid grid-cols-2 gap-6 mb-8 bg-gray-50 p-4 rounded-xl border border-gray-200"><div><label className="block text-sm font-bold text-gray-700 mb-2">1. Select a Scheduled Class</label><select className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" value={selectedScheduleId} onChange={e => setSelectedScheduleId(e.target.value)}><option value="">-- Choose Schedule --</option>{scheduleList.map(s => (<option key={s.id} value={s.id}>{s.class.name} - {s.subject.name} ({s.dayOfWeek} @ {s.startTime})</option>))}</select></div><div><label className="block text-sm font-bold text-gray-700 mb-2">2. Date</label><input type="date" className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} /></div></div>{selectedScheduleId && activeScheduleObj ? (<table className="w-full text-left border-collapse border border-gray-100"><thead><tr className="bg-blue-50 text-blue-800 text-sm border-b border-blue-100"><th className="p-4 font-bold">Student Name</th><th className="p-4 font-bold text-center">Status</th></tr></thead><tbody>{activeScheduleObj.class.students.length === 0 ? (<tr><td colSpan={2} className="p-8 text-center text-gray-500">No students are enrolled in this class yet!</td></tr>) : (activeScheduleObj.class.students.map((student: any) => {const currentStatus = attendanceRecords[student.id]; return (<tr key={student.id} className="border-b border-gray-50 hover:bg-gray-50"><td className="p-4 font-medium text-gray-800">{student.user.firstName} {student.user.lastName}</td><td className="p-4 flex justify-center space-x-2"><button onClick={() => markAttendance(student.id, 'PRESENT')} className={`px-4 py-2 text-sm font-bold rounded-lg transition ${currentStatus === 'PRESENT' ? 'bg-green-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-green-100'}`}>Present</button><button onClick={() => markAttendance(student.id, 'ABSENT')} className={`px-4 py-2 text-sm font-bold rounded-lg transition ${currentStatus === 'ABSENT' ? 'bg-red-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-red-100'}`}>Absent</button><button onClick={() => markAttendance(student.id, 'LATE')} className={`px-4 py-2 text-sm font-bold rounded-lg transition ${currentStatus === 'LATE' ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-orange-100'}`}>Late</button></td></tr>);}))}</tbody></table>) : (<div className="text-center p-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">Please select a schedule above to load the student list.</div>)}</div>)}
        {activeTab === 'schedules' && (<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><div className="p-6 border-b border-gray-100 flex justify-between items-center"><h2 className="text-xl font-bold text-gray-800">School Timetable</h2>{isAdmin && (<button onClick={() => setIsScheduleModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition cursor-pointer flex items-center gap-2"><PlusCircle size={18} /> Add Entry</button>)}</div><table className="w-full text-left border-collapse"><thead><tr className="bg-gray-50 text-gray-600 text-sm border-b"><th className="p-4">Class</th><th className="p-4">Subject</th><th className="p-4">Teacher</th><th className="p-4">Day</th><th className="p-4">Time</th>{isAdmin && <th className="p-4 text-right">Actions</th>}</tr></thead><tbody>{scheduleList.length === 0 ? (<tr><td colSpan={6} className="p-8 text-center text-gray-500">No schedules added yet.</td></tr>) : (scheduleList.map((sched) => (<tr key={sched.id} className="border-b hover:bg-gray-50"><td className="p-4 font-bold text-blue-600">{sched.class.name}</td><td className="p-4 font-medium text-gray-800">{sched.subject.name}</td><td className="p-4 text-gray-600">{sched.teacher.user.firstName} {sched.teacher.user.lastName}</td><td className="p-4 font-bold text-purple-600">{sched.dayOfWeek}</td><td className="p-4 text-gray-500">{sched.startTime} - {sched.endTime}</td>{isAdmin && (<td className="p-4 text-right"><button onClick={() => handleDeleteSchedule(sched.id)} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"><Trash2 size={18} /></button></td>)}</tr>)))}</tbody></table></div>)}
        {activeTab === 'classes' && (<div>{!selectedClass ? (<><div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-gray-800">Classes</h2>{isAdmin && (<button onClick={() => setIsClassModalOpen(true)} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition cursor-pointer"><PlusCircle size={18} /> <span>Create Class</span></button>)}</div>{classList.length === 0 ? (<div className="text-center bg-white p-12 rounded-xl border border-gray-200 text-gray-500">No classes found.</div>) : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{classList.map((cls) => (<div key={cls.id} onClick={() => handleViewClass(cls.id)} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition relative group cursor-pointer">{isAdmin && (<button onClick={(e) => { e.stopPropagation(); handleDeleteClass(cls.id, cls.name); }} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100 cursor-pointer z-10" title="Delete Class"><Trash2 size={20} /></button>)}<div className="flex justify-between items-start mb-4"><div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><BookOpen size={24} /></div><span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">{cls.academicYear}</span></div><h3 className="text-xl font-bold text-gray-800 mb-1">{cls.name}</h3><p className="text-gray-500 text-sm">Students Enrolled: <span className="font-bold text-blue-600">{cls._count?.students || 0}</span></p></div>))}</div>)}</>) : (<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><div className="p-6 border-b border-gray-100 flex justify-between items-center bg-blue-50"><div><button onClick={() => setSelectedClass(null)} className="text-blue-600 hover:underline text-sm font-semibold mb-2 flex items-center gap-1">← Back to all classes</button><h2 className="text-2xl font-bold text-gray-800">Class: {selectedClass.name}</h2><p className="text-gray-500 text-sm">Academic Year: {selectedClass.academicYear}</p></div><div className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">Total Students: {selectedClass.students.length}</div></div><table className="w-full text-left border-collapse"><thead><tr className="bg-gray-50 text-gray-600 text-sm border-b"><th className="p-4">First Name</th><th className="p-4">Last Name</th><th className="p-4">Student Email</th></tr></thead><tbody>{selectedClass.students.length === 0 ? (<tr><td colSpan={3} className="p-8 text-center text-gray-500">No students enrolled yet.</td></tr>) : (selectedClass.students.map((student: any) => (<tr key={student.id} className="border-b hover:bg-gray-50"><td className="p-4 font-medium text-gray-800">{student.user.firstName}</td><td className="p-4 font-medium text-gray-800">{student.user.lastName}</td><td className="p-4 text-gray-600">{student.user.email}</td></tr>)))}</tbody></table></div>)}</div>)}
        {activeTab === 'subjects' && (<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><div className="p-6 border-b border-gray-100 flex justify-between items-center"><h2 className="text-xl font-bold text-gray-800">Manage Subjects</h2><button onClick={() => setIsSubjectModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition cursor-pointer flex items-center gap-2"><PlusCircle size={18} /> Add Subject</button></div><table className="w-full text-left border-collapse"><thead><tr className="bg-gray-50 text-gray-600 text-sm border-b"><th className="p-4">Subject Name</th><th className="p-4">Coefficient</th><th className="p-4 text-right">Actions</th></tr></thead><tbody>{subjectList.length === 0 ? (<tr><td colSpan={3} className="p-8 text-center text-gray-500">No subjects added yet.</td></tr>) : (subjectList.map((subject) => (<tr key={subject.id} className="border-b hover:bg-gray-50"><td className="p-4 font-medium text-gray-800">{subject.name}</td><td className="p-4"><span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">x {subject.coefficient}</span></td><td className="p-4 text-right"><button onClick={() => handleDeleteSubject(subject.id, subject.name)} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"><Trash2 size={18} /></button></td></tr>)))}</tbody></table></div>)}
        {activeTab === 'users' && (<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><div className="p-6 border-b border-gray-100 flex justify-between items-center"><h2 className="text-xl font-bold text-gray-800">System Users</h2><button onClick={() => setIsUserModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition cursor-pointer">+ Add New User</button></div><table className="w-full text-left border-collapse"><thead><tr className="bg-gray-50 text-gray-600 text-sm border-b"><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Role</th><th className="p-4 text-right">Actions</th></tr></thead><tbody>{userList.map((user) => (<tr key={user.id} className="border-b hover:bg-gray-50"><td className="p-4 font-medium text-gray-800">{user.firstName} {user.lastName}</td><td className="p-4 text-gray-600">{user.email}</td><td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-bold ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : user.role === 'TEACHER' ? 'bg-blue-100 text-blue-700' : user.role === 'PARENT' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{user.role}</span></td><td className="p-4 text-right flex justify-end space-x-2"><button onClick={() => openEditModal(user)} className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition" title="Edit User"><Edit2 size={18} /></button><button onClick={() => handleDeleteUser(user.id, user.firstName)} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition" title="Delete User"><Trash2 size={18} /></button></td></tr>))}</tbody></table></div>)}

        {/* MODALS */}
        {isGradeModalOpen && currentGradingStudent && (<div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"><div className="p-6 border-b flex justify-between items-center bg-blue-50"><h2 className="text-xl font-bold text-blue-800">Grade: {currentGradingStudent.user.firstName}</h2><button onClick={() => setIsGradeModalOpen(false)} className="text-gray-400 hover:text-red-500"><X size={24} /></button></div><form onSubmit={handleSaveGrade} className="p-6 space-y-4"><div><label className="block text-sm font-bold text-gray-700 mb-1">Exam Type</label><select required className="w-full px-4 py-2 border rounded-lg bg-white" value={gradeFormData.examType} onChange={e => setGradeFormData({...gradeFormData, examType: e.target.value})}><option value="Devoir de Contrôle N°1">Devoir de Contrôle N°1</option><option value="Devoir de Contrôle N°2">Devoir de Contrôle N°2</option><option value="Devoir de Synthèse">Devoir de Synthèse</option><option value="Oral / TP">Oral / TP</option></select></div><div><label className="block text-sm font-bold text-gray-700 mb-1">Score (out of 20)</label><input type="number" step="0.25" min="0" max="20" required placeholder="e.g. 15.5" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-xl font-bold text-blue-600" value={gradeFormData.score} onChange={e => setGradeFormData({...gradeFormData, score: e.target.value})} /></div><div><label className="block text-sm font-bold text-gray-700 mb-1">Comments</label><input type="text" className="w-full px-4 py-2 border rounded-lg" value={gradeFormData.comments} onChange={e => setGradeFormData({...gradeFormData, comments: e.target.value})} /></div><div className="pt-4 flex justify-end space-x-3"><button type="button" onClick={() => setIsGradeModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg shadow-md">Save Grade</button></div></form></div></div>)}
        {isUserModalOpen && (<div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"><div className="p-6 border-b flex justify-between items-center"><h2 className="text-xl font-bold">Add New User</h2><button onClick={() => setIsUserModalOpen(false)} className="text-gray-400 hover:text-red-500"><X size={24} /></button></div><form onSubmit={handleAddUser} className="p-6 space-y-4"><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">First Name</label><input type="text" required className="w-full px-4 py-2 border rounded-lg" value={userFormData.firstName} onChange={e => setUserFormData({...userFormData, firstName: e.target.value})} /></div><div><label className="block text-sm font-medium mb-1">Last Name</label><input type="text" required className="w-full px-4 py-2 border rounded-lg" value={userFormData.lastName} onChange={e => setUserFormData({...userFormData, lastName: e.target.value})} /></div></div><div><label className="block text-sm font-medium mb-1">Email</label><input type="email" required className="w-full px-4 py-2 border rounded-lg" value={userFormData.email} onChange={e => setUserFormData({...userFormData, email: e.target.value})} /></div><div><label className="block text-sm font-medium mb-1">Password</label><input type="password" required className="w-full px-4 py-2 border rounded-lg" value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} /></div><div><label className="block text-sm font-medium mb-1">Role</label><select className="w-full px-4 py-2 border rounded-lg" value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value, classId: '', studentUserId: ''})}><option value="TEACHER">Teacher</option><option value="STUDENT">Student</option><option value="PARENT">Parent</option><option value="ADMIN">Admin</option></select></div>{userFormData.role === 'STUDENT' && (<div><label className="block text-sm font-medium mb-1 text-blue-600">Assign to Class</label><select required className="w-full px-4 py-2 border border-blue-300 rounded-lg bg-blue-50" value={userFormData.classId} onChange={e => setUserFormData({...userFormData, classId: e.target.value})}><option value="">-- Select a Class --</option>{classList.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}</select></div>)}{userFormData.role === 'PARENT' && (<div><label className="block text-sm font-medium mb-1 text-orange-600">Link to Child</label><select required className="w-full px-4 py-2 border border-orange-300 rounded-lg bg-orange-50" value={userFormData.studentUserId} onChange={e => setUserFormData({...userFormData, studentUserId: e.target.value})}><option value="">-- Select Child --</option>{userList.filter(u=>u.role==='STUDENT').map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}</select></div>)}<div className="pt-4 flex justify-end space-x-3"><button type="button" onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Save</button></div></form></div></div>)}
        {isSubjectModalOpen && (<div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"><div className="p-6 border-b flex justify-between items-center"><h2 className="text-xl font-bold">Add Subject</h2><button onClick={() => setIsSubjectModalOpen(false)} className="text-gray-400 hover:text-red-500"><X size={24} /></button></div><form onSubmit={handleAddSubject} className="p-6 space-y-4"><div><label className="block text-sm font-medium mb-1">Subject Name</label><input type="text" required className="w-full px-4 py-2 border rounded-lg" value={subjectFormData.name} onChange={e => setSubjectFormData({...subjectFormData, name: e.target.value})} /></div><div><label className="block text-sm font-medium mb-1">Coefficient</label><input type="number" step="0.5" min="1" required className="w-full px-4 py-2 border rounded-lg" value={subjectFormData.coefficient} onChange={e => setSubjectFormData({...subjectFormData, coefficient: parseFloat(e.target.value)})} /></div><div className="pt-4 flex justify-end space-x-3"><button type="button" onClick={() => setIsSubjectModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Save</button></div></form></div></div>)}
        {isEditModalOpen && (<div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"><div className="p-6 border-b flex justify-between items-center"><h2 className="text-xl font-bold text-blue-600">Edit User</h2><button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-red-500"><X size={24} /></button></div><form onSubmit={handleEditUser} className="p-6 space-y-4"><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">First Name</label><input type="text" required className="w-full px-4 py-2 border rounded-lg" value={editFormData.firstName} onChange={e => setEditFormData({...editFormData, firstName: e.target.value})} /></div><div><label className="block text-sm font-medium mb-1">Last Name</label><input type="text" required className="w-full px-4 py-2 border rounded-lg" value={editFormData.lastName} onChange={e => setEditFormData({...editFormData, lastName: e.target.value})} /></div></div><div><label className="block text-sm font-medium mb-1">Email</label><input type="email" required className="w-full px-4 py-2 border rounded-lg" value={editFormData.email} onChange={e => setEditFormData({...editFormData, email: e.target.value})} /></div><div className="pt-4 flex justify-end space-x-3"><button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button><button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg">Update</button></div></form></div></div>)}
        {isClassModalOpen && (<div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"><div className="p-6 border-b flex justify-between items-center"><h2 className="text-xl font-bold">Create Class</h2><button onClick={() => setIsClassModalOpen(false)} className="text-gray-400 hover:text-red-500"><X size={24} /></button></div><form onSubmit={handleAddClass} className="p-6 space-y-4"><div><label className="block text-sm font-medium mb-1">Class Name</label><input type="text" required className="w-full px-4 py-2 border rounded-lg" value={classFormData.name} onChange={e => setClassFormData({...classFormData, name: e.target.value})} /></div><div><label className="block text-sm font-medium mb-1">Academic Year</label><select className="w-full px-4 py-2 border rounded-lg" value={classFormData.academicYear} onChange={e => setClassFormData({...classFormData, academicYear: e.target.value})}><option value="2025-2026">2025-2026</option><option value="2026-2027">2026-2027</option></select></div><div className="pt-4 flex justify-end space-x-3"><button type="button" onClick={() => setIsClassModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Save</button></div></form></div></div>)}
      </main>
    </div>
  );
}