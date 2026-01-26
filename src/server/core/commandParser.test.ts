import { parseCancellation, parseCommandDate } from "./commandParser.js";

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
    const testCases = [
        { input: "!remindme 5 minutes", expected: "2023-10-01T12:05:00.000" },
        { input: "!RemindMe 2 hours", expected: "2023-10-01T14:00:00.000" },
        { input: "!remind 1 day", expected: "2023-10-02T12:00:00.000" },
        { input: "!Remind 3 weeks", expected: "2023-10-22T12:00:00.000" },
        { input: "!remindme 4 months", expected: "2024-02-01T13:00:00.000" },
        { input: "!RemindMe 1 year", expected: "2024-10-01T12:00:00.000" },
        { input: "!remindme 5 days", expected: "2023-10-06T12:00:00.000" },
    ];

    const baselineDate = new Date("2023-10-01T12:00:00.000Z");

    testCases.forEach(({ input, expected }) => {
        const result = parseCommandDate(input, baselineDate);
        expect(result?.setZone("UTC").toISO({ includeOffset: false })).toBe(expected);
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
