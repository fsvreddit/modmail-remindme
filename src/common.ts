import { DateTime } from "luxon";

export function formatDate (dt: DateTime): string {
    return dt.toFormat("yyyy-MM-dd HH:mm:ss");
}
