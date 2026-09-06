import { add, Duration } from "date-fns";

export function parseCancellation (message: string): boolean {
    const cancelRegex = /(?:!remind(?:me)?|RemindMe!) cancel/i;
    return cancelRegex.test(message);
}

export function parseCommandDate (message: string, baseline?: Date): Date | undefined {
    const commandRegex = /(?:!remind(?:me)?|RemindMe!) (\d+)(?: )?(minute|h(?:our)?|d(?:ay)?|w(?:eek)?|m(?:onth)?|y(?:ear)?)?s?/i;
    const matches = commandRegex.exec(message);
    if (!matches?.[1]) {
        return;
    }

    const timeValue = parseInt(matches[1]);
    const timeUnit = matches[2] ? matches[2].toLowerCase() : "day";

    baseline ??= new Date();

    const duration: Duration = {
        minutes: timeUnit === "minute" ? timeValue : undefined,
        hours: timeUnit === "hour" || timeUnit === "h" ? timeValue : undefined,
        days: timeUnit === "day" || timeUnit === "d" ? timeValue : undefined,
        weeks: timeUnit === "week" || timeUnit === "w" ? timeValue : undefined,
        months: timeUnit === "month" || timeUnit === "m" ? timeValue : undefined,
        years: timeUnit === "year" || timeUnit === "y" ? timeValue : undefined,
    };

    return add(baseline, duration);
}
