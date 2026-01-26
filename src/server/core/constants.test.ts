import { readFile } from "fs/promises";
import { join } from "path";
import { AppSetting, Endpoint, SchedulerJob, SEND_REMINDER_CRON } from "./constants.js";
import { AppConfig } from "@devvit/shared-types/schemas/config-file.v1.js";

let devvitConfig: AppConfig;

beforeAll(async () => {
    // Read devvit.json from the project root
    const devvitPath = join(process.cwd(), "../..", "devvit.json");
    const content = await readFile(devvitPath, "utf-8");
    devvitConfig = JSON.parse(content) as AppConfig;
});

describe("Constants match devvit.json", () => {
    test("Endpoint.SendReminderJob matches scheduler task endpoint", () => {
        const taskConfig = devvitConfig.scheduler?.tasks[SchedulerJob.SendReminderJob];
        expect(taskConfig?.endpoint).toBe(Endpoint.SendReminderJob);
    });

    test("Endpoint.ModmailReceive matches onModMail trigger", () => {
        expect(devvitConfig.triggers?.onModMail).toBe(Endpoint.ModmailReceive);
    });

    test("Endpoint.AppUpgrade matches onAppUpgrade trigger", () => {
        expect(devvitConfig.triggers?.onAppUpgrade).toBe(Endpoint.AppUpgrade);
    });

    test("SEND_REMINDER_CRON matches scheduler task cron", () => {
        const taskConfig = devvitConfig.scheduler?.tasks[SchedulerJob.SendReminderJob];
        expect(taskConfig?.cron).toBe(SEND_REMINDER_CRON);
    });

    test("SchedulerJob.SendReminderJob exists as key in scheduler tasks", () => {
        const taskKeys = Object.keys(devvitConfig.scheduler?.tasks ?? {});
        expect(taskKeys).toContain(SchedulerJob.SendReminderJob);
    });

    test("All scheduler task keys are defined in SchedulerJob enum", () => {
        const taskKeys = Object.keys(devvitConfig.scheduler?.tasks ?? {});
        const enumValues = Object.values(SchedulerJob);

        taskKeys.forEach((key) => {
            expect(enumValues).toContain(key);
        });
    });

    test("All endpoint values in devvit.json are defined in Endpoint enum", () => {
        const endpointsInConfig = [
            devvitConfig.triggers?.onModMail,
            devvitConfig.triggers?.onAppUpgrade,
            ...Object.values(devvitConfig.scheduler?.tasks ?? {}).map(task => task.endpoint),
        ].filter(Boolean);

        const enumValues = Object.values(Endpoint);

        endpointsInConfig.forEach((endpoint) => {
            expect(enumValues).toContain(endpoint);
        });
    });

    test("All subreddit settings keys are defined in AppSetting enum", () => {
        const settingKeys = Object.keys(devvitConfig.settings?.subreddit ?? {});
        const enumValues = Object.values(AppSetting);

        settingKeys.forEach((key) => {
            expect(enumValues).toContain(key);
        });
    });

    test("All AppSetting enum values exist in subreddit settings", () => {
        const settingKeys = Object.keys(devvitConfig.settings?.subreddit ?? {});
        const enumValues = Object.values(AppSetting);

        enumValues.forEach((enumValue) => {
            expect(settingKeys).toContain(enumValue);
        });
    });
});
