import React, { useState, useMemo, useEffect } from "react";
import { WorkLine, GenbaMachineCheckRecord } from "../types";
import { formatDate } from "../mockData";
import { 
  ClipboardCheck, 
  Calendar, 
  Search, 
  ArrowUpDown, 
  CheckCircle2, 
  XOctagon, 
  Filter,
  Check,
  ShieldCheck,
  Zap,
  Layers,
  Plus,
  Trash2,
  FileSpreadsheet,
  Upload,
  Settings,
  X,
  RefreshCw,
  HelpCircle
} from "lucide-react";

interface ChecksheetGenbaManagerProps {
  line: WorkLine;
  genbaList: GenbaMachineCheckRecord[];
  onSaveGenba: (records: GenbaMachineCheckRecord[]) => void;
}

// Preset template for demonstrative Kaizen machines (optional sample)
const DEMO_MACHINES_BY_LINE: Record<WorkLine, string[]> = {
  "Autocutting": [
    "Komax Alpha AC-01",
    "Komax Alpha AC-02",
    "Shinmaywa S-01",
    "Bobbin Roller BR-03",
    "Auto Stripper AS-04"
  ],
  "Crimping": [
    "Crimper Press CP-01",
    "Crimper Press CP-02",
    "Tensile Tester TT-01",
    "Strip Stripper SS-02",
    "Visual Applicator VA-05"
  ],
  "MVVS": [
    "Shielding Stripper MS-01",
    "Taping Shield TS-02",
    "Twister Joint TJ-03",
    "Visual Analyzer VA-04"
  ],
  "Joint & Wire Collect": [
    "Ultrasonic Welder UW-01",
    "Heatshrink Oven HO-02",
    "Solder Station SS-03",
    "Bundling Collector BC-04"
  ]
};

