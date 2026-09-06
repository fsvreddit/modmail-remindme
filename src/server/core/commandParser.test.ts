import { parseCancellation, parseCommandDate } from "./commandParser.js";
import { assert, expect, test } from "vitest";

test("parseCancellation", () => {
    const testCases = [
        { input: "!remindme cancel", expected: true },
        { input: "!RemindMe cancel", expected: true },
        { input: "!remind cancel", expected: true },
        { input: "!Remind cancel", expected: true },
        { input: "cancel !remindme", expected: false },
        { input: "cancel !RemindMe", expected: false },
        { input: "cancel !remind", expected: false },
        { input: "cancel !Remind", expected: false },
        { input: "some other text", expected: false },
    ];

    testCases.forEach(({ input, expected }) => {
        const result = parseCancellation(input);
        expect(result).toBe(expected);
    });
});

test("parseCommandDate", () => {
    // Use June 2023 as baseline to avoid DST transitions
    // Both June and October are in BST (UTC+1), and other months in the range are handled consistently
    const baselineDate = new Date(Date.UTC(2023, 5, 1, 12, 0, 0, 0)); // June 1, 2023 12:00 UTC

    const testCases = [
        { input: "!remindme 5 minutes", expected: "2023-06-01T12:05:00.000Z" },
        { input: "!RemindMe 2 hours", expected: "2023-06-01T14:00:00.000Z" },
        { input: "!RemindMe 2h", expected: "2023-06-01T14:00:00.000Z" },
        { input: "!remind 1 day", expected: "2023-06-02T12:00:00.000Z" },
        { input: "!Remind 3 weeks", expected: "2023-06-22T12:00:00.000Z" },
        { input: "!Remind 3w", expected: "2023-06-22T12:00:00.000Z" },
        { input: "!remindme 4 months", expected: "2023-10-01T12:00:00.000Z" },
        { input: "!remindme 4m", expected: "2023-10-01T12:00:00.000Z" },
        { input: "!RemindMe 1 year", expected: "2024-06-01T12:00:00.000Z" },
        { input: "!RemindMe 1y", expected: "2024-06-01T12:00:00.000Z" },
        { input: "!remindme 5 days", expected: "2023-06-06T12:00:00.000Z" },
        { input: "!remindme 5d", expected: "2023-06-06T12:00:00.000Z" },
    ];

    testCases.forEach(({ input, expected }) => {
        const result = parseCommandDate(input, baselineDate);
        if (!result) {
            assert.fail(`Expected a valid date, but got undefined for ${input}.`);
        }
        expect(result.toISOString()).toBe(expected);
    });
});

test("parseCommandDate with no match", () => {
    const testCases = [
        { input: "!remindme day", expected: undefined },
        { input: "!RemindMe", expected: undefined },
        { input: "some other text", expected: undefined },
    ];

    testCases.forEach(({ input, expected }) => {
        const result = parseCommandDate(input);
        expect(result).toBe(expected);
    });
});
