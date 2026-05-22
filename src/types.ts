export type WorkLine = "Autocutting" | "Crimping" | "MVVS" | "Joint & Wire Collect";

export type MPStatus = "Karyawan" | "Magang" | "HL" | "PKL";

export interface Manpower {
  id: string; // Unique GUID
  nik: string; // NIK ID
  nama: string; // Full Name
  proses: string; // Job Process/Station
  status: MPStatus; // Status (Karyawan, Magang, HL, PKL)
  joinDate: string; // YYYY-MM-DD
  line: WorkLine; // Associated Line
}

export type AttendanceStatus = "Hadir" | "Sakit" | "Izin" | "Tanpa Keterangan" | "GH";

export interface AttendanceRecord {
  id: string; // Unique ID (manpowerId + "_" + date)
  manpowerId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  line: WorkLine;
}

export interface AchievementRecord {
  id: string; // Unique ID
  manpowerId: string;
  date: string; // YYYY-MM-DD
  output: number; // Actual pcs
  target: number; // Target pcs
  line: WorkLine;
}

export interface LineOutputTrend {
  date: string; // YYYY-MM-DD
  actual: number;
  standar: number;
}

export interface GenbaMachineCheckRecord {
  id: string; // Unique ID (machineId + "_" + date)
  machineId: string;
  machineName: string;
  date: string; // YYYY-MM-DD
  s5: "OK" | "NG";
  checksheet: "OK" | "NG";
  kehadiranMP: "OK" | "NG";
  line: WorkLine;
}
