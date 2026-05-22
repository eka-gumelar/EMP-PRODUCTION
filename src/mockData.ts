import { Manpower, AttendanceRecord, AchievementRecord, WorkLine } from "./types";

// Helper to write date keys
export function formatDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Generate past 14 days of date strings up to today (May 22, 2026)
export function getPastDates(count: number = 15): string[] {
  const dates: string[] = [];
  const baseDate = new Date("2026-05-22");
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() - i);
    dates.push(formatDate(d));
  }
  return dates;
}

// Initial set of Indonesian Manpower across the four Lines
export const INITIAL_MANPOWER: Manpower[] = [];

// Generate comprehensive random history of attendance and performance
export function generateHistoryData(manpowers: Manpower[] = INITIAL_MANPOWER) {
  const dates = getPastDates(15); // Last 15 days
  const attendance: AttendanceRecord[] = [];
  const achievements: AchievementRecord[] = [];

  dates.forEach((date, dateIdx) => {
    // Avoid weekends for manufacturing except occasional ones
    const dayOfWeek = new Date(date).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    manpowers.forEach((mp) => {
      // Determine Attendance with high attendance rate (92% hadir, 3% sakit, 3% izin, 2% alpha)
      let status: AttendanceRecord["status"] = "Hadir";
      if (isWeekend) {
        // High chance of being off, but say 20% work on Saturday
        if (dayOfWeek === 6 && Math.random() > 0.8) {
          status = "Hadir";
        } else {
          return; // Rest day, no records or weekend break
        }
      } else {
        const rand = Math.random();
        if (rand > 0.95) {
          status = "Sakit";
        } else if (rand > 0.91) {
          status = "Izin";
        } else if (rand > 0.89) {
          status = "Tanpa Keterangan";
        }
      }

      attendance.push({
        id: `${mp.id}_${date}`,
        manpowerId: mp.id,
        date,
        status,
        line: mp.line
      });

      // achievements (only if present)
      if (status === "Hadir") {
        const target = mp.line === "Autocutting" ? 1000 : (mp.line === "Crimping" ? 500 : (mp.line === "MVVS" ? 300 : 400));
        // Fluctuation of achievements (some above 100%, some below 100%)
        // We want some >100% (to render RED) and some <100% (to render GREEN) exactly as user requested:
        // "Merah untuk yang > 100%, dan hijau untuk yang < 100%"
        const isHighPerformance = Math.random() > 0.5;
        const ratio = isHighPerformance ? (1.01 + Math.random() * 0.15) : (0.8 + Math.random() * 0.19); // 101% to 116% or 80% to 99%
        const output = Math.round(target * ratio);

        achievements.push({
          id: `ach_${mp.id}_${date}`,
          manpowerId: mp.id,
          date,
          output,
          target,
          line: mp.line
        });
      }
    });
  });

  return { attendance, achievements };
}

export function loadInitialProjectState() {
  const localMPs = localStorage.getItem("monitor_pro_manpower_v2");
  const localAttendance = localStorage.getItem("monitor_pro_attendance_v2");
  const localAchievements = localStorage.getItem("monitor_pro_achievements_v2");

  let manpowers = INITIAL_MANPOWER;
  if (localMPs) {
    try {
      manpowers = JSON.parse(localMPs);
    } catch {
      manpowers = INITIAL_MANPOWER;
    }
  } else {
    localStorage.setItem("monitor_pro_manpower_v2", JSON.stringify(INITIAL_MANPOWER));
  }

  let attendance: AttendanceRecord[] = [];
  let achievements: AchievementRecord[] = [];

  if (localAttendance && localAchievements) {
    try {
      attendance = JSON.parse(localAttendance);
      achievements = JSON.parse(localAchievements);
    } catch {
      const generated = generateHistoryData(manpowers);
      attendance = generated.attendance;
      achievements = generated.achievements;
      localStorage.setItem("monitor_pro_attendance_v2", JSON.stringify(attendance));
      localStorage.setItem("monitor_pro_achievements_v2", JSON.stringify(achievements));
    }
  } else {
    const generated = generateHistoryData(manpowers);
    attendance = generated.attendance;
    achievements = generated.achievements;
    localStorage.setItem("monitor_pro_attendance_v2", JSON.stringify(attendance));
    localStorage.setItem("monitor_pro_achievements_v2", JSON.stringify(achievements));
  }

  return { manpowers, attendance, achievements };
}

export function saveProjectState(manpowers: Manpower[], attendance: AttendanceRecord[], achievements: AchievementRecord[]) {
  localStorage.setItem("monitor_pro_manpower_v2", JSON.stringify(manpowers));
  localStorage.setItem("monitor_pro_attendance_v2", JSON.stringify(attendance));
  localStorage.setItem("monitor_pro_achievements_v2", JSON.stringify(achievements));
}
