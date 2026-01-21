import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

const SHEET_ID = '1u0W0dFKqTdMorfC2-wBmn5jvBf4HpYfPBNyo4Xq1cUk';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzWYutsC7wlaeZW8upJ0EZLPx3QTGarp1l_0OuqsNrVX5RJwTSB6f6DLr31fwKNmkyC/exec';

export default function AttendanceDashboard() {
  const [activeTab, setActiveTab] = useState('edit-attendance');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hideNav, setHideNav] = useState(false);
  const [studentRoster, setStudentRoster] = useState([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('quick') === 'true') {
      setHideNav(true);
      setSidebarOpen(false);
    }
    fetchStudentRoster();
  }, []);

  const fetchStudentRoster = async () => {
    try {
      const sheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=80330815`;
      const response = await fetch(sheetUrl);
      const csv = await response.text();

      const lines = csv.trim().split('\n');
      const rosterData = lines.slice(1).map((line, idx) => {
        const values = line.split(',');
        return {
          id: idx,
          studentId: values[0] || '',
          grade: values[1] || '',
          lastName: values[2] || '',
          firstName: values[3] || '',
          fullName: values[4] || '',
          division: values[5] || '',
        };
      });

      setStudentRoster(rosterData);
      console.log('Student Roster loaded:', rosterData);
    } catch (error) {
      console.error('Error fetching student roster:', error);
    }
  };

  const navItems = [
    { id: 'attendance', label: '📋 Attendance' },
    { id: 'edit-attendance', label: '✏️ Edit Attendance' },
    { id: 'upcoming', label: '📅 Upcoming Today' },
    { id: 'overview', label: '📊 Overview' },
    { id: 'parents-entries', label: '👨‍👩‍👧 Parents Entries' },
    { id: 'notes', label: '📝 Notes & Reminders' },
    { id: 'total-attendance', label: '📈 Total Attendance' },
  ];

  return (
    <div className="flex h-screen bg-white">
      {!hideNav && (
        <div className="flex">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="fixed top-4 left-4 z-50 md:hidden bg-white border border-gray-300 p-2 rounded-lg"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div
            className={`${
              sidebarOpen ? 'w-56' : 'w-0'
            } bg-green-50 border-r-4 border-green-600 transition-all duration-300 overflow-hidden flex flex-col`}
          >
            <div className="p-6 border-b border-green-200">
              <h1 className="text-xl font-bold text-green-800">Attendance</h1>
              <p className="text-sm text-green-600">Management System</p>
            </div>

            <nav className="flex-1 p-4 space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                    activeTab === item.id
                      ? 'bg-green-100 text-green-800 border-l-4 border-green-600'
                      : 'text-green-700 hover:bg-green-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="p-4 border-t border-green-200 text-xs text-green-600">
              <p>v1.0 Beta</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {activeTab === 'edit-attendance' && <EditAttendance hideNav={hideNav} />}
        {activeTab === 'attendance' && <ManualAttendance studentRoster={studentRoster} />}
        {activeTab === 'upcoming' && <UpcomingToday />}
        {activeTab === 'overview' && <Overview />}
        {activeTab === 'parents-entries' && <ParentsEntries />}
        {activeTab === 'notes' && <NotesReminders />}
        {activeTab === 'total-attendance' && <TotalAttendance />}
      </div>
    </div>
  );
}

function ManualAttendance({ studentRoster }) {
  const [step, setStep] = useState('selection');
  const [division, setDivision] = useState('BCM');
  const [isMinyan, setIsMinyan] = useState(false);
  const [selectedGrades, setSelectedGrades] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:45');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const minyanGrades = ['6b', '7b', '8b'];

  const getGradeOptions = () => {
    if (division === 'OM' && isMinyan) {
      // Get minyan grades from student roster
      const minyanStudents = [...new Set(
        studentRoster
          .filter(s => s.division === division && minyanGrades.includes(s.grade.toLowerCase()))
          .map(s => s.grade)
      )].sort();
      return minyanStudents.length > 0 ? minyanStudents : minyanGrades;
    }

    // Get unique grades from student roster for this division
    const uniqueGrades = [...new Set(
      studentRoster
        .filter(s => s.division === division)
        .map(s => s.grade)
    )].sort((a, b) => {
      // Sort by grade number first (4, 5, 6, 7, 8), then by letter (a, b, c)
      const aNum = parseInt(a);
      const aLetter = a.replace(/\d/g, '').toLowerCase();
      const bNum = parseInt(b);
      const bLetter = b.replace(/\d/g, '').toLowerCase();

      if (aNum !== bNum) return aNum - bNum;
      return aLetter.localeCompare(bLetter);
    });

    return uniqueGrades.length > 0 ? uniqueGrades : [];
  };

  const grades = getGradeOptions();

  useEffect(() => {
    const date = new Date(currentDate);
    const day = date.getDay();
    const isSunday = day === 0;

    if (isMinyan) {
      setStartTime(isSunday ? '08:15' : '07:30');
    } else {
      setStartTime(isSunday ? '09:45' : '08:45');
    }
  }, [isMinyan, currentDate]);

  const handleDivisionChange = (newDivision) => {
    setDivision(newDivision);
    setSelectedGrades([]);
    setAttendance({});
  };

  const handleGradeToggle = (grade) => {
    setSelectedGrades(prev =>
      prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]
    );
  };

  const handleCheckAttendance = async () => {
    if (selectedGrades.length === 0) {
      setError('Please select at least one grade');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const studentsList = studentRoster.filter(
        s => selectedGrades.includes(s.grade) && s.division === division
      );

      if (studentsList.length === 0) {
        setError('No students found for selected grades');
        setLoading(false);
        return;
      }

      const initialAttendance = {};
      studentsList.forEach(s => {
        initialAttendance[s.studentId] = null;
      });
      setAttendance(initialAttendance);
      setStep('marking');
    } catch (err) {
      setError('Error loading students. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const markGradeAsOnTime = (gradeToMark) => {
    const studentsList = studentRoster.filter(
      s => selectedGrades.includes(s.grade) && s.division === division && s.grade === gradeToMark
    );

    const updated = { ...attendance };
    studentsList.forEach(s => {
      updated[s.studentId] = 'Yes';
    });
    setAttendance(updated);
  };

  const toggleStudent = (studentId) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'Yes' ? 'No' : (prev[studentId] === 'No' ? null : 'Yes')
    }));
  };

  const allMarked = Object.values(attendance).every(v => v !== null);

  const handleSubmit = async () => {
    if (!allMarked) {
      setError('Please mark all students');
      return;
    }

    setLoading(true);
    try {
      const studentsList = studentRoster.filter(
        s => selectedGrades.includes(s.grade) && s.division === division
      );

      // Determine school end time based on day of week
      const date = new Date(currentDate);
      const day = date.getDay();
      let schoolEndTime = '16:00';
      if (day === 5) schoolEndTime = '12:30'; // Friday
      if (day === 0) schoolEndTime = '13:00'; // Sunday

      // Build rows to append
      const rows = studentsList.map(student => {
        const isHere = attendance[student.studentId] === 'Yes';
        return [
          student.studentId,
          student.division,
          currentDate,
          student.grade,
          student.fullName,
          isHere ? startTime : '',
          isHere ? 'On Time' : 'Absent',
          schoolEndTime,
          new Date().toLocaleString()
        ];
      });

      // Append each row to Google Sheet via Apps Script
      for (const row of rows) {
        const response = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify({ values: row })
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error('Failed to save attendance');
        }
      }

      setStep('done');
    } catch (err) {
      console.error('Error submitting:', err);
      setError('Error submitting attendance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'selection') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-green-800 mb-6">Manual Attendance Taking</h2>

        <div className="bg-green-50 p-6 rounded-lg border border-green-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-green-800 mb-3">Division</label>
              <div className="space-y-2">
                {['BCM', 'OM'].map(div => (
                  <button
                    key={div}
                    onClick={() => handleDivisionChange(div)}
                    className={`w-full px-4 py-2 rounded-lg font-medium transition-all ${
                      division === div
                        ? 'bg-green-600 text-white'
                        : 'bg-white border border-green-300 text-green-800 hover:bg-green-100'
                    }`}
                  >
                    {div}
                  </button>
                ))}
              </div>
            </div>

            {division === 'OM' && (
              <div>
                <label className="block text-sm font-semibold text-green-800 mb-3">Type</label>
                <div className="space-y-2">
                  {['Regular', 'Minyan'].map(type => (
                    <button
                      key={type}
                      onClick={() => setIsMinyan(type === 'Minyan')}
                      className={`w-full px-4 py-2 rounded-lg font-medium transition-all ${
                        (type === 'Minyan' ? isMinyan : !isMinyan)
                          ? 'bg-green-600 text-white'
                          : 'bg-white border border-green-300 text-green-800 hover:bg-green-100'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-green-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-green-800 mb-2">Date</label>
                <input
                  type="date"
                  value={currentDate}
                  onChange={(e) => setCurrentDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-green-800 mb-2">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-green-200">
            <label className="block text-sm font-semibold text-green-800 mb-3">Select Grades</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedGrades(grades)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedGrades.length === grades.length && selectedGrades.length > 0
                    ? 'bg-green-600 text-white'
                    : 'bg-white border border-green-300 text-green-800 hover:bg-green-100'
                }`}
              >
                All
              </button>
              {grades.map(grade => (
                <button
                  key={grade}
                  onClick={() => {
                    setSelectedGrades(prev =>
                      prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]
                    );
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedGrades.includes(grade)
                      ? 'bg-green-600 text-white'
                      : 'bg-white border border-green-300 text-green-800 hover:bg-green-100'
                  }`}
                >
                  {grade}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-100 border border-red-300 rounded-lg text-red-800">
              {error}
            </div>
          )}

          <button
            onClick={handleCheckAttendance}
            disabled={loading || selectedGrades.length === 0}
            className="mt-6 w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold transition-all"
          >
            {loading ? 'Checking...' : 'Continue'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'marking') {
    const studentsList = studentRoster.filter(
      s => selectedGrades.includes(s.grade) && s.division === division
    );

    const gradeGroups = {};
    studentsList.forEach(s => {
      if (!gradeGroups[s.grade]) gradeGroups[s.grade] = [];
      gradeGroups[s.grade].push(s);
    });

    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-green-800 mb-2">Mark Attendance</h2>
        <p className="text-gray-600 mb-6">{currentDate} • {startTime}</p>

        {Object.entries(gradeGroups).sort((a, b) => {
          const aNum = parseInt(a[0]);
          const aLetter = a[0].replace(/\d/g, '').toLowerCase();
          const bNum = parseInt(b[0]);
          const bLetter = b[0].replace(/\d/g, '').toLowerCase();

          if (aNum !== bNum) return aNum - bNum;
          return aLetter.localeCompare(bLetter);
        }).map(([grade, gradeStudents]) => (
          <div key={grade} className="mb-8">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Grade {grade}</h3>
              <button
                onClick={() => markGradeAsOnTime(grade)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm"
              >
                Mark All On Time
              </button>
            </div>

            <div className="space-y-2">
              {gradeStudents.map(student => (
                <div key={student.studentId} className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200 hover:bg-gray-50">
                  <span className="font-medium text-gray-800">{student.fullName}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleStudent(student.studentId)}
                      className={`px-6 py-2 rounded-lg font-medium transition-all ${
                        attendance[student.studentId] === 'Yes'
                          ? 'bg-green-100 text-green-800 border-2 border-green-600'
                          : 'bg-gray-100 text-gray-600 border-2 border-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      Here
                    </button>
                    <button
                      onClick={() => toggleStudent(student.studentId)}
                      className={`px-6 py-2 rounded-lg font-medium transition-all ${
                        attendance[student.studentId] === 'No'
                          ? 'bg-red-100 text-red-800 border-2 border-red-600'
                          : 'bg-gray-100 text-gray-600 border-2 border-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex gap-4 mt-8">
          <button
            onClick={() => {
              setStep('selection');
              setAttendance({});
              setError('');
            }}
            className="flex-1 px-6 py-3 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 font-semibold transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !allMarked}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold transition-all"
          >
            {loading ? 'Submitting...' : 'Submit Attendance'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="p-6 max-w-4xl mx-auto flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">✓</div>
          <h2 className="text-3xl font-bold text-green-800 mb-2">Done!</h2>
          <p className="text-xl text-gray-600 mb-8">Have a great day!</p>
          <button
            onClick={() => {
              setStep('selection');
              setAttendance({});
              setSelectedGrades([]);
              setError('');
            }}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
          >
            Mark Another Class
          </button>
        </div>
      </div>
    );
  }
}

function EditAttendance({ hideNav }) {
  return (
    <div className={`${hideNav ? 'p-8' : 'p-6'} max-w-6xl mx-auto`}>
      <h2 className="text-2xl font-bold text-green-800 mb-6">Edit Attendance</h2>
      <div className="bg-green-50 p-8 rounded-lg border border-green-200 text-center">
        <p className="text-gray-600">Coming soon...</p>
      </div>
    </div>
  );
}

function UpcomingToday() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-green-800 mb-6">Upcoming Today</h2>
      <div className="bg-green-50 p-8 rounded-lg border border-green-200 text-center">
        <p className="text-gray-600">No upcoming entries</p>
      </div>
    </div>
  );
}

function Overview() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-green-800 mb-6">Overview</h2>
      <div className="bg-green-50 p-8 rounded-lg border border-green-200 text-center">
        <p className="text-gray-600">Coming soon...</p>
      </div>
    </div>
  );
}

function ParentsEntries() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-green-800 mb-6">Parents Entries</h2>
      <div className="bg-green-50 p-8 rounded-lg border border-green-200 text-center">
        <p className="text-gray-600">No parent entries</p>
      </div>
    </div>
  );
}

function NotesReminders() {
  const [notes, setNotes] = useState('');

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-green-800 mb-6">Notes & Reminders</h2>
      <div className="bg-white border border-gray-300 rounded-lg p-6">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add your notes here..."
          className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
        />
        <button className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
          Save Notes
        </button>
      </div>
    </div>
  );
}

function TotalAttendance() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-green-800 mb-6">Total Attendance Reports</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Total School Days</h3>
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
            Generate
          </button>
        </div>
        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Unexcused Absences</h3>
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}
