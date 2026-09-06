import { describe, expect, test } from "vitest";
import { formatDateForLogs, formatDateForModmail } from "./formatterFunctions.js";

describe("formatterFunctions", () => {
    test("formatDateForLogs renders a log-friendly timestamp", () => {
        const dt = new Date(2024, 0, 15, 12, 34, 56);

        expect(formatDateForLogs(dt)).toBe("2024-01-15 12:34:56");
    });

    test("formatDateForModmail renders a human-readable modmail timestamp", () => {
        const dt = new Date(2024, 0, 15, 9, 5, 0);

        expect(formatDateForModmail(dt)).toBe("Monday, Jan 15, 2024 at 09:05 UTC");
    });
});