export default function ChecksheetGenbaManager({
  line,
  genbaList,
  onSaveGenba
}: ChecksheetGenbaManagerProps) {
  const todayStr = "2026-05-22"; // Simulated today's date
  const formattedTodayIndo = "Jumat, 22 Mei 2026";

  // State to manage list of machines per line, initial state is EMPTY as requested ("yang sekarang kosongkan")
  const [machinesRegistry, setMachinesRegistry] = useState<Record<WorkLine, string[]>>(() => {
    const saved = localStorage.getItem("monitor_pro_genba_machines_v2");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          return parsed;
        }
      } catch (e) {
        // Fallback to empty if json is corrupt
      }
    }
    // Return empty by default as per instruction ("yang sekarang kosongkan")
    return {
      "Autocutting": [],
      "Crimping": [],
      "MVVS": [],
      "Joint & Wire Collect": []
    };
  });

  // Toggle state for Today Form and Management Panel
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Form states for adding machines
  const [manualMachineName, setManualMachineName] = useState("");
  const [pastedText, setPastedText] = useState("");

  const [formSuccessMsg, setFormSuccessMsg] = useState("");
  const [configSuccessMsg, setConfigSuccessMsg] = useState("");
  const [configErrorMsg, setConfigErrorMsg] = useState("");

  // Search and Sort
  const [searchQuery, setSearchQuery] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Date Filter Range (Default 7 days ago to today)
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date("2026-05-22");
    d.setDate(d.getDate() - 7);
    return formatDate(d);
  });
  const [dateTo, setDateTo] = useState("2026-05-22");

  // Retrieve active machines for the current selected line reactively
  const activeMachines = useMemo(() => {
    return machinesRegistry[line] || [];
  }, [machinesRegistry, line]);

  // Handle updates to draft states when today checksheet is opened
  const [formDraft, setFormDraft] = useState<Record<string, { s5: "OK" | "NG"; checksheet: "OK" | "NG"; kehadiranMP: "OK" | "NG" }>>({});

  // Sync draft whenever activeMachines or form changes
  useEffect(() => {
    const initial: Record<string, { s5: "OK" | "NG"; checksheet: "OK" | "NG"; kehadiranMP: "OK" | "NG" }> = {};
    activeMachines.forEach(mach => {
      // Find historical record of today
      const existing = genbaList.find(r => r.machineName === mach && r.date === todayStr && r.line === line);
      if (existing) {
        initial[mach] = { s5: existing.s5, checksheet: existing.checksheet, kehadiranMP: existing.kehadiranMP };
      } else {
        initial[mach] = { s5: "OK", checksheet: ("OK" as const), kehadiranMP: ("OK" as const) };
      }
    });
    setFormDraft(initial);
  }, [activeMachines, genbaList, line]);

  // Save changes to localStorage helper
  const saveMachinesRegistry = (registry: Record<WorkLine, string[]>) => {
    setMachinesRegistry(registry);
    localStorage.setItem("monitor_pro_genba_machines_v2", JSON.stringify(registry));
  };

  // Toggle individual draft points
  const togglePoint = (machine: string, point: "s5" | "checksheet" | "kehadiranMP") => {
    setFormDraft(prev => {
      const currentVal = prev[machine] ? prev[machine][point] : "OK";
      return {
        ...prev,
        [machine]: {
          ...(prev[machine] || { s5: "OK", checksheet: "OK", kehadiranMP: "OK" }),
          [point]: currentVal === "OK" ? "NG" : "OK"
        }
      };
    });
  };

  const handleOpenTodayChecksheet = () => {
    setIsFormOpen(prev => !prev);
    setFormSuccessMsg("");
  };

  // Confirm and Save Checksheets to App Root
  const handleConfirmChecksheet = () => {
    if (activeMachines.length === 0) {
      setConfigErrorMsg("Tidak ada mesin untuk diisi. Pasang mesin terlebih dahulu.");
      return;
    }

    const recordsToSave: GenbaMachineCheckRecord[] = activeMachines.map((mach, i) => {
      const draft = formDraft[mach] || { s5: "OK", checksheet: "OK", kehadiranMP: "OK" };
      return {
        id: `genba_${line.replace(/\s+/g, "_")}_${mach.replace(/\s+/g, "_")}_${todayStr}`,
        machineId: `mach-${line}-${i}`,
        machineName: mach,
        date: todayStr,
        s5: draft.s5,
        checksheet: draft.checksheet,
        kehadiranMP: draft.kehadiranMP,
        line: line
      };
    });

    onSaveGenba(recordsToSave);
    setFormSuccessMsg("Checksheet Genba Hari Ini berhasil disimpan!");
    
    setTimeout(() => {
      setIsFormOpen(false);
      setFormSuccessMsg("");
    }, 1500);
  };

  // Manual Add Machine Name
  const handleAddManual = () => {
    const nameInput = manualMachineName.trim();
    if (!nameInput) {
      setConfigErrorMsg("Nama mesin tidak boleh kosong!");
      setTimeout(() => setConfigErrorMsg(""), 3050);
      return;
    }

    const currentMachines = machinesRegistry[line] || [];
    if (currentMachines.includes(nameInput)) {
      setConfigErrorMsg("Nama mesin tersebut sudah terdaftar di line ini!");
      setTimeout(() => setConfigErrorMsg(""), 3050);
      return;
    }

    const updated = {
      ...machinesRegistry,
      [line]: [...currentMachines, nameInput]
    };
    saveMachinesRegistry(updated);
    setManualMachineName("");
    setConfigSuccessMsg(`Berhasil menambah mesin "${nameInput}" secara manual.`);
    setTimeout(() => setConfigSuccessMsg(""), 3050);
  };

  // Import Clipboard Copy-Paste (Split by newline/comas/tabs)
  const handleImportClipboard = () => {
    const rawText = pastedText.trim();
    if (!rawText) {
      setConfigErrorMsg("Silakan paste data/kolom nama mesin terlebih dahulu!");
      setTimeout(() => setConfigErrorMsg(""), 3050);
      return;
    }

    const parsedNames: string[] = [];
    const rows = rawText.split(/\r?\n/);

    rows.forEach(r => {
      // Clean string
      const cells = r.split(/[\t,;]/); // Split by tabs or commas
      const firstCell = cells[0]?.replace(/["']/g, "").trim();
      if (firstCell && firstCell.length > 0 && !parsedNames.includes(firstCell)) {
        parsedNames.push(firstCell);
      }
    });

    if (parsedNames.length === 0) {
      setConfigErrorMsg("Gagal mengurai teks! Silakan cek kembali baris yang dimasukkan.");
      setTimeout(() => setConfigErrorMsg(""), 3000);
      return;
    }

    const currentMachines = machinesRegistry[line] || [];
    const merged = Array.from(new Set([...currentMachines, ...parsedNames]));

    const updated = {
      ...machinesRegistry,
      [line]: merged
    };
    saveMachinesRegistry(updated);
    setPastedText("");
    setConfigSuccessMsg(`Sukses mengimport ${parsedNames.length} mesin dari data pasted!`);
    setTimeout(() => setConfigSuccessMsg(""), 3500);
  };

  // Import from Excel/CSV/TXT upload
  const handleExcelImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setConfigErrorMsg("Gagal membaca file atau file kosong.");
        setTimeout(() => setConfigErrorMsg(""), 3050);
        return;
      }

      const parsedNames: string[] = [];
      const lines = text.split(/\r?\n/);

      lines.forEach(l => {
        const cleaned = l.replace(/["']/g, "").trim();
        const firstCol = cleaned.split(/[,\t;]/)[0]?.trim();
        if (firstCol && firstCol.length > 0 && !parsedNames.includes(firstCol)) {
          parsedNames.push(firstCol);
        }
      });

      if (parsedNames.length === 0) {
        setConfigErrorMsg("Tidak menemukan nama mesin yang valid dalam file.");
        setTimeout(() => setConfigErrorMsg(""), 3000);
        return;
      }

      const current = machinesRegistry[line] || [];
      const merged = Array.from(new Set([...current, ...parsedNames]));

      const updated = {
        ...machinesRegistry,
        [line]: merged
      };
      saveMachinesRegistry(updated);
      setConfigSuccessMsg(`Selesai mengimport ${parsedNames.length} nama mesin dari file!`);
      setTimeout(() => setConfigSuccessMsg(""), 3500);
    };

    reader.onerror = () => {
      setConfigErrorMsg("Kesalahan membaca file.");
      setTimeout(() => setConfigErrorMsg(""), 3000);
    };

    reader.readAsText(file);
  };

  // Delete single machine helper
  const handleDeleteSingle = (targetName: string) => {
    const current = machinesRegistry[line] || [];
    const filtered = current.filter(m => m !== targetName);
    const updated = {
      ...machinesRegistry,
      [line]: filtered
    };
    saveMachinesRegistry(updated);
    setConfigSuccessMsg(`Hapus ${targetName} berhasil.`);
    setTimeout(() => setConfigSuccessMsg(""), 2000);
  };

  // Clean all machines for current line
  const handleClearAll = () => {
    if (window.confirm(`Hapus seluruh mesin dan mengosongkan checksheet di area ${line}?`)) {
      const updated = {
        ...machinesRegistry,
        [line]: []
      };
      saveMachinesRegistry(updated);
      setConfigSuccessMsg("Seluruh mesin di area ini berhasil dikosongkan.");
      setTimeout(() => setConfigSuccessMsg(""), 2500);
    }
  };

  // Demo loading helper
  const handleLoadDemoPresets = () => {
    const demo = DEMO_MACHINES_BY_LINE[line] || [];
    const updated = {
      ...machinesRegistry,
      [line]: demo
    };
    saveMachinesRegistry(updated);
    setConfigSuccessMsg(`Berhasil memuat ${demo.length} demo preset mesin untuk line ${line}.`);
    setTimeout(() => setConfigSuccessMsg(""), 2500);
  };

  // Daily list of dates
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

  // Map and group checksheet status matrix for table rows
  const tableRows = useMemo(() => {
    return activeMachines.map(mach => {
      const machineRecords = genbaList.filter(
        rec => rec.machineName === mach && rec.line === line && dateRangeList.includes(rec.date)
      );

      const dateStatusMap: Record<string, { s5: "OK" | "NG"; checksheet: "OK" | "NG"; kehadiranMP: "OK" | "NG" }> = {};
      machineRecords.forEach(rec => {
        dateStatusMap[rec.date] = { s5: rec.s5, checksheet: rec.checksheet, kehadiranMP: rec.kehadiranMP };
      });

      return {
        machineName: mach,
        dateStatusMap
      };
    });
  }, [activeMachines, genbaList, line, dateRangeList]);

  // Filter & Sort Row Results
  const processedTableRows = useMemo(() => {
    let filtered = tableRows.filter(row => 
      row.machineName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    filtered.sort((a, b) => {
      const comp = a.machineName.localeCompare(b.machineName);
      return sortDirection === "asc" ? comp : -comp;
    });

    return filtered;
  }, [tableRows, searchQuery, sortDirection]);

  const toggleSort = () => {
    setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
  };

  return (
    <div className="space-y-8" id="checksheet-genba-panel">
      
      {/* Page Title & Manage Toggle bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight font-sans">
            Checksheet Genba Shift - {line}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Mencakup kesiapan 5S, checksheet lembar kontrol mesin, dan kesiapan personil/kehadiran manpower (MP).
          </p>
        </div>

        {/* Configurations toggle */}
        <button
          onClick={() => setIsConfigOpen(!isConfigOpen)}
          id="btn-configures-machines"
          className={`px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer inline-flex items-center gap-2 border ${
            isConfigOpen
              ? "bg-amber-100 border-amber-300 text-amber-900"
              : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-150"
          }`}
        >
          <Settings className={`h-4 w-4 ${isConfigOpen ? "animate-spin" : ""}`} />
          <span>{isConfigOpen ? "Selesai Mengatur Mesin" : "Kelola & Import Mesin"}</span>
          <span className="bg-slate-250 bg-slate-200 text-slate-800 rounded px-1.5 py-0.5 text-[9px] font-mono leading-none">
            {activeMachines.length} Mesin
          </span>
        </button>
      </div>

      {/* DYNAMIC COLLAPSIBLE PANEL: CONFIGURATION & EXCEL IMPORT */}
      {isConfigOpen && (
        <div 
          id="panel-configures-machines-card"
          className="bg-slate-50 rounded-2xl border-2 border-slate-200 p-6 space-y-6 animate-fade-in shadow-2xs"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Settings className="h-5 w-5 text-slate-600" />
                Pengaturan List Mesin & Import (Excel/CSV)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Atur nama mesin yang beroperasi di {line}. Status checksheet otomatis kosong di awal ("yang sekarang kosongkan").
              </p>
            </div>
            <button
              onClick={() => setIsConfigOpen(false)}
              className="p-1 rounded bg-slate-200 text-slate-600 hover:bg-slate-300 transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Flash notifications inside setting */}
          {configSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs rounded-lg flex items-center">
              <Check className="h-4 w-4 text-emerald-600 mr-2 shrink-0" />
              <span>{configSuccessMsg}</span>
            </div>
          )}

          {configErrorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 font-bold text-xs rounded-lg flex items-center">
              <XOctagon className="h-4 w-4 text-rose-600 mr-2 shrink-0" />
              <span>{configErrorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* BARIS L: Active list in line */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Mesin Aktif ({activeMachines.length})
                </span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-rose-600 hover:text-rose-800 text-[10px] font-bold focus:outline-none flex items-center gap-1 leading-none transition-all"
                >
                  <Trash2 className="h-3 w-3" />
                  Kosongkan Line
                </button>
              </div>

              {activeMachines.length === 0 ? (
                <div className="text-center py-8 px-2 bg-slate-50 rounded-lg border border-dashed border-slate-250">
                  <p className="text-xs text-slate-400 italic">Tidak ada mesin terdaftar.</p>
                  <button 
                    type="button"
                    onClick={handleLoadDemoPresets}
                    className="mt-3 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] rounded border border-indigo-200 cursor-pointer inline-flex items-center gap-1 transition-all"
                  >
                    <RefreshCw className="h-2.5 w-2.5" />
                    Muat Contoh Default
                  </button>
                </div>
              ) : (
                <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1 border border-slate-100 p-1.5 rounded bg-slate-50/50">
                  {activeMachines.map((mach, i) => (
                    <div 
                      key={mach + "_" + i} 
                      className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded border border-slate-150 text-xs font-mono font-medium text-slate-700"
                    >
                      <span className="truncate mr-2">{mach}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteSingle(mach)}
                        className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BARIS M: Manual addition */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Tambah Mesin Secara Manual
              </span>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-450 block mb-1">Nama Mesin Baru</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Komax Alpha AC-01"
                    value={manualMachineName}
                    onChange={(e) => setManualMachineName(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-800"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddManual}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg active:scale-98 transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tambah Sekarang
                </button>
              </div>

              {/* Informative guidelines */}
              <div className="bg-slate-55 p-3 rounded-lg border border-slate-150 bg-slate-50 text-[10px] text-slate-500 leading-relaxed font-sans">
                💡 <span className="font-semibold text-slate-700">Tips:</span> Masukkan format nama mesin secara konsisten agar rekap bulanan di tabel bawah terlihat rapi.
              </div>
            </div>

            {/* BARIS R: Import Excel / COPY PASTE */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Unggah/Import Excel & Clipboard
              </span>

              <div className="space-y-3">
                {/* File input uploader */}
                <div>
                  <label className="text-[10px] font-bold text-slate-450 block mb-1">
                    Format File: Excel CSV (.csv) / Teks (.txt)
                  </label>
                  <div className="relative border border-dashed border-slate-300 rounded-lg p-2 bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-all cursor-pointer">
                    <input
                      type="file"
                      accept=".csv, .txt"
                      onChange={handleExcelImportFile}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="text-center">
                      <Upload className="h-4 w-4 text-slate-400 mx-auto mb-1" />
                      <span className="text-[10px] font-medium text-slate-600">Klik / Seret File CSV di sini</span>
                    </div>
                  </div>
                </div>

                {/* Paste Textarea */}
                <div>
                  <label className="text-[10px] font-bold text-slate-450 block mb-1">
                    Atau Paste Kolom Excel Anda langsung:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Pasted baris kolom berisi nama mesin..."
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    className="w-full text-[10px] p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-850 bg-slate-50/50"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleImportClipboard}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg active:scale-98 transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Import Kolom Pasted
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* CARD 1: Isi checksheet hari ini */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Isi Checksheet Genba Hari Ini</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tanggal Operasional: <span className="font-semibold text-slate-700">{formattedTodayIndo}</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenTodayChecksheet}
            id="btn-trigger-form-checks"
            className={`px-5 py-2.5 font-bold text-sm rounded-xl transition-all shadow-xs inline-flex items-center cursor-pointer ${
              isFormOpen 
                ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                : "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-98"
            }`}
          >
            <Layers className="h-4 w-4 mr-2" />
            {isFormOpen ? "Tutup Form Isian" : "Isi Checksheet Hari Ini"}
          </button>
        </div>

        {/* Dynamic Card Form (Saat di-klik akan muncul card baru untuk form ini) */}
        {isFormOpen && (
          <div 
            id="today-checksheet-form-card"
            className="border-2 border-indigo-100 bg-indigo-50/10 p-5 rounded-xl animate-fade-in space-y-4"
          >
            <div className="border-b border-indigo-50/50 pb-3">
              <h4 className="text-sm font-black text-indigo-900 flex items-center gap-1.5 uppercase tracking-wider">
                <ShieldCheck className="h-4.5 w-4.5 text-indigo-600" />
                Daftar Checksheet Mesin & Line Area
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">Berikan tanda centang (OK) atau kosongkan (NG) pada elemen checksheet yang diperiksa hari ini.</p>
            </div>

            {activeMachines.length === 0 ? (
              <div className="text-center py-8 px-4 bg-slate-50 rounded-lg border border-dashed border-slate-250 space-y-3">
                <p className="text-sm text-slate-500 font-medium italic">
                  Belum ada nama mesin terdaftar untuk line {line}.
                </p>
                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsConfigOpen(true)}
                    className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold text-xs rounded-lg active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Kelola & Tambah Mesin
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadDemoPresets}
                    className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-bold text-xs rounded-lg active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Muat Demo Preset
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeMachines.map(mach => {
                  const draft = formDraft[mach] || { s5: "OK", checksheet: "OK", kehadiranMP: "OK" };

                  return (
                    <div 
                      key={mach}
                      className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-black text-slate-800 font-mono tracking-tight">{mach}</span>
                        <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></div>
                      </div>

                      {/* 3 Parameter Rows */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        
                        {/* Box 1: 5S */}
                        <button
                          type="button"
                          onClick={() => togglePoint(mach, "s5")}
                          className={`p-2 rounded-lg border text-xs flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                            draft.s5 === "OK"
                              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                              : "bg-rose-50 border-rose-200 text-rose-800 font-bold"
                          }`}
                        >
                          <span className="text-[10px] font-bold text-slate-450 uppercase">5S (Ringkas)</span>
                          <span className={`text-[11px] font-black inline-flex items-center gap-0.5 ${draft.s5 === "OK" ? "text-emerald-700" : "text-rose-700"}`}>
                            {draft.s5 === "OK" ? <Check className="h-3 w-3" /> : "✗"} {draft.s5}
                          </span>
                        </button>

                        {/* Box 2: Checksheet */}
                        <button
                          type="button"
                          onClick={() => togglePoint(mach, "checksheet")}
                          className={`p-2 rounded-lg border text-xs flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                            draft.checksheet === "OK"
                              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                              : "bg-rose-50 border-rose-200 text-rose-800 font-bold"
                          }`}
                        >
                          <span className="text-[10px] font-bold text-slate-450 uppercase">Checksheet</span>
                          <span className={`text-[11px] font-black inline-flex items-center gap-0.5 ${draft.checksheet === "OK" ? "text-emerald-700" : "text-rose-700"}`}>
                            {draft.checksheet === "OK" ? <Check className="h-3 w-3" /> : "✗"} {draft.checksheet}
                          </span>
                        </button>

                        {/* Box 3: Kehadiran MP */}
                        <button
                          type="button"
                          onClick={() => togglePoint(mach, "kehadiranMP")}
                          className={`p-2 rounded-lg border text-xs flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                            draft.kehadiranMP === "OK"
                              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                              : "bg-rose-50 border-rose-200 text-rose-800 font-bold"
                          }`}
                        >
                          <span className="text-[10px] font-bold text-slate-450 uppercase">Kehadiran MP</span>
                          <span className={`text-[11px] font-black inline-flex items-center gap-0.5 ${draft.kehadiranMP === "OK" ? "text-emerald-700" : "text-rose-700"}`}>
                            {draft.kehadiranMP === "OK" ? <Check className="h-3 w-3" /> : "✗"} {draft.kehadiranMP}
                          </span>
                        </button>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Success message flash */}
            {formSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs rounded-lg flex items-center shadow-2xs animate-fade-in">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 mr-2 shrink-0" />
                <span>{formSuccessMsg}</span>
              </div>
            )}

            {/* Confirmation Buttons */}
            <div className="pt-2 border-t border-slate-200/50 flex justify-end gap-3">
              <button
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-800 font-semibold text-xs rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
              >
                Tutup / Batal
              </button>
              <button
                onClick={handleConfirmChecksheet}
                id="btn-confirm-genba-sheet"
                disabled={activeMachines.length === 0}
                className={`px-5 py-2.5 font-bold text-xs rounded-lg active:scale-95 transition-all shadow-md cursor-pointer flex items-center justify-center ${
                  activeMachines.length === 0 
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed opacity-55"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                }`}
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Konfirmasi Checksheet Area
              </button>
            </div>

          </div>
        )}
      </div>

      {/* FILTER CALENDAR AND REKAP GRID */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-6">
        
        {/* Date Filter & Search Machine Input */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <Filter className="h-4 w-4 text-indigo-500" />
              <span>Rentang Rekap Tanggal</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                id="genba-date-from"
                className="text-sm bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium font-mono"
              />
              <span className="text-slate-400 text-sm font-semibold">s/d</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                id="genba-date-to"
                className="text-sm bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium font-mono"
              />
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari mesin area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="search-machine-genba"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

        </div>

        {/* Legend block */}
        <div className="flex flex-wrap gap-4 text-xs font-semibold py-1 border-y border-slate-50 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-slate-400 uppercase text-[10px] tracking-wider font-bold">Legend Tanda Cell:</span>
            <span className="flex items-center gap-1 bg-slate-105 bg-slate-100 p-1 rounded font-mono border text-[10px]">
              <span className="text-emerald-700 font-black">5S</span> | <span className="text-emerald-700 font-black">Ck</span> | <span className="text-emerald-700 font-black">Mp</span>
            </span>
            <span className="text-slate-400">Dimana:</span>
            <span className="flex items-center"><span className="h-4.5 px-1.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] inline-flex items-center justify-center font-bold mr-1 mx-0.5">✔</span> OK</span>
            <span className="flex items-center"><span className="h-4.5 px-1.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-[10px] inline-flex items-center justify-center font-bold mr-1 mx-0.5">✗</span> NG</span>
            <span className="flex items-center"><span className="h-4.5 px-1.5 rounded bg-slate-100 border border-slate-200 text-slate-400 text-[10px] inline-flex items-center justify-center font-bold mr-1 mx-0.5">-</span> Belum Diisi</span>
          </div>
          <div className="text-slate-400">
            Total Target Mesin: <span className="text-indigo-600 font-bold">{processedTableRows.length} Unit</span>
          </div>
        </div>

        {/* REKAP CHECKSHEET TABLE ENVELOPE */}
        <div name="genba-recap-table-envelope" className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto w-full relative">
            <table className="w-full text-left border-collapse table-fixed min-w-[700px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200">
                  
                  {/* FREEZED Leftmost column header - Machine Name */}
                  <th className="sticky left-0 bg-slate-100 text-xs font-extrabold text-slate-700 uppercase p-3 border-r border-slate-200 w-[200px] z-20">
                    <button
                      onClick={toggleSort}
                      className="flex items-center space-x-1 hover:text-slate-900 font-bold focus:outline-none w-full text-left"
                    >
                      <span>Nama Mesin (Freezed)</span>
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </th>

                  {/* Daily list headers */}
                  {dateRangeList.map(dateStr => {
                    const parts = dateStr.split("-");
                    const dateNum = parts[2]; // DD
                    const dayLabel = new Date(dateStr).toLocaleDateString("id-ID", { weekday: "short" });

                    return (
                      <th 
                        key={dateStr}
                        className="text-center text-xs font-bold text-slate-600 p-2.5 border-r border-slate-200 font-mono w-[110px]"
                      >
                        <div>{dateNum}</div>
                        <div className="text-[10px] font-sans font-medium text-slate-450 uppercase">{dayLabel}</div>
                      </th>
                    );
                  })}

                </tr>
              </thead>
              
              <tbody>
                {processedTableRows.length === 0 ? (
                  <tr>
                    <td 
                      colSpan={dateRangeList.length + 1}
                      className="p-8 text-center text-slate-400 font-medium italic bg-slate-50/50"
                    >
                      {activeMachines.length === 0 
                        ? `Belum ada nama mesin diatur untuk area ${line}. Gunakan panel "Kelola & Import Mesin" di kanan atas.`
                        : "Tidak ada data checksheet mesin diketemukan atau silakan ubah kata kunci mesin pencarian."
                      }
                    </td>
                  </tr>
                ) : (
                  processedTableRows.map(row => (
                    <tr key={row.machineName} className="hover:bg-slate-50/60 border-b border-slate-100">
                      
                      {/* FREEZED Left column machine labels */}
                      <td className="sticky left-0 bg-white font-bold p-3 border-r border-slate-200 z-10 w-[200px] break-words whitespace-normal text-slate-800 text-xs text-left">
                        <span className="font-extrabold text-slate-800">{row.machineName}</span>
                      </td>

                      {/* Daily values showing parameter values s5, checksheet, kehadiranMP */}
                      {dateRangeList.map(dateStr => {
                        const cellData = row.dateStatusMap[dateStr];
                        const isLogged = cellData !== undefined;

                        if (!isLogged) {
                          return (
                            <td 
                              key={dateStr}
                              className="text-center p-2 border-r border-slate-200 border-b border-slate-100 bg-slate-50/30 text-slate-300 font-mono text-xs"
                            >
                              -
                            </td>
                          );
                        }

                        // Determine cell status backgrounds
                        const allOk = cellData.s5 === "OK" && cellData.checksheet === "OK" && cellData.kehadiranMP === "OK";
                        const cellBg = allOk ? "bg-emerald-50/40" : "bg-rose-50/20";

                        return (
                          <td 
                            key={dateStr}
                            className={`p-1.5 border-r border-slate-200 border-b border-slate-100 text-[10px] ${cellBg}`}
                          >
                            <div className="flex flex-col gap-1 items-stretch justify-center font-bold">
                              
                              {/* 5S Status */}
                              <div className="flex items-center justify-between px-1 bg-white rounded border border-slate-100 leading-none py-0.5">
                                <span className="text-slate-400 text-[8px] uppercase">5S:</span>
                                <span className={cellData.s5 === "OK" ? "text-emerald-700" : "text-rose-700 font-black"}>
                                  {cellData.s5 === "OK" ? "✔" : "✗"}
                                </span>
                              </div>

                              {/* Checksheet Status */}
                              <div className="flex items-center justify-between px-1 bg-white rounded border border-slate-100 leading-none py-0.5">
                                <span className="text-slate-400 text-[8px] uppercase">Chk:</span>
                                <span className={cellData.checksheet === "OK" ? "text-emerald-700" : "text-rose-700 font-black"}>
                                  {cellData.checksheet === "OK" ? "✔" : "✗"}
                                </span>
                              </div>

                              {/* Kehadiran MP Status */}
                              <div className="flex items-center justify-between px-1 bg-white rounded border border-slate-100 leading-none py-0.5">
                                <span className="text-slate-400 text-[8px] uppercase">Mp:</span>
                                <span className={cellData.kehadiranMP === "OK" ? "text-emerald-700" : "text-rose-700 font-black"}>
                                  {cellData.kehadiranMP === "OK" ? "✔" : "✗"}
                                </span>
                              </div>

                            </div>
                          </td>
                        );
                      })}

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
