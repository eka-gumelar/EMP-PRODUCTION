import { useState, useEffect } from "react";
import { WorkLine, Manpower, AttendanceRecord, AchievementRecord, GenbaMachineCheckRecord } from "./types";
import { loadInitialProjectState, saveProjectState } from "./mockData";
import LineSelector from "./components/LineSelector";
import StatisticsDashboard from "./components/StatisticsDashboard";
import AttendanceManager from "./components/AttendanceManager";
import AchievementsManager from "./components/AchievementsManager";
import ManpowerManager from "./components/ManpowerManager";
import ChecksheetGenbaManager from "./components/ChecksheetGenbaManager";
import { 
  LayoutDashboard, 
  Users, 
  Award, 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  Home, 
  ArrowLeft,
  FileSpreadsheet,
  Network,
  Layers
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  
  // Loading state
  const [isLoaded, setIsLoaded] = useState(false);

  // Line selection: Autocutting, Crimping, MVVS, Joint & Wire Collect
  const [selectedLine, setSelectedLine] = useState<WorkLine | null>(null);

  // Sidebar navigation views: "dashboard" | "absensi" | "achievements" | "manpower" | "genba"
  const [activeMenu, setActiveMenu] = useState<"dashboard" | "absensi" | "achievements" | "manpower" | "genba">("dashboard");

  // Sidebar collapse toggle state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Unified persistent database states
  const [manpowerList, setManpowerList] = useState<Manpower[]>([]);
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [achievementsList, setAchievementsList] = useState<AchievementRecord[]>([]);
  const [genbaList, setGenbaList] = useState<GenbaMachineCheckRecord[]>([]);

  // Initialize data on component load
  useEffect(() => {
    const state = loadInitialProjectState();
    setManpowerList(state.manpowers);
    setAttendanceList(state.attendance);
    setAchievementsList(state.achievements);

    const localGenba = localStorage.getItem("monitor_pro_genba_v2");
    if (localGenba) {
      try {
        setGenbaList(JSON.parse(localGenba));
      } catch {
        setGenbaList([]);
      }
    }

    setIsLoaded(true);
  }, []);

  // Save changes to localStorage whenever states update
  const persistState = (newMps: Manpower[], newAtt: AttendanceRecord[], newAch: AchievementRecord[]) => {
    setManpowerList(newMps);
    setAttendanceList(newAtt);
    setAchievementsList(newAch);
    saveProjectState(newMps, newAtt, newAch);
  };

  // CALLBACK: Handle Select Line from initial dashboard
  const handleSelectLine = (line: WorkLine) => {
    setSelectedLine(line);
    setActiveMenu("dashboard"); // reset to overview
  };

  // CALLBACK: Save Attendance
  const handleSaveAttendance = (records: AttendanceRecord[]) => {
    // Merge records based on unique GUID
    const updated = [...attendanceList];
    records.forEach(newRec => {
      const idx = updated.findIndex(r => r.manpowerId === newRec.manpowerId && r.date === newRec.date);
      if (idx !== -1) {
        updated[idx] = newRec;
      } else {
        updated.push(newRec);
      }
    });

    persistState(manpowerList, updated, achievementsList);
  };

  // CALLBACK: Save Achievements
  const handleSaveAchievements = (records: AchievementRecord[]) => {
    const updated = [...achievementsList];
    records.forEach(newRec => {
      // Index matching based on ID string
      const idx = updated.findIndex(r => r.manpowerId === newRec.manpowerId && r.date === newRec.date);
      if (idx !== -1) {
        updated[idx] = newRec;
      } else {
        updated.push(newRec);
      }
    });

    persistState(manpowerList, attendanceList, updated);
  };

  // CALLBACK: Save Checksheet Genba
  const handleSaveGenba = (records: GenbaMachineCheckRecord[]) => {
    const updated = [...genbaList];
    records.forEach(newRec => {
      const idx = updated.findIndex(r => r.machineName === newRec.machineName && r.date === newRec.date && r.line === newRec.line);
      if (idx !== -1) {
        updated[idx] = newRec;
      } else {
        updated.push(newRec);
      }
    });
    setGenbaList(updated);
    localStorage.setItem("monitor_pro_genba_v2", JSON.stringify(updated));
  };

  // CALLBACK: Add Manpower (Register)
  const handleAddManpower = (mp: Manpower) => {
    const updatedMps = [...manpowerList, mp];
    persistState(updatedMps, attendanceList, achievementsList);
  };

  // CALLBACK: Update Manpower (Edit Biodata)
  const handleUpdateManpower = (updatedMp: Manpower) => {
    const updatedMps = manpowerList.map(mp => mp.id === updatedMp.id ? updatedMp : mp);
    persistState(updatedMps, attendanceList, achievementsList);
  };

  // CALLBACK: Delete Manpower & clean relation states
  const handleDeleteManpower = (id: string) => {
    const updatedMps = manpowerList.filter(mp => mp.id !== id);
    const updatedAtt = attendanceList.filter(rec => rec.manpowerId !== id);
    const updatedAch = achievementsList.filter(rec => rec.manpowerId !== id);
    persistState(updatedMps, updatedAtt, updatedAch);
  };

  // CALLBACK: Excel csv import workers batch
  const handleImportManpower = (importedMps: Manpower[]) => {
    const updatedMps = [...manpowerList, ...importedMps];
    persistState(updatedMps, attendanceList, achievementsList);
  };

  // Return selection launcher page if no line has been chosen yet
  if (!selectedLine) {
    return (
      <LineSelector 
        onSelectLine={handleSelectLine} 
        manpowerList={manpowerList}
      />
    );
  }

  // Active view content renderer
  const renderMainContent = () => {
    switch (activeMenu) {
      case "dashboard":
        return (
          <StatisticsDashboard 
            line={selectedLine}
            manpowerList={manpowerList}
            attendanceList={attendanceList}
            achievementsList={achievementsList}
          />
        );
      case "absensi":
        return (
          <AttendanceManager 
            line={selectedLine}
            manpowerList={manpowerList}
            attendanceList={attendanceList}
            onSaveAttendance={handleSaveAttendance}
          />
        );
      case "achievements":
        return (
          <AchievementsManager 
            line={selectedLine}
            manpowerList={manpowerList}
            achievementsList={achievementsList}
            onSaveAchievements={handleSaveAchievements}
          />
        );
      case "manpower":
        return (
          <ManpowerManager 
            line={selectedLine}
            manpowerList={manpowerList}
            attendanceList={attendanceList}
            achievementsList={achievementsList}
            onAddManpower={handleAddManpower}
            onUpdateManpower={handleUpdateManpower}
            onDeleteManpower={handleDeleteManpower}
            onImportManpower={handleImportManpower}
          />
        );
      case "genba":
        return (
          <ChecksheetGenbaManager 
            line={selectedLine}
            genbaList={genbaList}
            onSaveGenba={handleSaveGenba}
          />
        );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc] font-sans text-slate-800 overflow-hidden" id="dashboard-layout-root">
      
      {/* TOP HORIZONTAL NAVBAR */}
      <header id="top-navbar" className="h-16 bg-slate-950 border-b border-slate-900 flex items-center justify-between px-4 sm:px-6 select-none z-30 shadow-2xl flex-shrink-0">
        
        {/* Brand & Logo Section */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-blue-500 rounded-lg flex items-center justify-center text-white font-black shrink-0 shadow-md shadow-blue-500/20 font-mono text-sm">
            M
          </div>
          <div className="font-bold tracking-tight text-white flex flex-col leading-none">
            <span className="text-xs sm:text-sm font-black tracking-widest text-white leading-none">MONITOR PRO</span>
            <span className="text-[8px] text-slate-400 font-mono tracking-widest mt-1 uppercase">MONITOR PRODUCTION SYSTEM</span>
          </div>
        </div>

        {/* Navigation Menu Tabs */}
        <nav className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar mx-2">
          
          <button
            onClick={() => setActiveMenu("dashboard")}
            id="navbar-link-dashboard"
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeMenu === "dashboard"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/15 border border-blue-500/30"
                : "text-slate-400 hover:bg-slate-900 hover:text-slate-150"
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="hidden sm:inline">Overview Board</span>
          </button>

          <button
            onClick={() => setActiveMenu("absensi")}
            id="navbar-link-absensi"
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeMenu === "absensi"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/15 border border-blue-500/30"
                : "text-slate-400 hover:bg-slate-900 hover:text-slate-150"
            }`}
          >
            <Users className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="hidden sm:inline">Absensi</span>
          </button>

          <button
            onClick={() => setActiveMenu("achievements")}
            id="navbar-link-achievements"
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeMenu === "achievements"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/15 border border-blue-500/30"
                : "text-slate-400 hover:bg-slate-900 hover:text-slate-150"
            }`}
          >
            <Award className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="hidden sm:inline">Kinerja Shift</span>
          </button>

          <button
            onClick={() => setActiveMenu("genba")}
            id="navbar-link-genba"
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeMenu === "genba"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/15 border border-blue-500/30"
                : "text-slate-400 hover:bg-slate-900 hover:text-slate-150"
            }`}
          >
            <Layers className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="hidden sm:inline">Checksheet Genba</span>
          </button>

          <button
            onClick={() => setActiveMenu("manpower")}
            id="navbar-link-manpower"
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeMenu === "manpower"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/15 border border-blue-500/30"
                : "text-slate-400 hover:bg-slate-900 hover:text-slate-150"
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="hidden sm:inline">Manajemen MP</span>
          </button>

        </nav>

        {/* Right Active Line pill & Back control */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:flex flex-col text-right mr-1.5 font-mono">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-extrabold">Line Aktif</span>
            <span className="text-xs font-black text-amber-400 truncate max-w-[120px]">{selectedLine}</span>
          </div>
          <button
            onClick={() => setSelectedLine(null)}
            id="navbar-btn-ganti-line"
            title="Ganti Line Produksi"
            className="flex items-center gap-1.5 px-3 py-1.8 rounded-lg text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-850 transition-colors cursor-pointer shadow-sm border border-slate-800 hover:border-slate-700 font-bold"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Ganti Line</span>
          </button>
        </div>

      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Core panel content view with independent scrolling */}
        <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto bg-slate-50/50">
          {renderMainContent()}
        </div>
      </main>

    </div>
  );
}
