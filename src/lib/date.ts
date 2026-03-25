/**
 * Force date to WIB (UTC+7)
 * Useful for ensuring server-side calculations respect client's implied timezone
 */
export const WIB_OFFSET = 7 * 60 * 60 * 1000;

export function getNowWIB(): Date {
    // Current UTC time
    const now = new Date();

    // Create a date object that represents the current time in WIB
    // We use "en-US" with "Asia/Jakarta" to get the correct string representation
    // then parse it back. This is safer than manual offset calculation which ignores DST (though WIB doesn't have DST).
    const wibString = now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
    return new Date(wibString);
}


/**
 * Get start of "Today" in WIB
 * usage: WHERE date >= startOfTodayWIB
 */
export function getTodayWIB(): Date {
    const now = getNowWIB();
    now.setHours(0, 0, 0, 0);
    return now;
}

/**
 * Get start of "Tomorrow" in WIB
 * usage: WHERE date < startOfTomorrowWIB
 */
export function getTomorrowWIB(): Date {
    const today = getTodayWIB();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return tomorrow;
}

/**
 * Format Date to WIB string for display if needed server-side
 */
export function formatWIB(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
}

/**
 * Format Date to HH:mm WIB string reliably (manual UTC+7 offset)
 */
export function formatTimeWIB(date: Date | string): string {
    const d = new Date(date);
    // Convert UTC to WIB (UTC+7) manually
    const utcMs = d.getTime() + d.getTimezoneOffset() * 60 * 1000;
    const wibMs = utcMs + WIB_OFFSET;
    const wibDate = new Date(wibMs);
    const hours = wibDate.getHours().toString().padStart(2, "0");
    const minutes = wibDate.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
}
