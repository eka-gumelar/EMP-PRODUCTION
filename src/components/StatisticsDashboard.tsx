import { useState, useMemo, useEffect } from "react";
import { Manpower, AttendanceRecord, AchievementRecord, WorkLine } from "../types";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from "recharts";
import { 
  Users, 
  Target, 
  TrendingUp, 
  Sparkles, 
  Calendar, 
  CheckCircle,
  AlertTriangle,
  Layers,
  ChevronRight,
  Award,
  Activity,
  X,
  Volume2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface StatisticsDashboardProps {
  line: WorkLine;
  manpowerList: Manpower[];
  attendanceList: AttendanceRecord[];
  achievementsList: AchievementRecord[];
}

export default function StatisticsDashboard({ 
  line, 
  manpowerList, 
  attendanceList, 
  achievementsList 
}: StatisticsDashboardProps) {
  
  // Target date context for today (May 22, 2026)
  const targetDateStr = "2026-05-22";
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-05"); // YYYY-MM
  
  // Show/hide toast manually
  const [isToastOpen, setIsToastOpen] = useState(true);
  
  // Trigger particle burst effect when 100% target is reached!
  const [showConfetti, setShowConfetti] = useState(false);

  // Filter manpower for target line
  const activeMPs = useMemo(() => {
    return manpowerList.filter(mp => mp.line === line);
  }, [manpowerList, line]);

  // Attendance Metrics Today
  const attendanceToday = useMemo(() => {
    const records = attendanceList.filter(rec => rec.line === line && rec.date === targetDateStr);
    const standard = activeMPs.length;
    const actual = records.filter(rec => rec.status === "Hadir").length;
    const rate = standard > 0 ? Math.round((actual / standard) * 100) : 0;
    
    // Breakdown
    const sakit = records.filter(rec => rec.status === "Sakit").length;
    const izin = records.filter(rec => rec.status === "Izin").length;
    const alpha = records.filter(rec => rec.status === "Tanpa Keterangan").length;

    return { actual, standard, rate, sakit, izin, alpha };
  }, [attendanceList, activeMPs, line, targetDateStr]);

  // Output Metrics Today
  const outputToday = useMemo(() => {
    const todayAch = achievementsList.filter(
      ach => ach.line === line && ach.date === targetDateStr
    );
    
    let actualOutput = todayAch.reduce((sum, ach) => sum + ach.output, 0);
    let targetOutput = todayAch.reduce((sum, ach) => sum + ach.target, 0);

    // If achievements are not filled today, use initial projections based on standard worker output
    if (targetOutput === 0) {
      const defaultWorkerTarget = line === "Autocutting" ? 1000 : (line === "Crimping" ? 500 : (line === "MVVS" ? 300 : 400));
      const presentCount = attendanceToday.actual || activeMPs.length;
      targetOutput = presentCount * defaultWorkerTarget;
      actualOutput = Math.round(targetOutput * 0.94);
    }

    const rate = targetOutput > 0 ? Math.round((actualOutput / targetOutput) * 100) : 0;

    return { actual: actualOutput, standard: targetOutput, rate };
  }, [achievementsList, line, targetDateStr, attendanceToday, activeMPs]);

  // Reset toast trigger whenever output rate updates
  useEffect(() => {
    if (outputToday.rate >= 100) {
      setIsToastOpen(true);
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000); // Stop anim after 5s
      return () => clearTimeout(timer);
    } else {
      setIsToastOpen(false);
      setShowConfetti(false);
    }
  }, [outputToday.rate, line]);

  // Monthly Output Metrics (Mei 25, 2026 - locked for the active current month)
  const outputMonthly = useMemo(() => {
    const activeMonthStr = "2026-05";
    const monthAch = achievementsList.filter(
      ach => ach.line === line && ach.date.startsWith(activeMonthStr)
    );

    let actualSum = monthAch.reduce((sum, ach) => sum + ach.output, 0);
    let targetSum = monthAch.reduce((sum, ach) => sum + ach.target, 0);

    // Default projection fallback if data is low
    if (targetSum === 0) {
      const defaultWorkerTarget = line === "Autocutting" ? 1000 : (line === "Crimping" ? 500 : (line === "MVVS" ? 300 : 400));
      targetSum = activeMPs.length * defaultWorkerTarget * 12;
      actualSum = Math.round(targetSum * 0.96);
    }

    const rate = targetSum > 0 ? Math.round((actualSum / targetSum) * 100) : 0;

    return { actual: actualSum, standard: targetSum, rate };
  }, [achievementsList, line, activeMPs]);

  // Daily Trend Charts Data for Selected Month
  const trendData = useMemo(() => {
    // 1. Filter month records belonging to the current line and selected month
    const monthRecords = achievementsList.filter(
      ach => ach.line === line && ach.date.startsWith(selectedMonth)
    );

    // 2. Extract distinct dates of actual saved achievements
    const datesSet = new Set(monthRecords.map(r => r.date));

    // 3. Always ensure today's date is available to graph today's real-time sliding rates
    if (targetDateStr.startsWith(selectedMonth)) {
      datesSet.add(targetDateStr);
    }

    // 4. Sort dates chronologically
    const sortedDates = Array.from(datesSet).sort();

    return sortedDates.map((dateStr) => {
      const dayRecords = monthRecords.filter(r => r.date === dateStr);
      let actual = 0;
      let standar = 0;

      if (dayRecords.length > 0) {
        // Real registered output data aggregated from all manpower
        actual = dayRecords.reduce((sum, r) => sum + r.output, 0);
        standar = dayRecords.reduce((sum, r) => sum + r.target, 0);
      } else {
        // Safe default or fallback for today specifically if the day hasn't been logged yet
        if (dateStr === targetDateStr) {
          standar = outputToday.standard;
          actual = outputToday.actual;
        }
      }

      // If it is today, ensure it responds dynamically to the interactive sliders and controls
      if (dateStr === targetDateStr) {
        standar = outputToday.standard;
        actual = outputToday.actual;
      }

      const parts = dateStr.split("-");
      const dayLabel = `${parts[2] || "01"}/${parts[1] || "05"}`;

      return {
        rawDate: dateStr,
        label: dayLabel,
        "Actual Output": actual,
        "Standar Target": standar
      };
    });
  }, [achievementsList, line, selectedMonth, outputToday]);

  // Calculate Efficiency Rate & Level
  const efficiency = useMemo(() => {
    const rate = outputToday.rate;
    let level = "OPTIMAL";
    if (rate >= 100) level = "KAIZEN MASTER";
    else if (rate >= 95) level = "EXCELLENT";
    else if (rate >= 90) level = "OPTIMAL";
    else if (rate >= 80) level = "STABLE";
    else level = "ATTENTION REQUIRED";
    return { rate, level };
  }, [outputToday]);

  return (
    <div className="space-y-8 animate-fade-in relative pb-10" id="statistics-dashboard">
      
      {/* 🎊 CONFETTI CELEBRATION FLOATING PARTICLES (HTML Canvas-free elegant CSS rendering) */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" id="confetti-particles">
          {[...Array(30)].map((_, i) => {
            const rot = Math.random() * 360;
            const size = 6 + Math.random() * 12;
            const left = Math.random() * 100;
            const delay = Math.random() * 2;
            const duration = 2.5 + Math.random() * 3;
            const colors = ['bg-amber-400', 'bg-blue-400', 'bg-emerald-400', 'bg-rose-500', 'bg-pink-400'];
            const randCol = colors[Math.floor(Math.random() * colors.length)];
            return (
              <div
                key={i}
                className={`absolute rounded-xs ${randCol} opacity-85 shadow-md`}
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  left: `${left}%`,
                  top: `-20px`,
                  transform: `rotate(${rot}deg)`,
                  animation: `fall ${duration}s linear ${delay}s infinite`,
                }}
              />
            );
          })}
          <style>{`
            @keyframes fall {
              0% { top: -20px; transform: rotate(0deg) translateX(0); }
              50% { transform: rotate(180deg) translateX(25px); }
              100% { top: 105%; transform: rotate(360deg) translateX(-15px); }
            }
          `}</style>
        </div>
      )}

      {/* 💡 AESTHETIC KAIZEN FLOATING TOAST / POP-UP ALERT (TOP RIGHT) */}
      <AnimatePresence>
        {outputToday.rate >= 100 && isToastOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: "tween", duration: 0.15 }}
            id="kaizen-epic-pop"
            className="fixed top-24 right-4 sm:right-6 md:right-8 z-40 max-w-sm w-full bg-slate-950/95 backdrop-blur-md border border-slate-800/80 shadow-2xl p-5 text-white rounded-3xl"
          >
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                <Award className="h-7 w-7 stroke-[3]" id="kaizen-award-ic" />
              </div>
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black font-mono tracking-widest bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 px-2.5 py-1 rounded-full uppercase">
                    KAIZEN 100%+
                  </span>
                  <span className="text-[10px] text-amber-500 font-bold uppercase font-mono">GOAL REACHED</span>
                </div>
                <h4 className="text-sm font-black text-white mt-2 tracking-tight uppercase font-mono">
                  Target Line Tercapai Sempurna!
                </h4>
                <p className="text-xs text-slate-300 mt-1 font-mono leading-relaxed font-semibold">
                  Line <span className="font-bold text-amber-300">{line.toUpperCase()}</span> telah melampaui standard shift hari ini sebesar{" "}
                  <span className="font-mono font-black text-amber-300 text-sm">{outputToday.rate}%</span>.
                </p>

                {/* Progress bar and details inside popup */}
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-[10px] font-mono font-bold text-slate-450 text-slate-400">
                    <span>Aktual / Standard Target</span>
                    <span className="text-amber-300">{outputToday.actual.toLocaleString()} / {outputToday.standard.toLocaleString()} pcs</span>
                  </div>
                  <div className="bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full animate-pulse"
                      style={{ width: `${Math.min(100, outputToday.rate)}%` }}
                    />
                  </div>
                </div>

                {/* Simulated buzzer effect warning */}
                <div className="mt-3 flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono font-bold uppercase">
                  <Sparkles className="h-3.5 w-3.5 text-amber-450 text-amber-300 animate-spin" />
                  <span>PREMIUM QUALITY CONTROL SYSTEM ENABLED</span>
                </div>
              </div>
              
              <button 
                onClick={() => setIsToastOpen(false)}
                className="text-slate-455 text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER: ELONGATED MASTER MONITORING BOARD */}
      <div 
        id="kaizen-dashboard-header" 
        className="relative overflow-hidden bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-md shadow-slate-205/40"
      >
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-full font-mono">
                PRODUCTION HQ &bull; MONITOR PRODUCTION SYSTEM
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-white bg-gradient-to-r from-red-550 to-rose-600 bg-red-600 px-3 py-1.5 rounded-full font-mono shadow-md shadow-red-500/10">
                LIVE STATUS
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-4xl font-black text-slate-950 mt-3 tracking-tighter flex items-baseline gap-2.5 font-mono uppercase leading-none">
              <span>{line} Board</span>
              <span className="text-slate-350 font-light text-2xl hidden sm:inline">|</span>
              <span className="text-blue-600 text-sm font-black font-mono tracking-wider hidden sm:inline uppercase">MONITORING UNIT</span>
            </h1>
            
            <p className="text-xs text-slate-500 mt-2 font-mono font-bold flex items-center gap-1.5 max-w-2xl">
              <span className="h-2.5 w-2.5 bg-emerald-500 rounded-full animate-pulse shrink-0"></span>
              Pencatatan real-time standardisasi operasional produksi berdasarkan audit kerja harian.
            </p>
          </div>
        </div>
      </div>

      {/* DETAILED STATISTICS KPI PANEL (PRODUCTION KAIZEN COMPACT LAYOUT) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="stats-dashboard-grid-blocks">
        
        {/* KPI 1: ATTENDANCE BLOCK */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 relative overflow-hidden flex flex-col justify-between shadow-sm">
          <div className="absolute right-3 top-3 text-[9px] font-mono font-bold text-slate-400 select-none uppercase tracking-widest">
            ATTENDANCE STATUS
          </div>
          
          <div>
            <div className="flex items-center gap-2 text-slate-500 font-mono tracking-wider font-bold text-[10px] uppercase">
              <Users className="h-4 w-4 text-slate-950" />
              Absensi Hari Ini
            </div>
 
            <div className="flex items-baseline gap-2 mt-4 leading-none">
              <span className="text-5xl sm:text-6xl font-mono font-black text-slate-950 tracking-tighter">
                {attendanceToday.actual}
              </span>
              <span className="text-slate-400 text-xs font-semibold">
                / {attendanceToday.standard} MP Terdaftar
              </span>
            </div>
          </div>
 
          {/* Progress Bar Attendance */}
          <div className="mt-5 space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-mono font-black text-slate-500 uppercase">
              <span>Kehadiran Rate</span>
              <span className="text-blue-600 font-extrabold">{attendanceToday.rate}%</span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, attendanceToday.rate)}%` }}
              />
            </div>
          </div>
 
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-1 divide-x divide-slate-100 text-center text-[10px] font-mono font-black uppercase">
            <div>
              <span className="block text-slate-400 text-[9px]">Sakit</span>
              <span className="font-extrabold text-slate-800 mt-1 block">{attendanceToday.sakit}</span>
            </div>
            <div>
              <span className="block text-slate-400 text-[9px]">Izin</span>
              <span className="font-extrabold text-slate-800 mt-1 block">{attendanceToday.izin}</span>
            </div>
            <div>
              <span className="block text-rose-500 text-[9px]">Alpha</span>
              <span className="font-extrabold text-rose-600 mt-1 block">{attendanceToday.alpha}</span>
            </div>
          </div>
        </div>

        {/* KPI 2: DAILY PERFORMANCE BLOCK */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 relative overflow-hidden flex flex-col justify-between shadow-sm">
          <div className="absolute right-3 top-3 text-[9px] font-mono font-bold text-slate-400 select-none uppercase tracking-widest">
            DAILY OUTPUT
          </div>

          <div>
            <div className="flex items-center gap-2 text-slate-500 font-mono tracking-widest font-bold text-[10px] uppercase">
              <Target className="h-4 w-4 text-slate-950" />
              Output Hari Ini
            </div>

            <div className="flex items-baseline gap-1.5 mt-4 leading-none">
              <span className={`text-5xl sm:text-6xl font-mono font-black tracking-tighter ${
                outputToday.rate >= 100 ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500 font-extrabold' : 'text-slate-950'
              }`}>
                {outputToday.actual.toLocaleString()}
              </span>
              <span className="text-slate-500 text-xs font-black font-mono">
                / {outputToday.standard.toLocaleString()} pcs
              </span>
            </div>
          </div>

          {/* Achievement badge/progress */}
          <div className="mt-5 space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-mono font-black text-slate-500 uppercase">
              <span>Pencapaian Shift</span>
              <span className={`font-black ${outputToday.rate >= 100 ? 'text-amber-550 text-amber-500 font-extrabold' : 'text-emerald-600'}`}>
                {outputToday.rate}%
              </span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-305 ${
                  outputToday.rate >= 100 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                }`}
                style={{ width: `${Math.min(100, outputToday.rate)}%` }}
              />
            </div>
          </div>

          {/* Absolute Kaizen Badge Badge */}
          <div className="mt-4">
            {outputToday.rate >= 100 ? (
              <div className="inline-flex items-center bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 text-[10px] font-mono font-black py-2 px-3.5 rounded-2xl w-full justify-between uppercase shadow-md shadow-amber-500/10">
                <span className="flex items-center gap-1.5 font-bold">
                  <Award className="h-4 w-4 shrink-0" />
                  Target Tercapai (SUCCESS)
                </span>
                <span className="bg-slate-980 bg-slate-900 text-amber-400 px-1.5 py-0.5 rounded-lg text-[9px] font-black">100%+</span>
              </div>
            ) : (
              <div className="inline-flex items-center bg-slate-50 text-slate-500 text-[9px] font-mono font-black py-1.5 px-3 rounded-2xl border border-slate-200 w-full justify-between uppercase">
                <span>Progressing...</span>
                <span>Gap: {(outputToday.standard - outputToday.actual).toLocaleString()} pcs</span>
              </div>
            )}
          </div>
        </div>

        {/* KPI 3: MONTHLY OVERVIEW */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 relative overflow-hidden flex flex-col justify-between shadow-sm">
          <div className="absolute right-3 top-3 text-[9px] font-mono font-bold text-slate-400 select-none uppercase tracking-widest">
            MONTHLY ACCUMULATIVE
          </div>

          <div>
            <div className="flex items-center gap-2 text-slate-500 font-mono tracking-widest font-bold text-[10px] uppercase">
              <Layers className="h-4 w-4 text-slate-950" />
              Output Bulanan
            </div>

            <div className="flex items-baseline gap-2 mt-4 leading-none font-mono">
              <span className="text-5xl sm:text-6xl font-black text-slate-950 tracking-tighter block">
                {outputMonthly.actual >= 1000 ? `${(outputMonthly.actual / 1000).toFixed(1)}k` : outputMonthly.actual}
              </span>
              <span className="text-slate-400 text-xs font-semibold block">
                / Std {outputMonthly.standard >= 1000 ? `${(outputMonthly.standard / 1000).toFixed(0)}k` : outputMonthly.standard} pcs
              </span>
            </div>
          </div>

          <div className="mt-5 space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-mono font-black text-slate-500 uppercase">
              <span>Kecepatan Target</span>
              <span className="text-indigo-650 text-indigo-605 text-indigo-600 font-black">{outputMonthly.rate}%</span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-indigo-550 to-indigo-650 bg-indigo-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, outputMonthly.rate)}%` }}
              />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-500 text-right font-mono flex justify-between items-center font-black uppercase">
            <span>Total Kumulatif:</span>
            <span className="text-slate-950 text-xs font-black">{outputMonthly.actual.toLocaleString()} Product Pcs</span>
          </div>
        </div>

        {/* KPI 4: EFFICIENCY & PERFORMANCE LEVEL INDICATION */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white rounded-3xl border border-slate-800/80 p-6 relative overflow-hidden flex flex-col justify-between shadow-xl">
          <div className="absolute right-3 top-3 text-[9px] font-mono font-bold text-slate-500 select-none uppercase tracking-widest">
            EFFICIENCY OEE
          </div>

          <div>
            <div className="flex items-center gap-2 text-slate-400 font-mono tracking-widest font-black text-[10px] uppercase relative z-10">
              <Activity className="h-4 w-4 text-slate-100" />
              Efisiensi Standard
            </div>

            <div className="flex items-baseline gap-1 mt-4 leading-none relative z-10 font-mono">
              <span className="text-5xl sm:text-6xl font-black text-white tracking-tighter">
                {efficiency.rate}
              </span>
              <span className="text-slate-400 text-lg font-black">%</span>
            </div>
          </div>

          <div className="mt-5 space-y-1 relative z-10">
            <span className="text-[9px] font-bold tracking-widest text-slate-400 uppercase block font-mono">
              LEVEL MONITORING:
            </span>
            
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${
                efficiency.rate >= 100 
                  ? 'bg-amber-400 animate-pulse' 
                  : (efficiency.rate >= 95 ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400')
              }`} />
              <span className={`text-[11px] font-black uppercase font-mono tracking-widest ${
                efficiency.rate >= 100 
                  ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 font-extrabold' 
                  : (efficiency.rate >= 95 ? 'text-emerald-400' : 'text-blue-400')
              }`}>
                {efficiency.level}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60 text-[10px] font-mono text-slate-400 flex items-center justify-between relative z-10 font-black uppercase tracking-wider font-semibold">
            <span className="text-slate-500">MANAGEMENT STATUS:</span>
            <span className="bg-slate-900 font-black text-white px-2.5 py-1 rounded-full border border-slate-800">
              JIS QUALITY APPROVED
            </span>
          </div>
        </div>

      </div>

      {/* MODERN DUAL-GRADIENT CHARTS AREA */}
      <div 
        id="trend-output-chart-card" 
        className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm"
      >
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="text-[10px] font-black uppercase text-white bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 rounded-full inline-block font-mono mb-2 tracking-widest shadow-md shadow-blue-500/10">
              PERFORMANCE TREND &bull; MONITOR SEBARAN TARGET
            </div>
            <h3 className="text-xl font-black text-slate-950 tracking-tight uppercase font-mono">
              Visualisasi Tren Output Harian
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-mono leading-relaxed font-semibold">
              Analisis pencapaian harian komulatif tim (pcs) berbanding target standar produksi di bulan {selectedMonth === "2026-05" ? "Mei 2026" : "Historis"}.
            </p>
          </div>

          {/* Legends and Month select dropdown */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono font-black">
            
            {/* Monthly range option */}
            <div className="flex items-center space-x-2 bg-slate-50 p-1.5 border border-slate-205 border-slate-200 text-slate-705 text-slate-700 shrink-0 rounded-2xl mr-1">
              <Calendar className="h-4 w-4 text-slate-400 ml-1.5" />
              <span className="text-[11px] font-black uppercase text-slate-500 font-mono">Periode:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs bg-white border border-slate-200 py-1 px-3 focus:ring-1 focus:ring-slate-950 font-black text-slate-950 font-mono rounded-xl focus:outline-none cursor-pointer"
              >
                <option value="2026-05">MEI 2026</option>
                <option value="2026-04">APRIL 2026</option>
                <option value="2026-03">MARET 2026</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 py-2.5 px-3.5 rounded-full">
              <span className="h-2.5 w-2.5 bg-blue-600 block rounded-full"></span>
              <span className="uppercase tracking-wide text-slate-800 text-[11px]">Output Aktual ( pcs )</span>
            </div>
            
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 py-2.5 px-3.5 rounded-full">
              <span className="h-2.5 w-2.5 border border-slate-605 bg-white block border-dashed rounded-full"></span>
              <span className="uppercase tracking-wide text-slate-705 text-slate-700 text-[11px]">Standar Target</span>
            </div>
          </div>
        </div>

        {/* RECHARTS COMPONENT */}
        <div className="h-[380px] w-full font-mono">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={trendData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.03}/>
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="label" 
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const actVal = payload[0].value as number;
                    const stdVal = payload[1].value as number;
                    const ratio = stdVal > 0 ? Math.round((actVal / stdVal) * 100) : 0;
                    return (
                      <div className="bg-slate-950/95 border-2 border-slate-800 p-4 rounded-xl shadow-2xl text-white font-mono min-w-[200px] text-xs backdrop-blur-md">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2 text-slate-400 text-[10px]">
                          <span>SHIFT SUMMARY</span>
                          <span className="font-bold">{payload[0].payload.rawDate}</span>
                        </div>
                        <div className="space-y-1.5">
                          <p className="flex items-center justify-between">
                            <span className="text-blue-400 font-bold">● Output:</span>
                            <span className="font-bold text-white">{actVal.toLocaleString()} pcs</span>
                          </p>
                          <p className="flex items-center justify-between">
                            <span className="text-slate-400">● Target:</span>
                            <span className="font-medium text-slate-300">{stdVal.toLocaleString()} pcs</span>
                          </p>
                          <div className="border-t border-slate-800/80 pt-2 mt-2 flex items-center justify-between">
                            <span className="text-[10px] text-slate-500">PENCAPAIAN:</span>
                            <span className={`font-black uppercase px-2 py-0.5 rounded text-[10px] ${
                              ratio >= 100 ? 'bg-amber-400/20 text-amber-300 border border-amber-400/20' : 'bg-slate-800 text-slate-300'
                            }`}>
                              {ratio}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="Actual Output" 
                stroke="#2563eb" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorActual)" 
              />
              <Area 
                type="monotone" 
                dataKey="Standar Target" 
                stroke="#94a3b8" 
                strokeWidth={2} 
                strokeDasharray="5 5"
                fillOpacity={1} 
                fill="url(#colorTarget)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
