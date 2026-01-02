// Utility untuk mengambil data hari libur dari API libur.deno.dev

interface HolidayData {
  date: string; // YYYY-MM-DD
  name: string;
  is_national_holiday: boolean;
}

interface HolidayCache {
  [year: number]: HolidayData[];
}

// Cache untuk menghindari request berulang
const holidayCache: HolidayCache = {};

/**
 * Fetch holidays for a specific year from libur.deno.dev
 */
export async function fetchHolidays(year: number): Promise<HolidayData[]> {
  // Return from cache if available
  if (holidayCache[year]) {
    return holidayCache[year];
  }

  try {
    const response = await fetch(`https://libur.deno.dev/api?year=${year}`);
    if (!response.ok) {
      console.warn(`Failed to fetch holidays for ${year}`);
      return [];
    }

    const data = await response.json();
    
    // Parse the response - API returns array of holidays
    const holidays: HolidayData[] = data.map((item: any) => ({
      date: item.date,
      name: item.name || item.holiday_name || "Hari Libur",
      is_national_holiday: item.is_national_holiday ?? true,
    }));

    // Cache the result
    holidayCache[year] = holidays;
    return holidays;
  } catch (error) {
    console.error(`Error fetching holidays for ${year}:`, error);
    return [];
  }
}

/**
 * Check if a date is a weekend (Saturday = 6, Sunday = 0)
 * Using getUTCDay() for consistency with date string parsing
 */
export function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/**
 * Get weekend name
 * Using getUTCDay() for consistency with date string parsing
 */
export function getWeekendName(date: Date): string | null {
  const day = date.getUTCDay();
  if (day === 0) return "Minggu";
  if (day === 6) return "Sabtu";
  return null;
}

/**
 * Check if a date is a holiday
 */
export function isHoliday(dateStr: string, holidays: HolidayData[]): HolidayData | null {
  return holidays.find((h) => h.date === dateStr) || null;
}

/**
 * Get day status: holiday, weekend, or workday
 */
export interface DayStatus {
  isHoliday: boolean;
  isWeekend: boolean;
  holidayName: string | null;
  type: "holiday" | "weekend" | "workday";
}

export function getDayStatus(date: Date, holidays: HolidayData[]): DayStatus {
  const dateStr = date.toISOString().split("T")[0];
  
  // Check holiday first
  const holiday = isHoliday(dateStr, holidays);
  if (holiday) {
    return {
      isHoliday: true,
      isWeekend: false,
      holidayName: holiday.name,
      type: "holiday",
    };
  }

  // Check weekend
  if (isWeekend(date)) {
    return {
      isHoliday: false,
      isWeekend: true,
      holidayName: getWeekendName(date),
      type: "weekend",
    };
  }

  // Regular workday
  return {
    isHoliday: false,
    isWeekend: false,
    holidayName: null,
    type: "workday",
  };
}

/**
 * Fetch holidays for a date range (handles multiple years)
 */
export async function fetchHolidaysForRange(startDate: Date, endDate: Date): Promise<HolidayData[]> {
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  
  const allHolidays: HolidayData[] = [];
  
  for (let year = startYear; year <= endYear; year++) {
    const yearHolidays = await fetchHolidays(year);
    allHolidays.push(...yearHolidays);
  }
  
  return allHolidays;
}

