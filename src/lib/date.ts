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
