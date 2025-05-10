import { addDays, addHours, addMinutes, addMonths, addWeeks, addYears } from "date-fns";

export function parseCancellation (message: string): boolean {
    const cancelRegex = /(?:!remind(?:me)?|RemindMe!) cancel/i;
    return cancelRegex.test(message);
}

export function parseCommandDate (message: string, baseline?: Date): Date | undefined {
    const commandRegex = /(?:!remind(?:me)?|RemindMe!) (\d+)(?: )?(minute|hour|day|week|month|year)?s?/i;
    const matches = commandRegex.exec(message);
    if (!matches) {
        return;
    }

    const timeValue = parseInt(matches[1]);
    const timeUnit = matches[2] ? matches[2].toLowerCase() : "day";

    baseline ??= new Date();

    switch (timeUnit) {
        case "minute":
            return addMinutes(baseline, timeValue);
        case "hour":
            return addHours(baseline, timeValue);
        case "day":
            return addDays(baseline, timeValue);
        case "week":
            return addWeeks(baseline, timeValue);
        case "month":
            return addMonths(baseline, timeValue);
        case "year":
            return addYears(baseline, timeValue);
        default:
            return;
    }
}
