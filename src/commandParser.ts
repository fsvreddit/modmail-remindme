import { DateTime, DurationLike } from "luxon";

export function parseCancellation (message: string): boolean {
    const cancelRegex = /(?:!remind(?:me)?|RemindMe!) cancel/i;
    return cancelRegex.test(message);
}

export function parseCommandDate (message: string, baseline?: Date): DateTime | undefined {
    const commandRegex = /(?:!remind(?:me)?|RemindMe!) (\d+)(?: )?(minute|hour|day|week|month|year)?s?/i;
    const matches = commandRegex.exec(message);
    if (!matches) {
        return;
    }

    const timeValue = parseInt(matches[1]);
    const timeUnit = matches[2] ? matches[2].toLowerCase() : "day";

    baseline ??= new Date();
    const duration: DurationLike = {
        minutes: timeUnit === "minute" ? timeValue : undefined,
        hours: timeUnit === "hour" ? timeValue : undefined,
        days: timeUnit === "day" ? timeValue : undefined,
        weeks: timeUnit === "week" ? timeValue : undefined,
        months: timeUnit === "month" ? timeValue : undefined,
        years: timeUnit === "year" ? timeValue : undefined,
    };

    return DateTime.fromJSDate(baseline).plus(duration);
}
