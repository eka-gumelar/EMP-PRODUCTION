import React, { useState, useMemo, useRef } from "react";
import { Manpower, MPStatus, AttendanceRecord, AchievementRecord, WorkLine } from "../types";
import { formatDate } from "../mockData";
import { toPng } from "html-to-image";
import { 
  Users, 
  UserPlus, 
  Upload, 
  Trash2, 
  Edit2, 
  Search, 
  Download, 
  Calendar, 
  UserCheck, 
  Percent, 
  TrendingUp, 
  Award, 
  X,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  FileImage
} from "lucide-react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from "recharts";

interface ManpowerManagerProps {
  line: WorkLine;
  manpowerList: Manpower[];
  attendanceList: AttendanceRecord[];
  achievementsList: AchievementRecord[];
  onAddManpower: (mp: Manpower) => void;
  onUpdateManpower: (mp: Manpower) => void;
  onDeleteManpower: (id: string) => void;
  onImportManpower: (mps: Manpower[]) => void;
}

export default function ManpowerManager({
  line,
  manpowerList,
  attendanceList,
  achievementsList,
  onAddManpower,
  onUpdateManpower,
  onDeleteManpower,
  onImportManpower
}: ManpowerManagerProps) {

  const todayStr = "2026-05-22";

  // Form registration states
  const [nik, setNik] = useState("");
  const [nama, setNama] = useState("");
  const [proses, setProses] = useState("");
  const [status, setStatus] = useState<MPStatus>("Karyawan");
  const [joinDate, setJoinDate] = useState("2024-01-01");
  const [addMsg, setAddMsg] = useState("");
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // Search states
  const [searchQuery, setSearchQuery] = useState("");

  // Active / Selected MP for Summary detail
  const [selectedMpId, setSelectedMpId] = useState<string | null>(null);
  
  // Edit MP states
  const [isEditing, setIsEditing] = useState(false);
  const [editNik, setEditNik] = useState("");
  const [editNama, setEditNama] = useState("");
  const [editProses, setEditProses] = useState("");
  const [editStatus, setEditStatus] = useState<MPStatus>("Karyawan");
  const [editJoinDate, setEditJoinDate] = useState("");

  // Reference for Bento panel download
  const bentoCardRef = useRef<HTMLDivElement>(null);

  // Filter line manpower
  const activeWorkers = useMemo(() => {
    return manpowerList.filter(mp => mp.line === line);
  }, [manpowerList, line]);

  // Handle manual additions
  const handleSubmitMP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nik || !nama || !proses) {
      alert("Harap lengkapi semua field manpower (NIK, Nama, Proses)!");
      return;
    }

    // Safety check for duplication of NIK
    if (manpowerList.some(mp => mp.nik === nik)) {
      alert(`NIK [${nik}] sudah terdaftar di sistem!`);
      return;
    }

    const newMP: Manpower = {
      id: `mp-${Math.random().toString(36).substr(2, 9)}`,
      nik,
      nama,
      proses,
      status,
      joinDate,
      line: line
    };

    onAddManpower(newMP);
    setNik("");
    setNama("");
    setProses("");
    setStatus("Karyawan");
    setAddMsg(`Manpower "${newMP.nama}" berhasil ditambahkan!`);
    setIsRegisterOpen(false); // Auto-close floating modal window
    setTimeout(() => setAddMsg(""), 3000);
  };

  // Masa Kerja (Tenure) Calculator: from Join date to today (2026-05-22)
  const calculateTenure = (joinDateStr: string): string => {
    const join = new Date(joinDateStr);
    const today = new Date(todayStr);

    if (isNaN(join.getTime())) return "-";

    let years = today.getFullYear() - join.getFullYear();
    let months = today.getMonth() - join.getMonth();
    let days = today.getDate() - join.getDate();

    if (days < 0) {
      months--;
      // Get days in preceding month
      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += prevMonth.getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    if (years < 0) return "Baru Join";

    const parts: string[] = [];
    if (years > 0) parts.push(`${years} Tahun`);
    if (months > 0) parts.push(`${months} Bulan`);
    if (days > 0 && years === 0) parts.push(`${days} Hari`);

    return parts.length > 0 ? parts.join(" ") : "0 Hari";
  };

  // CSV Excel Import simulator
  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const linesArr = text.split("\n");
      const imported: Manpower[] = [];

      // Skip header, parse rows
      for (let i = 1; i < linesArr.length; i++) {
        const lineText = linesArr[i].trim();
        if (!lineText) continue;

        const cols = lineText.split(",");
        if (cols.length >= 5) {
          const rawNik = cols[0].trim().replace(/"/g, "");
          const rawNama = cols[1].trim().replace(/"/g, "");
          const rawProses = cols[2].trim().replace(/"/g, "");
          const rawStatus = cols[3].trim().replace(/"/g, "") as MPStatus;
          const rawJoin = cols[4].trim().replace(/"/g, "");

          // Validate status
          const validStatuses: MPStatus[] = ["Karyawan", "Magang", "HL", "PKL"];
          const checkedStatus = validStatuses.includes(rawStatus) ? rawStatus : "Karyawan";

          // Only import if not already existing NIK
          if (!manpowerList.some(mp => mp.nik === rawNik) && !imported.some(mp => mp.nik === rawNik)) {
            imported.push({
              id: `mp-csv-${Math.random().toString(36).substr(2, 9)}`,
              nik: rawNik,
              nama: rawNama,
              proses: rawProses,
              status: checkedStatus,
              joinDate: rawJoin || "2024-01-01",
              line: line
            });
          }
        }
      }

      if (imported.length > 0) {
        onImportManpower(imported);
        alert(`Berhasil mengimpor ${imported.length} Manpower baru untuk Line ${line}!`);
      } else {
        alert("Tidak ada Manpower baru yang unik untuk diimpor. Periksa format NIK.");
      }
    };

    reader.readAsText(file);
    e.target.value = ""; // reset
  };

  // Generate Sample CSV Template for the user
  const downloadSampleCSV = () => {
    const headers = "NIK,Nama Lengkap,Proses,Status (Karyawan/Magang/HL/PKL),Join Date (YYYY-MM-DD)\n";
    const rows = `AC26901,Ade Irfan,Crimp Station A,Karyawan,2023-08-15\nAC26902,Lia Amalia,Visual Inspector,Magang,2025-12-01\nAC26903,Hendra Jaya,Terminal Feeding,HL,2024-05-20\nAC26904,Reza Pratama,Splicing Helper,PKL,2026-01-10\n`;
    
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Template_Manpower_${line.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger simulated demo imports
  const handleSimulateExcelImport = () => {
    const prefix1 = Math.random().toString(36).substr(2, 9);
    const prefix2 = Math.random().toString(36).substr(2, 9);
    const prefix3 = Math.random().toString(36).substr(2, 9);
    const extraMP: Manpower[] = [
      { id: `demo-mp-1-${prefix1}`, nik: `ACD-${Math.floor(Math.random()*900+100)}`, nama: "Pratama Yudha", proses: "Wire Collect Helper", status: "HL", joinDate: "2024-11-20", line },
      { id: `demo-mp-2-${prefix2}`, nik: `ACD-${Math.floor(Math.random()*900+100)}`, nama: "Sania Putri", proses: "Material Handler", status: "Magang", joinDate: "2025-12-15", line },
      { id: `demo-mp-3-${prefix3}`, nik: `ACD-${Math.floor(Math.random()*900+100)}`, nama: "Kusuma Wardana", proses: "Solder Station Setup", status: "Karyawan", joinDate: "2022-09-01", line }
    ];
    onImportManpower(extraMP);
    setAddMsg("Berhasil mensimulasikan import 3 Manpower dari fail Excel!");
    setTimeout(() => setAddMsg(""), 3000);
  };

  // Compute selected manpower summary statistics
  const selectedMpSummary = useMemo(() => {
    if (!selectedMpId) return null;
    const mp = manpowerList.find(m => m.id === selectedMpId);
    if (!mp) return null;

    // 1. Attendance analytics
    const mpAttendance = attendanceList.filter(rec => rec.manpowerId === mp.id);
    const totalDays = mpAttendance.length;
    
    const hadir = mpAttendance.filter(rec => rec.status === "Hadir").length;
    const sakit = mpAttendance.filter(rec => rec.status === "Sakit").length;
    const izin = mpAttendance.filter(rec => rec.status === "Izin").length;
    const alpha = mpAttendance.filter(rec => rec.status === "Tanpa Keterangan").length;

    const rateHadir = totalDays > 0 ? Math.round((hadir / totalDays) * 100) : 100;
    const rateSakit = totalDays > 0 ? Math.round((sakit / totalDays) * 100) : 0;
    const rateIzin = totalDays > 0 ? Math.round((izin / totalDays) * 100) : 0;
    const rateAlpha = totalDays > 0 ? Math.round((alpha / totalDays) * 100) : 0;

    // 2. Achievements analytics
    const mpAchievements = achievementsList.filter(rec => rec.manpowerId === mp.id);
    const totalAchDays = mpAchievements.length;
    const totalOutputSum = mpAchievements.reduce((sum, rec) => sum + rec.output, 0);
    const totalTargetSum = mpAchievements.reduce((sum, rec) => sum + rec.target, 0);

    const avgOutputPerDay = totalAchDays > 0 ? Math.round(totalOutputSum / totalAchDays) : 0;
    const avgRatePct = totalTargetSum > 0 ? Math.round((totalOutputSum / totalTargetSum) * 100) : 0;

    // 3. Daily trends chart records (recent 12 entries)
    const recentTrends = mpAchievements
      .slice(-12)
      .map(rec => {
        const parts = rec.date.split("-");
        const pct = rec.target > 0 ? Math.round((rec.output / rec.target) * 100) : 0;
        return {
          dateLabel: `${parts[2]}/${parts[1]}`,
          rawDate: rec.date,
          "Output Produk": rec.output,
          "Target": rec.target,
          "Pencapaian (%)": pct
        };
      })
      .sort((a,b) => a.rawDate.localeCompare(b.rawDate));

    return {
      mp,
      attendance: { totalDays, hadir, sakit, izin, alpha, rateHadir, rateSakit, rateIzin, rateAlpha },
      achievements: { totalAchDays, totalOutputSum, avgOutputPerDay, avgRatePct },
      trends: recentTrends
    };

  }, [selectedMpId, manpowerList, attendanceList, achievementsList]);

  // Click handler to open summary
  const handleMpNameClick = (mp: Manpower) => {
    setSelectedMpId(mp.id);
    setIsEditing(false); // Default to viewing stats
  };

  // Open editing form prefilled
  const handleEditClick = () => {
    if (!selectedMpSummary) return;
    const { mp } = selectedMpSummary;
    setEditNik(mp.nik);
    setEditNama(mp.nama);
    setEditProses(mp.proses);
    setEditStatus(mp.status);
    setEditJoinDate(mp.joinDate);
    setIsEditing(true);
  };

  // Save changes
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMpId) return;

    const updated: Manpower = {
      id: selectedMpId,
      nik: editNik,
      nama: editNama,
      proses: editProses,
      status: editStatus,
      joinDate: editJoinDate,
      line: line
    };

    onUpdateManpower(updated);
    setIsEditing(false); // return to normal summary
    setAddMsg(`Biodata "${updated.nama}" berhasil diperbarui!`);
    setTimeout(() => setAddMsg(""), 3000);
  };

  // Delete MP
  const handleDeleteClick = () => {
    if (!selectedMpId || !selectedMpSummary) return;
    const confirm = window.confirm(`Apakah Anda yakin ingin menghapus Manpower "${selectedMpSummary.mp.nama}" dari sistem? Semua data rekap absensi & achievements MP ini juga akan terhapus.`);
    if (confirm) {
      onDeleteManpower(selectedMpId);
      setSelectedMpId(null);
      setIsEditing(false);
    }
  };

  // Filter Table Workers
  const processedWorkers = useMemo(() => {
    return activeWorkers.filter(mp => 
      mp.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mp.nik.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mp.proses.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activeWorkers, searchQuery]);

  // Download Bento PNG image handler
  const handleDownloadImage = async () => {
    if (!bentoCardRef.current || !selectedMpSummary) return;
    try {
      const dataUrl = await toPng(bentoCardRef.current, {
        cacheBust: true,
        backgroundColor: "#0f172a", // Dark background slate-900 style
        style: {
          borderRadius: "16px",
          padding: "24px" // Give beautiful breathing space inside downloaded PNG layout
        }
      });
      const link = document.createElement("a");
      link.download = `SUMMARY_MP_${selectedMpSummary.mp.nama.replace(/\s+/g, "_").toUpperCase()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Gagal mendownload bento image:", error);
    }
  };

  return (
    <div className="space-y-8" id="manpower-panel">
      
      {/* 1. Header Banner Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight font-sans">
            Manajemen Manpower (MP) - {line}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Daftarkan pekerja baru, impor file excel CSV, monitoring masa kerja, serta review grafik pencapaian per individu.
          </p>
        </div>
        
        {/* Trigger daftarkan MP Modal Form */}
        <button
          onClick={() => setIsRegisterOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-extrabold rounded-xl shadow-md cursor-pointer transition-all inline-flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Daftarkan MP Baru
        </button>
      </div>

      {addMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 font-bold rounded-xl text-xs flex items-center shadow-xs animate-fade-in shadow-2xs">
          <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" />
          {addMsg}
        </div>
      )}

      {/* 2. FLOATING WINDOW: PREMIUM HORIZONTAL BENTO STYLE DOSSIER MODAL */}
      {selectedMpSummary && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in" id="mp-bento-modal">
          <div className="w-full max-w-5xl bg-slate-950 border border-slate-800/80 rounded-3xl shadow-2xl overflow-hidden relative">
            
            {/* Modal Heading & Dismiss header bar */}
            <div className="bg-slate-950 border-b border-slate-800/60 px-6 py-4 flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Dossier Bento &mdash; Floating Board</span>
              <button
                onClick={() => setSelectedMpId(null)}
                className="text-xs bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-300 hover:text-white px-3.5 py-1.5 rounded-xl font-mono uppercase font-black cursor-pointer transition-colors"
              >
                Tutup (Esc) &times;
              </button>
            </div>

            <div 
              ref={bentoCardRef}
              id="bento-summary-board"
              className="p-6 md:p-8 text-white relative overflow-hidden bg-slate-950 rounded-b-3xl"
            >
              {/* Elegant dynamic colorful glow backgrounds for bento */}
              <div className="absolute top-[-20%] right-[-20%] w-80 h-80 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
              <div className="absolute bottom-[-20%] left-[-20%] w-80 h-80 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
              <div className="absolute inset-0 bg-radial from-slate-900/40 via-transparent to-transparent pointer-events-none" />

              {/* Bento Title row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5 mb-5 relative z-10 w-full">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xl font-black shrink-0 tracking-tight shadow-lg shadow-blue-500/10 select-none rounded-2xl border border-white/20">
                    {selectedMpSummary.mp.nama.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl md:text-2xl font-black text-white tracking-tighter uppercase font-mono">{selectedMpSummary.mp.nama}</h3>
                      <span className="text-[10px] font-black uppercase tracking-widest bg-blue-600/20 text-blue-400 px-2.5 py-1 rounded-full border border-blue-500/20 font-mono">
                        {selectedMpSummary.mp.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 font-mono uppercase font-bold tracking-wider">NIK: {selectedMpSummary.mp.nik} &bull; Stasiun: {selectedMpSummary.mp.proses}</p>
                  </div>
                </div>

                {/* Bento Controls */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={handleDownloadImage}
                    id="btn-download-bento-img"
                    title="Unduh Bento Card ini sebagai PNG"
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl text-xs font-black inline-flex items-center gap-1.5 transition-all cursor-pointer border border-blue-500/30 shadow-md uppercase tracking-wider active:scale-98"
                  >
                    <FileImage className="h-4 w-4" />
                    Unduh Gambar (PNG)
                  </button>
                  <button
                    onClick={handleEditClick}
                    id="btn-edit-manpower-trigger"
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-black inline-flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-800 shadow-sm uppercase tracking-wider"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit Profil
                  </button>
                  <button 
                    onClick={() => setSelectedMpId(null)}
                    className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Horizontal Bento Blocks Layout (Asymmetric Width Architecture) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 relative z-10 font-mono">
                
                {/* Unit 1: Tenure Card (Span 2) - Compact & rounded */}
                <div className="bg-slate-900/40 backdrop-blur-xs border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between col-span-1 md:col-span-1 lg:col-span-2 shadow-inner">
                  <div>
                    <span className="block text-[9px] font-black uppercase tracking-widest text-slate-500">Masa Kerja</span>
                    <p className="text-2xl font-black text-amber-500 mt-2.5 leading-none uppercase tracking-tighter">
                      {calculateTenure(selectedMpSummary.mp.joinDate)}
                    </p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-slate-800/60 text-[10px] text-slate-450 space-y-1 font-mono uppercase">
                    <div>Join: <span className="font-bold text-slate-200">{selectedMpSummary.mp.joinDate}</span></div>
                    <div>Line: <span className="font-bold text-slate-200">{line}</span></div>
                  </div>
                </div>

                {/* Unit 2: Attendance Rate Gauge (Span 4) - Larger, asymmetrical visual center */}
                <div className="bg-slate-900/40 backdrop-blur-xs border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between col-span-1 md:col-span-1 lg:col-span-4 shadow-inner">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                        <UserCheck className="h-4 w-4 text-emerald-500" />
                        Absensi Rate
                      </span>
                      <span className="text-2xl font-black text-emerald-400 font-mono">{selectedMpSummary.attendance.rateHadir}%</span>
                    </div>

                    <div className="mt-3 bg-slate-950 h-3 border border-slate-800/60 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full" 
                        style={{ width: `${selectedMpSummary.attendance.rateHadir}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 select-none mt-5 text-center font-black">
                    <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-850/80">
                      <span className="block text-[8px] text-slate-500">HADIR</span>
                      <span className="text-sm text-emerald-400">{selectedMpSummary.attendance.hadir}</span>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-850/80">
                      <span className="block text-[8px] text-slate-500">SAKIT</span>
                      <span className="text-sm text-amber-400">{selectedMpSummary.attendance.sakit}</span>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-850/80">
                      <span className="block text-[8px] text-slate-500">IZIN</span>
                      <span className="text-sm text-sky-450 text-sky-400">{selectedMpSummary.attendance.izin}</span>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-850/80">
                      <span className="block text-[8px] text-rose-500">ALPHA</span>
                      <span className="text-sm text-rose-500">{selectedMpSummary.attendance.alpha}</span>
                    </div>
                  </div>
                </div>

                {/* Unit 3: Achievements Output counts (Span 3) - Dynamic summary stats */}
                <div className="bg-slate-900/40 backdrop-blur-xs border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between col-span-1 md:col-span-1 lg:col-span-3 shadow-inner">
                  <div>
                    <span className="block text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                      <Award className="h-4 w-4 text-amber-500" />
                      Kinerja Target
                    </span>
                    <div className="mt-3 flex items-baseline justify-between font-mono">
                      <div>
                        <span className="text-2xl font-black text-white">{selectedMpSummary.achievements.avgOutputPerDay.toLocaleString()}</span>
                        <span className="text-[9px] text-slate-400 ml-1 uppercase">PCS/SHIFT</span>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        selectedMpSummary.achievements.avgRatePct >= 100 
                          ? "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-md" 
                          : "bg-emerald-500 text-slate-950"
                      }`}>
                        {selectedMpSummary.achievements.avgRatePct}%
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800/60 text-[10px] text-slate-450 space-y-0.5 uppercase mb-1">
                    <div>Hari Kerja: <span className="font-bold text-slate-200">{selectedMpSummary.achievements.totalAchDays} Shift</span></div>
                    <div>Total Output: <span className="font-bold text-blue-400">{selectedMpSummary.achievements.totalOutputSum.toLocaleString()} PCS</span></div>
                  </div>
                </div>

                {/* Unit 4: Miniature Graph Line Chart (Span 3) - Custom timeline graph */}
                <div className="bg-slate-900/40 backdrop-blur-xs border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between overflow-hidden col-span-1 md:col-span-2 lg:col-span-3 shadow-inner">
                  <div>
                    <span className="block text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-indigo-400" />
                      Tren Hasil Output
                    </span>
                  </div>

                  <div className="h-24 w-full mt-3 font-mono text-[8px] select-none">
                    {selectedMpSummary.trends.length === 0 ? (
                      <p className="text-[10px] text-slate-500 italic text-center pt-8 uppercase">
                        Belum ada rekap data.
                      </p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart 
                          data={selectedMpSummary.trends}
                          margin={{ top: 5, right: 5, left: -28, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                          <XAxis 
                            dataKey="dateLabel" 
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: '#475569', fontSize: 8, fontWeight: 700 }}
                          />
                          <YAxis 
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: '#475569', fontSize: 8, fontWeight: 700 }}
                          />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-slate-950 p-2.5 text-[9px] rounded-xl border border-slate-800 text-white font-mono leading-none font-bold uppercase shadow-lg">
                                    <p className="text-blue-400">{payload[0].value} pcs</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="Output Produk" 
                            stroke="#3b82f6" 
                            strokeWidth={3} 
                            dot={{ r: 2, fill: '#3b82f6' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. FULL WIDTH MAIN LIST TABLE CONTAINER */}
      <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        
        {/* Search row, Import/CSV row, triggers */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
          <div className="relative w-full xl:max-w-md">
            <Search className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari NIK, nama lengkap, atau stasiun kerja..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="search-manpower-manager"
              className="w-full pl-10 pr-4 py-2 bg-slate-55 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={downloadSampleCSV}
              className="px-3.5 py-2 border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              Format CSV
            </button>

            <label className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors border border-blue-100">
              <Upload className="h-3.5 w-3.5" />
              Impor CSV Excel
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVImport}
                className="hidden"
              />
            </label>

            <button
              onClick={handleSimulateExcelImport}
              className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-indigo-505 text-indigo-500" />
              Simulasi Import
            </button>
          </div>
        </div>

        {/* Informative alert banner helper */}
        <div className="text-xs text-slate-400 font-semibold flex items-center bg-blue-50/50 p-2.5 px-3.5 rounded-xl border border-blue-100/40 gap-1.5 leading-snug">
          <span className="text-blue-600 font-extrabold uppercase tracking-wide px-1 rounded bg-blue-100 inline-block text-[8px] shrink-0 font-mono">Info</span>
          <span>Klik nama karyawan pada daftar tabel di bawah untuk membuka Dossier Bento, mengunduh rekap dossier, atau mengedit biodata profil.</span>
        </div>

        {/* Complete Database table grid */}
        <div name="manpower-list-grid" className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed min-w-[750px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-xs font-black text-slate-605 text-slate-655 text-slate-600 uppercase">
                  <th className="p-3.5 w-[100px]">NIK</th>
                  <th className="p-3.5 w-[200px]">Nama Lengkap</th>
                  <th className="p-3.5 w-[170px]">Stasiun / Proses</th>
                  <th className="p-3.5 w-[110px]">Status</th>
                  <th className="p-3.5 w-[120px]">Join Date</th>
                  <th className="p-3.5 w-[120px] text-right pr-4">Masa Kerja</th>
                </tr>
              </thead>
              <tbody>
                {processedWorkers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-medium italic">
                      Tidak ada Manpower terdaftar untuk baris pencarian ini. Silakan daftarkan manpower baru.
                    </td>
                  </tr>
                ) : (
                  processedWorkers.map(mp => (
                    <tr 
                      key={mp.id} 
                      onClick={() => handleMpNameClick(mp)}
                      className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${
                        selectedMpId === mp.id ? "bg-blue-50/65 hover:bg-blue-50" : ""
                      }`}
                    >
                      <td className="p-3.5 font-mono text-xs font-bold text-slate-600">{mp.nik}</td>
                      <td className="p-3.5 text-sm font-black text-blue-700 hover:underline hover:text-blue-900 truncate font-sans">
                        {mp.nama}
                      </td>
                      <td className="p-3.5 text-xs font-medium text-slate-600 truncate">{mp.proses}</td>
                      <td className="p-3.5 text-xs">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          mp.status === "Karyawan" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                          mp.status === "Magang" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                          mp.status === "HL" ? "bg-indigo-50 text-indigo-700 border border-indigo-100" :
                          "bg-purple-50 text-purple-700 border border-purple-100"
                        }`}>
                          {mp.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-xs font-mono font-medium text-slate-500">{mp.joinDate}</td>
                      <td className="p-3.5 text-xs font-bold text-slate-700 font-sans text-right pr-4">
                        {calculateTenure(mp.joinDate)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-between items-center text-xs text-slate-400 font-mono select-none pt-1">
          <span>Plant: Cikarang-1</span>
          <span>Headcount Terdaftar: <span className="font-bold text-slate-700 font-sans">{activeWorkers.length} MP</span></span>
        </div>

      </div>

      {/* 4. OVERLAY FLOATING WINDOW: DAFTARKAN MANPOWER BARU MODAL */}
      {isRegisterOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="register-manpower-modal">
          <div className="bg-white rounded-xl border border-slate-200 w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5 font-sans">
                  <UserPlus className="h-5 w-5 text-blue-600" />
                  Daftarkan Manpower Baru
                </h3>
                <p className="text-xs text-slate-500 mt-1">Lengkapi biodata penugasan di line: <span className="font-bold">{line}</span></p>
              </div>
              <button 
                onClick={() => setIsRegisterOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Content Form */}
            <form onSubmit={handleSubmitMP} className="flex-1 overflow-y-auto p-5 space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nama Lengkap MP:</label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Heri Setiawan"
                  id="input-mp-nama"
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 font-sans">NIK:</label>
                  <input
                    type="text"
                    required
                    value={nik}
                    onChange={(e) => setNik(e.target.value)}
                    placeholder="Contoh: AC26011"
                    id="input-mp-nik"
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Status Karyawan:</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as MPStatus)}
                    id="input-mp-status"
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                  >
                    <option value="Karyawan">Karyawan</option>
                    <option value="Magang">Magang</option>
                    <option value="HL">HL (Harian Lepas)</option>
                    <option value="PKL">PKL (Vokasional)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Stasiun / Proses Kerja:</label>
                <input
                  type="text"
                  required
                  value={proses}
                  onChange={(e) => setProses(e.target.value)}
                  placeholder="Contoh: Crimping Wire Left"
                  id="input-mp-proses"
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Join Date:</label>
                <input
                  type="date"
                  required
                  value={joinDate}
                  onChange={(e) => setJoinDate(e.target.value)}
                  id="input-mp-joindate"
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-medium text-slate-700"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 font-semibold text-xs rounded-lg hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  id="btn-submit-register-mp"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg active:scale-95 transition-all shadow-md inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" />
                  Simpan Manpower
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 5. OVERLAY FLOATING WINDOW: EDIT PROFIL MP MODAL */}
      {isEditing && selectedMpSummary && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="edit-manpower-modal">
          <div className="bg-white rounded-xl border border-slate-200 w-full max-w-md shadow-2xl flex flex-col p-6 space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <Edit2 className="h-4 w-4 text-slate-500" />
                  Edit Profil Manpower
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-sans">Nama: {selectedMpSummary.mp.nama}</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form content */}
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nama Lengkap:</label>
                <input 
                  type="text" 
                  value={editNama} 
                  onChange={(e) => setEditNama(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 font-sans">NIK:</label>
                  <input 
                    type="text" 
                    value={editNik} 
                    onChange={(e) => setEditNik(e.target.value)}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 font-sans">Status Kepegawaian:</label>
                  <select 
                    value={editStatus} 
                    onChange={(e) => setEditStatus(e.target.value as MPStatus)}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                  >
                    <option value="Karyawan">Karyawan</option>
                    <option value="Magang">Magang</option>
                    <option value="HL">HL</option>
                    <option value="PKL">PKL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Stasiun / Proses Kerja:</label>
                <input 
                  type="text" 
                  value={editProses} 
                  onChange={(e) => setEditProses(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Join Date:</label>
                <input 
                  type="date" 
                  value={editJoinDate} 
                  onChange={(e) => setEditJoinDate(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  required
                />
              </div>

              {/* Dialog commands button panel */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                
                {/* RED DELETE BUTTON */}
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  id="btn-delete-manpower"
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Hapus MP
                </button>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3.5 py-2 border border-slate-200 text-slate-500 hover:text-slate-800 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    id="btn-save-edit-manpower"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg cursor-pointer active:scale-95 transition-all shadow-xs"
                  >
                    Simpan Perubahan
                  </button>
                </div>

              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
