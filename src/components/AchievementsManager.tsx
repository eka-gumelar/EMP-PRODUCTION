import React, { useState, useMemo, useRef } from "react";
import { Manpower, AchievementRecord, WorkLine } from "../types";
import { formatDate } from "../mockData";
import { 
  Award, 
  Calendar, 
  Search, 
  ArrowUpDown, 
  CheckCircle, 
  FileImage, 
  UploadCloud, 
  RefreshCw, 
  HelpCircle,
  TrendingUp,
  AlertCircle,
  FileSpreadsheet,
  FileSpreadsheet as ExcelIcon
} from "lucide-react";

interface AchievementsManagerProps {
  line: WorkLine;
  manpowerList: Manpower[];
  achievementsList: AchievementRecord[];
  onSaveAchievements: (records: AchievementRecord[]) => void;
}

export default function AchievementsManager({
  line,
  manpowerList,
  achievementsList,
  onSaveAchievements
}: AchievementsManagerProps) {

  const todayStr = "2026-05-22"; // Simulated today
  const formattedTodayIndo = "Jumat, 22 Mei 2026";

  // Form toggles
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formDraft, setFormDraft] = useState<Record<string, { output: string; target: string }>>({});
  const [formSuccessMsg, setFormSuccessMsg] = useState("");

  // OCR upload states
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Date filters: from 7 days ago to today
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date("2026-05-22");
    d.setDate(d.getDate() - 7);
    return formatDate(d);
  });
  const [dateTo, setDateTo] = useState("2026-05-22");

  // Search states
  const [searchQuery, setSearchQuery] = useState("");

  // Sort states: 'nama' | 'totalOutput'
  const [sortCol, setSortCol] = useState<"nama" | "totalOutput">("nama");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Load line workers
  const activeWorkers = useMemo(() => {
    return manpowerList.filter(mp => mp.line === line);
  }, [manpowerList, line]);

  // Open & prefill form
  const handleOpenForm = () => {
    const draft: Record<string, { output: string; target: string }> = {};
    activeWorkers.forEach(mp => {
      // Find latest standard output target of the line
      const defaultTarget = line === "Autocutting" ? "1000" : (line === "Crimping" ? "500" : (line === "MVVS" ? "300" : "400"));
      const existing = achievementsList.find(a => a.manpowerId === mp.id && a.date === todayStr);

      draft[mp.id] = {
        output: existing ? String(existing.output) : "",
        target: existing ? String(existing.target) : defaultTarget
      };
    });
    setFormDraft(draft);
    setIsFormOpen(true);
    setFormSuccessMsg("");
    setOcrError("");
  };

  const handleInputChange = (mpId: string, field: "output" | "target", val: string) => {
    setFormDraft(prev => ({
      ...prev,
      [mpId]: {
        ...prev[mpId],
        [field]: val
      }
    }));
  };

  // Submit manual form data
  const handleConfirmAchievements = () => {
    const newRecords: AchievementRecord[] = activeWorkers.map(mp => {
      const data = formDraft[mp.id] || { output: "0", target: "100" };
      const output = Math.max(0, parseInt(data.output, 10) || 0);
      const target = Math.max(1, parseInt(data.target, 10) || 100);

      return {
        id: `ach_${mp.id}_${todayStr}`,
        manpowerId: mp.id,
        date: todayStr,
        output,
        target,
        line: line
      };
    });

    onSaveAchievements(newRecords);
    setFormSuccessMsg(`Data performance achievements untuk ${activeWorkers.length} Manpower berhasil terekam!`);
    
    setTimeout(() => {
      setIsFormOpen(false);
      setFormSuccessMsg("");
    }, 2000);
  };

  // OCR screenshot file processor
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    await processOcrImage(file);
  };

  // Process image with Gemini API through backend
  const processOcrImage = async (file: File) => {
    setIsOcrLoading(true);
    setOcrError("");
    setFormSuccessMsg("");

    try {
      // Ensure file is an image
      if (!file.type.startsWith("image/")) {
        throw new Error("File yang diupload harus berupa gambar screenshot (PNG/JPEG)!");
      }

      // Convert image file to Base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      // Trigger server endpoint
      const response = await fetch("/api/ocr-achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: file.type
        })
      });

      if (!response.ok) {
        const errorJson = await response.json();
        throw new Error(errorJson.error || "Gagal menghubungi Gemini AI untuk memproses berkas.");
      }

      const result = await response.json();
      if (!result.success || !result.data) {
        throw new Error("Struktur respon AI tidak sesuai format.");
      }

      const parsedData: Array<{ nama: string; output: number; target: number }> = result.data;

      // Prepare target form draft list
      const draft: Record<string, { output: string; target: string }> = {};
      
      // Seed with initial manual state in case some name is not found
      activeWorkers.forEach(mp => {
        const defaultTarget = line === "Autocutting" ? "1000" : (line === "Crimping" ? "500" : (line === "MVVS" ? "300" : "400"));
        draft[mp.id] = { output: "", target: defaultTarget };
      });

      // Match extracted names with active lines manpower list
      let matchedCount = 0;
      parsedData.forEach(ocrItem => {
        const matchedMP = activeWorkers.find(mp => 
          mp.nama.toLowerCase().includes(ocrItem.nama.toLowerCase()) || 
          ocrItem.nama.toLowerCase().includes(mp.nama.toLowerCase())
        );

        if (matchedMP) {
          draft[matchedMP.id] = {
            output: String(ocrItem.output),
            target: String(ocrItem.target)
          };
          matchedCount++;
        }
      });

      setFormDraft(draft);
      setIsFormOpen(true); // Open form containing achievements
      setFormSuccessMsg(`Gemini AI berhasil mendeteksi ${matchedCount} dari ${activeWorkers.length} Manpower dari tangkapan layar screenshot! Silakan tinjau dan klik konfirmasi di bawah.`);

    } catch (err: any) {
      console.error(err);
      setOcrError(err.message || "Gagal mendeteksi teks gambar. Silakan isi secara manual.");
    } finally {
      setIsOcrLoading(false);
      // Reset input value to allow uploading same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const triggerUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Generate date list in range
  const dateRangeList = useMemo(() => {
    const list: string[] = [];
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    
    let loops = 0;
    while (start <= end && loops < 100) {
      list.push(formatDate(start));
      start.setDate(start.getDate() + 1);
      loops++;
    }
    return list;
  }, [dateFrom, dateTo]);

  // Aggregate stats per manpower
  const tableData = useMemo(() => {
    return activeWorkers.map(mp => {
      // Find all achievement records for this manpower in range
      const mpRecords = achievementsList.filter(
        rec => rec.manpowerId === mp.id && dateRangeList.includes(rec.date)
      );

      // Map daily record details
      const dateRecordMap: Record<string, { output: number; target: number; rate: number }> = {};
      let totalOutput = 0;

      mpRecords.forEach(rec => {
        const rate = rec.target > 0 ? Math.round((rec.output / rec.target) * 100) : 0;
        dateRecordMap[rec.date] = { output: rec.output, target: rec.target, rate };
        totalOutput += rec.output;
      });

      return {
        manpower: mp,
        dateRecordMap,
        totalOutput,
        avgRate: mpRecords.length > 0 
          ? Math.round(mpRecords.reduce((sum, rec) => sum + (rec.target > 0 ? (rec.output / rec.target) * 100 : 0), 0) / mpRecords.length)
          : 0
      };
    });
  }, [activeWorkers, achievementsList, dateRangeList]);

  // Process filtering and sorting on aggregated performance table
  const processedTableData = useMemo(() => {
    let filtered = tableData.filter(row => 
      row.manpower.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.manpower.nik.toLowerCase().includes(searchQuery.toLowerCase())
    );

    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortCol === "nama") {
        comparison = a.manpower.nama.localeCompare(b.manpower.nama);
      } else if (sortCol === "totalOutput") {
        comparison = a.totalOutput - b.totalOutput;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [tableData, searchQuery, sortCol, sortDirection]);

  const handleSort = (col: "nama" | "totalOutput") => {
    if (sortCol === col) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDirection("asc");
    }
  };

  return (
    <div className="space-y-8" id="achievements-panel">
      
      {/* Header text */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight font-sans">
          Pencapaian Target / Achievements - {line}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Lacak produktivitas output harian manpower dengan input manual maupun integrasi AI pembaca tabel screenshot excel.
        </p>
      </div>

      {/* Grid forms on top: Manual Entry & AI Screen Scanner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 align-stretch">
        
        {/* Card Manual Entry trigger */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl w-fit">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Isi Achievements Hari Ini
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Input kuantitas output standar pabrik per manpower.
              </p>
              <p className="text-xs font-semibold text-slate-600 mt-2 font-mono bg-slate-50 px-2 py-1 rounded inline-block border border-slate-100">
                {formattedTodayIndo}
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenForm}
            id="btn-isi-achievements-hari-ini"
            className="mt-6 w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-semibold text-sm rounded-xl transition-all shadow-xs inline-flex items-center justify-center cursor-pointer"
          >
            <Award className="h-4 w-4 mr-2" />
            Input Form Kinerja Harian
          </button>
        </div>

        {/* Card Screen Scanner AI OCR uploader */}
        <div id="ai-ocr-card" className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-150 shadow-xs flex flex-col justify-between relative overflow-hidden bg-slate-50/20">
          {/* Subtle AI sparkle logo decorator */}
          <div className="absolute right-4 top-4 opacity-5 pointer-events-none">
            <UploadCloud className="h-32 w-32" />
          </div>

          <div className="space-y-3">
            <div className="p-2.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl w-fit flex items-center space-x-1.5">
              <UploadCloud className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider">AI Gemini DocuScan</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Upload Screenshot Spreadsheet Excel
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                Unggah tangkapan layar (screenshot) tabel daftar manpower dan jumlah pencapaian target harian mereka. Sistem AI Gemini kami akan memindai gambar, secara otomatis menyaring nama-nama pekerja di line {line}, dan mengisi output & target harian mereka.
              </p>
            </div>
          </div>

          {/* Upload Drop Zone Drag action wrapper */}
          <div className="mt-4 flex items-center gap-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageFileChange}
              accept="image/*"
              className="hidden"
            />
            
            <button
              onClick={triggerUploadClick}
              disabled={isOcrLoading}
              id="btn-upload-screenshot-ach"
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 active:scale-98 text-white text-sm font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
            >
              {isOcrLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Menganalisis Gambar...
                </>
              ) : (
                <>
                  <FileImage className="h-4 w-4" />
                  Pilih Gambar & Deteksi Otomatis
                </>
              )}
            </button>
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              Format didukung: PNG, JPG, WEBP • Ukuran maks 10MB
            </span>
          </div>

          {ocrError && (
            <div className="mt-3 p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-bold flex items-center">
              <AlertCircle className="h-4 w-4 mr-1.5 text-rose-600" />
              {ocrError}
            </div>
          )}
        </div>

      </div>      {/* Embedded Form for manual review matching OCR or direct edit */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="form-isi-achievements">
          <div className="bg-white rounded-xl border border-slate-200 w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Isi Data Hasil Kinerja Output Manpower
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

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-3.5 flex-1 bg-slate-50/50">
              {activeWorkers.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 italic text-center font-medium bg-white rounded-xl border border-slate-200">
                  Belum ada Manpower terdaftar di line {line}. Silakan tambahkan MP di Manajemen MP terlebih dahulu.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {activeWorkers.map((mp, index) => {
                    const data = formDraft[mp.id] || { output: "", target: "" };
                    const outNum = parseInt(data.output, 10) || 0;
                    const tgNum = parseInt(data.target, 10) || 1;
                    const pct = Math.round((outNum / tgNum) * 100);

                    return (
                      <div 
                        key={mp.id} 
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-white rounded-xl border border-slate-200/60 shadow-2xs gap-3"
                      >
                        <div className="flex items-center space-x-3 w-52 shrink-0 truncate">
                          <span className="text-xs font-bold text-slate-400 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200/50">
                            {index + 1}
                          </span>
                          <div className="truncate">
                            <p className="text-xs font-extrabold text-slate-800 truncate">{mp.nama}</p>
                            <p className="text-[9px] text-slate-400 font-mono">NIK: {mp.nik}</p>
                          </div>
                        </div>

                        {/* Inputs Fields for output & target side by side */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center space-x-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Target:</span>
                            <input
                              type="number"
                              min="1"
                              value={data.target}
                              onChange={(e) => handleInputChange(mp.id, "target", e.target.value)}
                              id={`ach-target-input-${mp.id}`}
                              className="bg-slate-50 border border-slate-200 rounded-lg p-1 px-1.5 w-16 text-xs font-bold font-mono text-center focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-slate-400 text-[9px] font-mono">pcs</span>
                          </div>

                          <div className="flex items-center space-x-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Aktual:</span>
                            <input
                              type="number"
                              min="0"
                              value={data.output}
                              onChange={(e) => handleInputChange(mp.id, "output", e.target.value)}
                              id={`ach-output-input-${mp.id}`}
                              className="bg-slate-50 border border-slate-200 rounded-lg p-1 px-1.5 w-16 text-xs font-black font-mono text-center focus:ring-2 focus:ring-blue-500 text-blue-700"
                            />
                            <span className="text-slate-400 text-[9px] font-mono">pcs</span>
                          </div>

                          {/* Dynamic percentage */}
                          <div className="flex items-center min-w-[40px] justify-end">
                            <span className={`text-[10px] font-black font-mono px-1.5 py-0.5 rounded ${
                              pct < 100 ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            }`}>
                              {pct}%
                            </span>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

              {/* Success message */}
              {formSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs font-bold flex items-start animate-fade-in">
                  <CheckCircle className="h-4 w-4 mr-1.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>{formSuccessMsg}</span>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-white rounded-b-xl flex flex-col gap-2.5">
              <p className="text-[9px] text-slate-400 text-center">
                *Tinjau dengan teliti angka target & realisasi sebelum mengklik konfirmasi.
              </p>
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="px-3.5 py-2 border border-slate-200 text-slate-500 font-semibold text-xs rounded-lg hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmAchievements}
                  id="btn-confirm-achievements"
                  disabled={activeWorkers.length === 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg active:scale-95 transition-all shadow-xs flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                  Simpan Achievements
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Box Grid excel table for rekap target achievements */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-6">
        
        {/* Date Filter & Search layout */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span>Rentang Rekap Target</span>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                id="input-date-from-ach"
                className="text-sm bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium font-mono"
              />
              <span className="text-slate-400 text-sm font-semibold">s/d</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                id="input-date-to-ach"
                className="text-sm bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium font-mono"
              />
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari manpower..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="search-manpower-achievements"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Informative index legend */}
        <div className="flex flex-wrap gap-4 text-xs font-semibold py-1 border-y border-slate-50 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-slate-400 uppercase">Keterangan Legend Cell:</span>
            <span className="flex items-center"><span className="h-4 w-10 text-[9px] rounded bg-rose-50 border border-rose-200 text-rose-700 inline-flex items-center justify-center font-bold mr-1.5 font-mono">&lt;100%</span> Merah (Kurang dari Target)</span>
            <span className="flex items-center"><span className="h-4 w-10 text-[9px] rounded bg-emerald-50 border border-emerald-200 text-emerald-700 inline-flex items-center justify-center font-bold mr-1.5 font-mono">&ge;100%</span> Hijau (Mencapai/Melebihi Target)</span>
            <span className="flex items-center"><span className="h-4 w-10 text-[9px] rounded bg-slate-150 border border-slate-200 text-slate-500 inline-flex items-center justify-center font-bold mr-1.5 font-mono">-</span> Tidak Hadir / Off</span>
          </div>
          <div className="text-slate-400 font-mono">
            Line Target Rate: <span className="text-slate-700 font-bold">{processedTableData.length} MP</span>
          </div>
        </div>

        {/* Excel styled sticky column scroll table */}
        <div name="ach-recap-grid" className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto w-full relative">
            <table className="w-full text-left border-collapse table-fixed min-w-[700px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200">
                  {/* FREEZED Leftmost Column Sticky Name */}
                  <th className="sticky left-0 bg-slate-100 text-xs font-black text-slate-700 uppercase p-3 border-r border-slate-200 w-[180px] z-20">
                    <button
                      onClick={() => handleSort("nama")}
                      className="flex items-center space-x-1 hover:text-slate-900 font-semibold focus:outline-none w-full text-left"
                    >
                      <span>Nama Manpower</span>
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </th>

                  {/* Date range daily columns */}
                  {dateRangeList.map(dateStr => {
                    const parts = dateStr.split("-");
                    return (
                      <th 
                        key={dateStr}
                        className="text-center text-xs font-bold text-slate-600 p-2.5 border-r border-slate-200 font-mono w-[80px]"
                      >
                        <div>{parts[2]}</div>
                        <div className="text-[9px] font-sans font-medium text-slate-400">{new Date(dateStr).toLocaleDateString("id-ID", { weekday: "short" })}</div>
                      </th>
                    );
                  })}

                  {/* FREEZED Rightmost sticky column Total Output */}
                  <th className="sticky right-0 bg-slate-100 text-center text-xs font-black text-slate-700 uppercase p-3 border-l border-slate-200 w-[130px] z-20 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                    <button
                      onClick={() => handleSort("totalOutput")}
                      className="flex items-center justify-center space-x-1 hover:text-slate-900 font-semibold focus:outline-none w-full"
                    >
                      <span>Total Output</span>
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
                      Data tak ditemukan atau absensi target belum diisi untuk tanggal ini.
                    </td>
                  </tr>
                ) : (
                  processedTableData.map(row => (
                    <tr key={row.manpower.id} className="hover:bg-slate-50/60 border-b border-slate-100">
                      
                      {/* FREEZED Left name cell */}
                      <td className="sticky left-0 bg-white font-bold p-3 border-r border-slate-200 z-10 w-[180px] break-words whitespace-normal text-slate-800 text-sm">
                        <div className="font-bold text-slate-800">{row.manpower.nama}</div>
                        <div className="text-[10px] font-mono text-slate-400 font-medium mt-0.5">{row.manpower.nik}</div>
                      </td>

                      {/* Daily targets cells */}
                      {dateRangeList.map(dateStr => {
                        const recData = row.dateRecordMap[dateStr];
                        const isRecorded = recData !== undefined;

                        // Conditional backdrop coloring
                        // Under < 100% is Merah (Red)
                        // At or over >= 100% is Hijau (Green)
                        let cellStyle = "bg-slate-50/30 text-slate-300";
                        let labelNode: React.ReactNode = "-";

                        if (isRecorded) {
                          const { output, rate } = recData;
                          if (rate < 100) {
                            cellStyle = "bg-rose-55 bg-rose-50 text-rose-700 font-bold border-rose-100";
                          } else {
                            cellStyle = "bg-emerald-55 bg-emerald-50 text-emerald-700 font-bold border-emerald-100";
                          }
                          labelNode = (
                            <div className="flex flex-col items-center justify-center leading-none py-1">
                              <span className="text-[10px] font-black">{output} pcs</span>
                              <span className="text-[9px] opacity-75 font-semibold font-mono mt-0.5">{rate}%</span>
                            </div>
                          );
                        }

                        return (
                          <td 
                            key={dateStr}
                            className={`text-center p-1 border-r border-slate-200 border-b border-slate-100 ${cellStyle}`}
                          >
                            {labelNode}
                          </td>
                        );
                      })}

                      {/* FREEZED right total output sticky cell */}
                      <td className="sticky right-0 bg-white text-center p-3 border-l border-slate-200 font-mono font-bold z-10 w-[130px] shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)] text-slate-800 text-sm">
                        <span className="text-sm font-black text-slate-800 block">
                          {row.totalOutput.toLocaleString()}
                        </span>
                        <span className="text-[9px] font-sans font-medium text-slate-400 block text-center">
                          Avg: {row.avgRate}%
                        </span>
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
