import { TriggerContext } from "@devvit/public-api";
import { AppInstall, AppUpgrade } from "@devvit/protos";
import { SEND_REMINDER_CRON_KEY, SEND_REMINDER_JOB } from "./constants.js";
import { queueAdhocTask } from "./sendReminders.js";

export async function handleInstallActions (_: AppInstall | AppUpgrade, context: TriggerContext) {
    const currentJobs = await context.scheduler.listJobs();
    await Promise.all(currentJobs.map(job => context.scheduler.cancelJob(job.id)));

    // Create a random cron for the scheduled reminder job
    const cron = `${Math.floor(Math.random() * 60)} ${Math.floor(Math.random() * 24)} * * *`;
    await context.redis.set(SEND_REMINDER_CRON_KEY, cron);

    await context.scheduler.runJob({
        name: SEND_REMINDER_JOB,
        cron,
        data: { type: "scheduled" },
    });

    await queueAdhocTask(context);

    console.log("Install Actions: A new version of the app has been installed or upgraded.");
}
