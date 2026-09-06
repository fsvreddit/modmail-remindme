import { format } from "date-fns";

export function formatDateForLogs (dt: Date): string {
    return format(dt, "yyyy-MM-dd HH:mm:ss");
}

export function formatDateForModmail (dt: Date): string {
    return format(dt, "EEEE, MMM d, yyyy 'at' HH:mm 'UTC'");
}
