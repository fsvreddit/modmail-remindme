import { DateTime } from "luxon";

export function formatDateForLogs (dt: DateTime): string {
    return dt.toFormat("yyyy-MM-dd HH:mm:ss");
}

export function formatDateForModmail (dt: DateTime): string {
    return dt.toFormat("EEEE, MMM d, yyyy 'at' HH:mm 'UTC'");
}
