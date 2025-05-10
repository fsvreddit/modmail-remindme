import { JobContext, TriggerContext } from "@devvit/public-api";
import { CronExpressionParser } from "cron-parser";
import { SEND_REMINDER_CRON_KEY, SEND_REMINDER_JOB } from "./constants.js";
import { addSeconds, subSeconds } from "date-fns";
import pluralize from "pluralize";
import json2md from "json2md";

const REMINDER_QUEUE = "reminderQueue";
const REMINDER_USERNAMES = "reminderUsernames";

export async function queueReminder (conversationId: string, username: string | undefined, reminderDate: Date, context: TriggerContext) {
    await context.redis.zAdd(REMINDER_QUEUE, { member: conversationId, score: reminderDate.getTime() });
    if (username) {
        await context.redis.hSet(REMINDER_USERNAMES, { [conversationId]: username });
    }

    await queueAdhocTask(context);
}

export async function cancelReminder (conversationId: string, context: TriggerContext): Promise<boolean> {
    const recordsRemoved = await context.redis.zRem(REMINDER_QUEUE, [conversationId]);
    await context.redis.hDel(REMINDER_USERNAMES, [conversationId]);
    return recordsRemoved > 0;
}

export async function getConversationReminderDate (conversationId: string, context: TriggerContext): Promise<Date | undefined> {
    const score = await context.redis.zScore(REMINDER_QUEUE, conversationId);
    if (score) {
        return new Date(score);
    }
}

export async function queueAdhocTask (context: TriggerContext) {
    const reminderQueue = await context.redis.zRange(REMINDER_QUEUE, 0, 0);
    if (reminderQueue.length === 0) {
        console.log("Queue Adhoc Job: No reminders to send");
        return;
    }

    const nextReminderDue = new Date(reminderQueue[0].score);
    const cron = await context.redis.get(SEND_REMINDER_CRON_KEY);
    if (!cron) {
        console.error("Queue Adhoc Job: No cron found");
        return;
    }
    const nextScheduledJob = CronExpressionParser.parse(cron).next().toDate();

    if (nextReminderDue > subSeconds(nextScheduledJob, 30)) {
        console.log(`Queue Adhoc Job: Next scheduled run (${nextScheduledJob.toISOString()}) is due too soon before the next reminder (${nextReminderDue.toISOString()})`);
        return;
    }

    // Cancel any existing adhoc jobs
    const currentJobs = await context.scheduler.listJobs();
    const adhocJobs = currentJobs.filter(job => job.name === SEND_REMINDER_JOB && job.data?.type === "adhoc");
    await Promise.all(adhocJobs.map(job => context.scheduler.cancelJob(job.id)));
    console.log(`Queue Adhoc Job: ${adhocJobs.length} existing adhoc ${pluralize("job", adhocJobs.length)} cancelled`);

    await context.scheduler.runJob({
        name: SEND_REMINDER_JOB,
        runAt: addSeconds(nextReminderDue, 1),
        data: { type: "adhoc" },
    });

    console.log(`Queue Adhoc Job: Job scheduled for ${nextReminderDue.toISOString()}`);
}

export async function sendReminders (_: unknown, context: JobContext) {
    const remindersDue = await context.redis.zRange(REMINDER_QUEUE, 0, new Date().getTime(), { by: "score" });
    console.log(`Send Reminders: ${remindersDue.length} ${pluralize("reminder", remindersDue.length)} due`);

    for (const reminder of remindersDue) {
        const conversationId = reminder.member;
        const username = await context.redis.hGet(REMINDER_USERNAMES, conversationId);

        const message: json2md.DataObject[] = [];
        if (username) {
            message.push({ p: `/u/${username}, you asked to be reminded about this modmail thread at this time.` });
        } else {
            message.push({ p: `Someone asked to be reminded about this modmail thread at this time.` });
        }

        await context.reddit.modMail.reply({
            conversationId,
            body: json2md(message),
            isInternal: true,
        });

        console.log(`Send Reminders: Reminder sent for conversation ${conversationId}`);

        await context.redis.zRem(REMINDER_QUEUE, [conversationId]);
        await context.redis.hDel(REMINDER_USERNAMES, [conversationId]);
    }

    await queueAdhocTask(context);
}
