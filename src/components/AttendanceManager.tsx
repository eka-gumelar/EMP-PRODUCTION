import { useState, useMemo, useEffect } from "react";
import { Manpower, AttendanceRecord, AttendanceStatus, WorkLine } from "../types";
import { formatDate, getPastDates } from "../mockData";
import { 
  Calendar, 
  Search, 
  ArrowUpDown, 
  CheckCircle2, 
  ClipboardCheck, 
  HelpCircle,
  FileCheck2,
  Filter,
  Users
} from "lucide-react";

interface AttendanceManagerProps {
  line: WorkLine;
  manpowerList: Manpower[];
  attendanceList: AttendanceRecord[];
  onSaveAttendance: (records: AttendanceRecord[]) => void;
}

export default function AttendanceManager({
  line,
  manpowerList,
  attendanceList,
  onSaveAttendance
}: AttendanceManagerProps) {
  
  const todayStr = "2026-05-22"; // Static simulated today
  const formattedTodayIndo = "Jumat, 22 Mei 2026";

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formDraft, setFormDraft] = useState<Record<string, AttendanceStatus>>({});
  const [formSuccessMsg, setFormSuccessMsg] = useState("");

  // Date filters: from 7 days ago to today
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date("2026-05-22");
    d.setDate(d.getDate() - 7);
    return formatDate(d);
  });
  const [dateTo, setDateTo] = useState("2026-05-22");

  // Search states
  const [searchQuery, setSearchQuery] = useState("");

  // Sort states: 'nama' | 'persentase'
  const [sortCol, setSortCol] = useState<"nama" | "persentase">("nama");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Load line workers
  const activeWorkers = useMemo(() => {
    return manpowerList.filter(mp => mp.line === line);
  }, [manpowerList, line]);

  // Handle opening form - prefill all active workers with 'Hadir'
  const handleOpenForm = () => {
    const draft: Record<string, AttendanceStatus> = {};
    activeWorkers.forEach(mp => {
      // If there is already a record for today, prefill with existing, otherwise default to "Hadir"
      const existing = attendanceList.find(r => r.manpowerId === mp.id && r.date === todayStr);
      draft[mp.id] = existing ? existing.status : "Hadir";
    });
    setFormDraft(draft);
    setIsFormOpen(true);
    setFormSuccessMsg("");
  };

  const handleStatusChange = (mpId: string, status: AttendanceStatus) => {
    setFormDraft(prev => ({
      ...prev,
      [mpId]: status
    }));
  };

  // Confirm and submit attendance
  const handleConfirmAttendance = () => {
    const newRecords: AttendanceRecord[] = activeWorkers.map(mp => ({
      id: `${mp.id}_${todayStr}`,
      manpowerId: mp.id,
      date: todayStr,
      status: formDraft[mp.id] || "Hadir",
      line: line
    }));

    onSaveAttendance(newRecords);
    setFormSuccessMsg(`Absensi untuk ${activeWorkers.length} Manpower berhasil disimpan!`);
    
    // Auto-close form after a brief delay
    setTimeout(() => {
      setIsFormOpen(false);
      setFormSuccessMsg("");
    }, 2000);
  };

  // Generate date array between dateFrom and dateTo (inclusive)
  const dateRangeList = useMemo(() => {
    const list: string[] = [];
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    
    // Safety guard to avoid infinite loop
    let loops = 0;
    while (start <= end && loops < 100) {
      list.push(formatDate(start));
      start.setDate(start.getDate() + 1);
      loops++;
    }
    return list;
  }, [dateFrom, dateTo]);

  // Process tabular data: For each worker, calculate status for each date and overall attendance percentage
  const tableData = useMemo(() => {
    return activeWorkers.map(mp => {
      // Get all records of this worker in specified range
      const mpRecords = attendanceList.filter(
        rec => rec.manpowerId === mp.id && dateRangeList.includes(rec.date)
      );

      // Create attendance status record index
      const dateMap: Record<string, AttendanceStatus> = {};
      mpRecords.forEach(rec => {
        dateMap[rec.date] = rec.status;
      });

      // Calculate percentage: (Hadir count / Total logged active days minus GH days) * 100
      // Weekend excluded from percentage calculations if unrecorded, to keep statistics honest.
      const nonGHRecords = mpRecords.filter(rec => rec.status !== "GH");
      const totalLoggedDays = nonGHRecords.length;
      const presentCount = nonGHRecords.filter(rec => rec.status === "Hadir").length;
      const percentage = totalLoggedDays > 0 ? Math.round((presentCount / totalLoggedDays) * 100) : 100;

      return {
        manpower: mp,
        dateMap,
        percentage,
        presentCount,
        totalLoggedDays
      };
    });
  }, [activeWorkers, attendanceList, dateRangeList]);

  // Table filtering and sorting
  const processedTableData = useMemo(() => {
    // 1. Search Query filter (Case Insensitive)
    let filtered = tableData.filter(row => 
      row.manpower.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.manpower.nik.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // 2. Sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortCol === "nama") {
        comparison = a.manpower.nama.localeCompare(b.manpower.nama);
      } else if (sortCol === "persentase") {
        comparison = a.percentage - b.percentage;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [tableData, searchQuery, sortCol, sortDirection]);

  // Sorting handler
  const handleSort = (col: "nama" | "persentase") => {
    if (sortCol === col) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDirection("asc");
    }
  };

  return (
    <div className="space-y-8" id="attendance-panel">
      
      {/* Title block */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight font-sans">
          Manajemen Absensi Manpower - {line}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Lakukan pengisian absensi harian dan rekap pencatatan kehadiran manpower pabrik.
        </p>
      </div>

      {/* Box 1: Tombol Isi Absensi */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Pencatatan Absensi Hari Ini
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tanggal Operasional: <span className="font-semibold text-slate-700">{formattedTodayIndo}</span>
              </p>
            </div>
          </div>
          
          <button
            onClick={handleOpenForm}
            id="btn-isi-absensi-hari-ini"
            className="px-5 py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700 active:scale-98 transition-all shadow-xs inline-flex items-center justify-center cursor-pointer"
          >
            <Users className="h-4 w-4 mr-2" />
            Isi Absensi Hari Ini
          </button>
        </div>

        {/* Floating Attendance Entry Form Dialog */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="form-isi-absensi">
            <div className="bg-white rounded-xl border border-slate-200 w-full max-w-xl shadow-2xl flex flex-col max-h-[85vh]">
              
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-blue-600" />
                    Pencatatan Absensi Harian
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">Line: <span className="font-semibold text-slate-700">{line}</span> &bull; {formattedTodayIndo}</p>
                </div>
                <button 
                  onClick={() => setIsFormOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 text-sm font-semibold transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Modal Content container */}
              <div className="p-5 overflow-y-auto space-y-3 flex-1 bg-slate-50/50">
                {activeWorkers.length === 0 ? (
                  <p className="text-sm text-slate-500 py-8 font-medium italic text-center bg-white rounded-xl border border-slate-200">
                    Belum ada Manpower terdaftar di line {line}.<br />Silakan tambahkan MP di menu Manajemen MP terlebih dahulu.
                  </p>
                ) : (
                  <>
                    <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Daftar Manpower ({activeWorkers.length} MP)</h5>
                    <div className="space-y-2.5">
                      {activeWorkers.map((mp, index) => (
                        <div 
                          key={mp.id} 
                          className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200/60 shadow-2xs gap-3"
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <span className="text-xs font-semibold text-slate-400 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200/50 shrink-0">
                              {index + 1}
                            </span>
                            <div className="truncate">
                              <p className="text-sm font-bold text-slate-800 truncate">{mp.nama}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">NIK: {mp.nik} &bull; {mp.proses}</p>
                            </div>
                          </div>

                          {/* Status Dropdown Selector */}
                          <select
                            value={formDraft[mp.id] || "Hadir"}
                            onChange={(e) => handleStatusChange(mp.id, e.target.value as AttendanceStatus)}
                            id={`absensi-select-${mp.id}`}
                            className="text-xs bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-bold shrink-0"
                          >
                            <option value="Hadir">Hadir (H)</option>
                            <option value="Sakit">Sakit (S)</option>
                            <option value="Izin">Izin (I)</option>
                            <option value="Tanpa Keterangan">Alpha (A)</option>
                            <option value="GH">Ganti Hari (GH)</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Success flash message */}
                {formSuccessMsg && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold rounded-lg flex items-center animate-pulse mt-2 shadow-2xs">
                    <FileCheck2 className="h-4 w-4 mr-2 text-emerald-600 shrink-0" />
                    <span>{formSuccessMsg}</span>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 bg-white rounded-b-xl flex flex-col gap-2.5">
                <p className="text-[10px] text-slate-400 leading-normal text-center">
                  *Default diatur ke 'Hadir'. Pastikan mengisi izin / sakit dengan teliti sebelum mengirimkan data.
                </p>
                <div className="flex items-center justify-end space-x-3.5">
                  <button
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-500 font-semibold text-xs rounded-lg hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleConfirmAttendance}
                    id="btn-confirm-absensi"
                    disabled={activeWorkers.length === 0}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg active:scale-95 transition-all shadow-xs flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Simpan Absensi
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Box 2: Filter Kalender, Search, and Rekap Excel Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-6">
        
        {/* Subtitle & Search Group */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          
          {/* Calendar Range Picker */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <Filter className="h-4 w-4 text-blue-500" />
              <span>Rentang Tanggal</span>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                id="input-date-from"
                className="text-sm bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium font-mono"
              />
              <span className="text-slate-400 text-sm font-semibold">s/d</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                id="input-date-to"
                className="text-sm bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium font-mono"
              />
            </div>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari manpower..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="search-manpower-absensi"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Informative Legend index */}
        <div className="flex flex-wrap gap-4 text-xs font-semibold py-1 border-y border-slate-50 items-center justify-between">
          <div className="flex flex-wrap gap-3">
            <span className="text-slate-400 uppercase">Keterangan Cell:</span>
            <span className="flex items-center"><span className="h-4 w-6 rounded bg-emerald-150 border border-emerald-300 text-emerald-800 text-[10px] inline-flex items-center justify-center font-bold mr-1.5 font-mono">H</span> Hadir</span>
            <span className="flex items-center"><span className="h-4 w-6 rounded bg-amber-150 border border-amber-300 text-amber-800 text-[10px] inline-flex items-center justify-center font-bold mr-1.5 font-mono">S</span> Sakit</span>
            <span className="flex items-center"><span className="h-4 w-6 rounded bg-sky-150 border border-sky-300 text-sky-800 text-[10px] inline-flex items-center justify-center font-bold mr-1.5 font-mono">I</span> Izin</span>
            <span className="flex items-center"><span className="h-4 w-6 rounded bg-rose-150 border border-rose-300 text-rose-800 text-[10px] inline-flex items-center justify-center font-bold mr-1.5 font-mono">A</span> Alpha</span>
            <span className="flex items-center"><span className="h-4 w-8 rounded bg-purple-100 border border-purple-200 text-purple-800 text-[10px] inline-flex items-center justify-center font-bold mr-1.5 font-mono">GH</span> Ganti Hari (Libur)</span>
            <span className="flex items-center"><span className="h-4 w-6 rounded bg-slate-100 border border-slate-200 text-slate-400 text-[10px] inline-flex items-center justify-center font-bold mr-1.5 font-mono">-</span> Libur</span>
          </div>
          <div className="text-slate-400">
            Total Manpower: <span className="text-slate-700 font-bold">{processedTableData.length} MP</span>
          </div>
        </div>

        {/* Main Sticky Column Excel-style Scrollable Grid */}
        <div name="attendance-recap-grid" className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto w-full relative">
            <table className="w-full text-left border-collapse table-fixed min-w-[700px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200">
                  {/* FREEZED Leftmost Column Header: Manpower Name */}
                  <th className="sticky left-0 bg-slate-100 text-xs font-bold text-slate-700 uppercase p-3 border-r border-slate-200 w-[180px] z-20">
                    <button
                      onClick={() => handleSort("nama")}
                      className="flex items-center space-x-1 hover:text-slate-900 font-semibold focus:outline-none w-full text-left"
                    >
                      <span>Nama Manpower</span>
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </th>

                  {/* Date columns headers */}
                  {dateRangeList.map(dateStr => {
                    const parts = dateStr.split("-");
                    const dateNum = parts[2]; // DD
                    const dayNameShort = new Date(dateStr).toLocaleDateString("id-ID", { weekday: "short" });

                    return (
                      <th 
                        key={dateStr}
                        className="text-center text-xs font-bold text-slate-600 p-2.5 border-r border-slate-200 font-mono w-[60px]"
                      >
                        <div>{dateNum}</div>
                        <div className="text-[10px] font-sans font-medium text-slate-400 whitespace-nowrap">{dayNameShort}</div>
                      </th>
                    );
                  })}

                  {/* FREEZED Rightmost Column Header: Attendance Rate */}
                  <th className="sticky right-0 bg-slate-100 text-center text-xs font-bold text-slate-700 uppercase p-3 border-l border-slate-200 w-[120px] z-20 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                    <button
                      onClick={() => handleSort("persentase")}
                      className="flex items-center justify-center space-x-1 hover:text-slate-900 font-semibold focus:outline-none w-full"
                    >
                      <span>Rate (%)</span>
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </th>
                </tr>
              </thead>

              <tbody>
                {processedTableData.length === 0 ? (
                  <tr>
                    <td 
                      colSpan={dateRangeList.length + 2} 
                      className="p-8 text-center text-slate-400 font-medium italic"
                    >
                      Data manpower tidak ditemukan atau belum ada catatan absensi untuk rentang tanggal ini.
                    </td>
                  </tr>
                ) : (
                  processedTableData.map(row => (
                    <tr key={row.manpower.id} className="hover:bg-slate-50/60 border-b border-slate-100">
                      
                      {/* FREEZED Leftmost Column: Employee Names sticky */}
                      <td className="sticky left-0 bg-white font-bold p-3 border-r border-slate-200 z-10 w-[180px] break-words whitespace-normal text-slate-800 text-sm">
                        <div className="font-bold text-slate-800">{row.manpower.nama}</div>
                        <div className="text-[10px] font-mono text-slate-400 font-medium mt-0.5">{row.manpower.nik}</div>
                      </td>

                      {/* Daily records cells */}
                      {dateRangeList.map(dateStr => {
                        const status = row.dateMap[dateStr];
                        const dayOfWeek = new Date(dateStr).getDay();
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                        // Styling and character based on status
                        let symbol = "-";
                        let cellStyle = "bg-slate-50/30 text-slate-300";

                        if (status === "Hadir") {
                          symbol = "H";
                          cellStyle = "bg-emerald-50 text-emerald-700 font-bold border-emerald-100";
                        } else if (status === "Sakit") {
                          symbol = "S";
                          cellStyle = "bg-amber-50 text-amber-700 font-bold border-amber-100";
                        } else if (status === "Izin") {
                          symbol = "I";
                          cellStyle = "bg-sky-50 text-sky-700 font-bold border-sky-100";
                        } else if (status === "Tanpa Keterangan") {
                          symbol = "A"; // Alpha
                          cellStyle = "bg-rose-50 text-rose-700 font-bold border-rose-100";
                        } else if (status === "GH") {
                          symbol = "GH";
                          cellStyle = "bg-purple-50 text-purple-700 font-bold border-purple-150";
                        } else if (isWeekend) {
                          symbol = "L"; // Libur
                          cellStyle = "bg-slate-100/50 text-slate-400 font-medium";
                        }

                        return (
                          <td 
                            key={dateStr}
                            className={`text-center p-2.5 border-r border-slate-200 text-xs font-mono border-b border-slate-100 ${cellStyle}`}
                          >
                            <span className="inline-flex items-center justify-center w-full h-full">
                              {symbol}
                            </span>
                          </td>
                        );
                      })}

                      {/* FREEZED Rightmost Column Cell: Percentage */}
                      <td className="sticky right-0 bg-white text-center p-3 border-l border-slate-200 font-mono font-bold z-10 w-[120px] shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)] text-slate-800 text-sm">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full ${
                          row.percentage >= 95 ? 'bg-emerald-50 text-emerald-700' :
                          row.percentage >= 90 ? 'bg-blue-50 text-blue-700' :
                          row.percentage >= 75 ? 'bg-amber-50 text-amber-700' :
                          'bg-rose-50 text-rose-750'
                        }`}>
                          {row.percentage}%
                        </span>
                        <div className="text-[9px] font-sans font-medium text-slate-400 mt-1">
                          {row.presentCount}/{row.totalLoggedDays} hari
                        </div>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
