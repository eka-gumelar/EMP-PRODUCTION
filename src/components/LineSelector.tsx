import React from "react";
import { motion } from "motion/react";
import { WorkLine } from "../types";
import { Scissors, Zap, Layers, Network, ChevronRight, ShieldCheck } from "lucide-react";

interface LineSelectorProps {
  onSelectLine: (line: WorkLine) => void;
  manpowerList: Array<{ line: WorkLine }>;
}

export default function LineSelector({ onSelectLine, manpowerList }: LineSelectorProps) {
  const lines: Array<{
    id: WorkLine;
    title: string;
    kanji: string;
    description: string;
    icon: React.ComponentType<any>;
    color: string;
    bgColor: string;
    borderColor: string;
    accentColor: string;
    spec: string;
    stationType: string;
    gradTheme: string;
  }> = [
    {
      id: "Autocutting",
      title: "AUTOCUTTING LINE",
      kanji: "AUTOMATIC CUTTING SYSTEM",
      description: "Sistem pemotongan & pengupasan kabel otomatis berskala presisi tinggi dengan penandaan inkjet otomatis.",
      icon: Scissors,
      color: "text-blue-400",
      bgColor: "bg-gradient-to-br from-blue-950/40 via-slate-900/90 to-slate-950 hover:from-blue-950/60 hover:to-slate-900",
      borderColor: "border-slate-800 hover:border-blue-500/60",
      accentColor: "bg-blue-600",
      spec: "6 CNC CUTTING CENTERS",
      stationType: "SYS-ACUT900",
      gradTheme: "from-blue-500 to-indigo-600"
    },
    {
      id: "Crimping",
      title: "CRIMPING LINE",
      kanji: "HIGH SPEED TERMINAL CRIMPING",
      description: "Pemasangan male/female terminal wire harness kecepatan tinggi dengan uji kekuatan tarik JIS C 2805.",
      icon: Zap,
      color: "text-amber-400",
      bgColor: "bg-gradient-to-br from-amber-950/30 via-slate-900/90 to-slate-950 hover:from-amber-950/50 hover:to-slate-900",
      borderColor: "border-slate-800 hover:border-amber-500/60",
      accentColor: "bg-amber-600",
      spec: "5 PRESS APPLICATORS",
      stationType: "SYS-CRIMP740",
      gradTheme: "from-amber-500 to-orange-600"
    },
    {
      id: "MVVS",
      title: "MVVS SHIELD LINE",
      kanji: "SHIELD NOISE SUSPENSION SYSTEM",
      description: "Proses shielding tembaga, pilin kabel otomotif (twisting), dan isolasi penangkal noise elektromagnetik.",
      icon: Layers,
      color: "text-indigo-400",
      bgColor: "bg-gradient-to-br from-indigo-950/30 via-slate-900/90 to-slate-950 hover:from-indigo-950/50 hover:to-slate-900",
      borderColor: "border-slate-800 hover:border-indigo-500/60",
      accentColor: "bg-indigo-600",
      spec: "4 TWIST & TAPE JIGS",
      stationType: "SYS-SHIELD520",
      gradTheme: "from-indigo-500 to-purple-650"
    },
    {
      id: "Joint & Wire Collect",
      title: "JOINT & WIRE COLLECT LINE",
      kanji: "ULTRASONIC SPLICING & CONNECTION",
      description: "Penyambungan ultrasonik (ultrasonic splicing), perlindungan heatshrink tube, dan final banding harness.",
      icon: Network,
      color: "text-emerald-400",
      bgColor: "bg-gradient-to-br from-emerald-950/30 via-slate-900/90 to-slate-950 hover:from-emerald-950/50 hover:to-slate-900",
      borderColor: "border-slate-800 hover:border-emerald-500/60",
      accentColor: "bg-emerald-600",
      spec: "4 ULTRASONIC SPLICERS",
      stationType: "SYS-JOIN610",
      gradTheme: "from-emerald-500 to-teal-600"
    }
  ];

  // Helper count manpower active
  const getMpCount = (line: WorkLine) => {
    return manpowerList.filter((m) => m.line === line).length;
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8 relative selection:bg-blue-600/35 overflow-hidden">
      
      {/* Dynamic glowing background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-indigo-500/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-blue-500/10 blur-[150px] rounded-full pointer-events-none" />
      
      {/* Dynamic technical clean crosshair background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-40 pointer-events-none" />

      {/* Header bar */}
      <header className="max-w-7xl mx-auto w-full flex justify-between items-center z-12 border-b border-slate-800/80 pb-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white font-black text-sm rounded-xl shadow-lg shadow-red-500/20">M</div>
          <span className="text-xs font-mono tracking-widest text-white font-extrabold uppercase bg-slate-900/60 px-3 py-1.5 rounded-full border border-slate-800">
            MONITOR SYS-CONTROL &bull; CENTRAL PORTAL
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/40 px-3 py-1.5 rounded-full border border-emerald-500/30 shadow-lg shadow-emerald-500/5">
          <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></span>
          <span>STATUS: ONLINE_ACTIVE</span>
        </div>
      </header>

      {/* Central hero text */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-4xl w-full text-left mx-auto my-12 relative z-10 border-l-4 border-blue-500 bg-gradient-to-r from-slate-900/40 to-slate-950/20 p-6 rounded-r-3xl shadow-xl"
      >
        <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-mono font-bold tracking-widest py-1 px-3 rounded-full uppercase shadow-md">
          SYSTEM LEVEL &bull; MONOZUKURI COMPLIANT
        </span>
        
        <h1 className="mt-5 text-3xl sm:text-5xl font-black tracking-tighter text-white font-mono uppercase leading-none">
          WIRE HARNESS PRODUCTION <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-teal-400 font-extrabold">MONITOR &amp; MANPOWER PORTAL</span>
        </h1>
        
        <p className="mt-4 text-xs sm:text-sm text-slate-400 max-w-2xl font-mono leading-relaxed">
          Sistem andon kontrol digital terpadu untuk memonitoring matriks absensi, 
          rencana output kerja per shift, analisis target harian, serta kompetensi proses kerja operator.
        </p>
      </motion.div>

      {/* Grid containing lines: Beautiful rounded cards, premium colorful gradients */}
      <div className="max-w-6xl w-full mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 px-2 relative z-10">
        {lines.map((line, idx) => {
          const IconComponent = line.icon;
          const mpCount = getMpCount(line.id);

          return (
            <motion.button
              key={line.id}
              onClick={() => onSelectLine(line.id)}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              id={`line-btn-${line.id.replace(/\s+/g, "-").toLowerCase()}`}
              className={`flex flex-col text-left p-6 rounded-3xl border border-slate-800/80 ${line.bgColor} ${line.borderColor} shadow-lg hover:shadow-2xl transition-all duration-300 group cursor-pointer relative overflow-hidden`}
            >
              {/* Absolutes for card ambient light */}
              <div className={`absolute top-[-20%] right-[-20%] w-40 h-40 bg-gradient-to-br ${line.gradTheme} opacity-10 blur-3xl rounded-full pointer-events-none group-hover:opacity-20 transition-opacity duration-300`} />

              {/* Corner tech specs line */}
              <div className="absolute right-0 top-0 bg-slate-800/80 backdrop-blur-md rounded-bl-2xl text-[9px] font-mono font-extrabold text-slate-300 px-3.5 py-1.5 uppercase border-l border-b border-slate-700/60">
                {line.stationType}
              </div>

              {/* Upper icon design */}
              <div className="flex items-center gap-4 w-full mb-5">
                <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${line.gradTheme} text-white shrink-0 shadow-lg shadow-slate-950/50`}>
                  <IconComponent className="h-6 w-6 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest">
                    {line.kanji}
                  </h3>
                  <span className="text-xs text-slate-500 font-mono font-bold tracking-widest block mt-0.5">
                    {line.spec}
                  </span>
                </div>
              </div>

              {/* Main title */}
              <h2 className="text-xl sm:text-2xl font-black text-white group-hover:text-blue-400 transition-colors duration-155 tracking-tight font-mono uppercase">
                {line.title}
              </h2>

              {/* Description */}
              <p className="mt-3 text-xs text-slate-400 leading-normal min-h-[3rem] flex-grow font-sans">
                {line.description}
              </p>

              {/* Footer status line with real data counter */}
              <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between w-full font-mono text-xs">
                <div className="flex items-center space-x-2 bg-slate-900/80 px-3.5 py-2 rounded-full border border-slate-800/80">
                  <span className="h-2 w-2 bg-emerald-400 rounded-full inline-block animate-pulse"></span>
                  <span className="font-extrabold text-[#10b981] uppercase tracking-wider text-[10px]">
                    {mpCount} OPERATOR AKTIF
                  </span>
                </div>
                
                <div className="flex items-center text-xs font-black text-blue-400 group-hover:text-blue-300 uppercase tracking-wider gap-0.5 transition-colors">
                  LAUNCH SYSTEM
                  <ChevronRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Footer information */}
      <footer className="mt-14 text-center text-[10px] text-slate-500 font-mono border-t border-slate-800/80 pt-6 max-w-7xl mx-auto w-full relative z-10 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-2 font-bold bg-slate-900/20 px-4 py-1.5 rounded-full border border-slate-800/20">
          <ShieldCheck className="h-4 w-4 text-red-500" />
          <span className="uppercase tracking-wider">HIGH PERFORMANCE INDUSTRIAL PLATFORM &bull; SYSTEM COMPLIANT</span>
        </div>
        <div>
          <span className="uppercase tracking-widest font-black text-slate-600">SYS_V3.6.0-PROD &bull; PREMIUM ROUNDED PORTAL ACCESS</span>
        </div>
      </footer>
    </div>
  );
}
