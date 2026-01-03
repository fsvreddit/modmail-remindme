import { JobContext, ScheduledJob, TriggerContext } from "@devvit/public-api";
import { CronExpressionParser } from "cron-parser";
import { SEND_REMINDER_CRON_KEY, SEND_REMINDER_JOB } from "./constants.js";
import { DateTime } from "luxon";
import pluralize from "pluralize";
import json2md from "json2md";
import { AppSetting } from "./settings.js";
import { formatDateForLogs } from "./common.js";

const REMINDER_QUEUE = "reminderQueue";
const REMINDER_USERNAMES = "reminderUsernames";

export async function getReminderQueueSize (context: TriggerContext): Promise<number> {
    return context.redis.zCard(REMINDER_QUEUE);
}

export async function queueReminder (conversationId: string, username: string | undefined, reminderDate: DateTime, context: TriggerContext) {
    await context.redis.zAdd(REMINDER_QUEUE, { member: conversationId, score: reminderDate.toMillis() });
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

export async function getConversationReminderDate (conversationId: string, context: TriggerContext): Promise<DateTime | undefined> {
    const score = await context.redis.zScore(REMINDER_QUEUE, conversationId);
    if (score) {
        return DateTime.fromMillis(score);
    }
}

export async function queueAdhocTask (context: TriggerContext) {
    const reminderQueue = await context.redis.zRange(REMINDER_QUEUE, 0, 0);
    if (reminderQueue.length === 0) {
        console.log("Queue Adhoc Job: No reminders to send");
        return;
    }

    let nextReminderDue = DateTime.fromMillis(reminderQueue[0].score).plus({ seconds: 5 });
    if (nextReminderDue < DateTime.now()) {
        nextReminderDue = DateTime.now();
    }

    const cron = await context.redis.get(SEND_REMINDER_CRON_KEY);
    if (cron) {
        const nextScheduledJob = DateTime.fromJSDate(CronExpressionParser.parse(cron).next().toDate());

        if (nextReminderDue > nextScheduledJob.minus({ seconds: 30 })) {
            console.log(`Queue Adhoc Job: Next scheduled run (${formatDateForLogs(nextScheduledJob)}) is due too soon before the next reminder (${formatDateForLogs(nextReminderDue)})`);
            return;
        }
    }

    // Check for any existing adhoc jobs
    const currentJobs = await context.scheduler.listJobs();
    const adhocJobs = currentJobs.filter(job => job.name === SEND_REMINDER_JOB && job.data?.type === "adhoc") as ScheduledJob[];

    if (adhocJobs.length > 1) {
        console.warn(`Queue Adhoc Job: Found ${adhocJobs.length} existing adhoc ${pluralize("job", adhocJobs.length)}, cancelling all to avoid duplicates`);
        await Promise.all(adhocJobs.map(job => context.scheduler.cancelJob(job.id)));
    } else if (adhocJobs.length === 1) {
        const adhocJob = adhocJobs[0];
        if (adhocJob.runAt === nextReminderDue.toJSDate()) {
            console.log(`Queue Adhoc Job: Existing adhoc job already scheduled for ${formatDateForLogs(DateTime.fromJSDate(adhocJob.runAt))}`);
            return;
        } else if (adhocJob.runAt < nextReminderDue.toJSDate()) {
            console.log(`Queue Adhoc Job: Existing adhoc job scheduled for ${formatDateForLogs(DateTime.fromJSDate(adhocJob.runAt))} is sooner than next reminder due at ${formatDateForLogs(nextReminderDue)}`);
            return;
        } else {
            console.log(`Queue Adhoc Job: Cancelling existing adhoc job scheduled for ${formatDateForLogs(DateTime.fromJSDate(adhocJob.runAt))}`);
            await context.scheduler.cancelJob(adhocJob.id);
        }
    }

    await context.scheduler.runJob({
        name: SEND_REMINDER_JOB,
        runAt: nextReminderDue.toJSDate(),
        data: { type: "adhoc" },
    });

    console.log(`Queue Adhoc Job: Job scheduled for ${formatDateForLogs(nextReminderDue)}`);
}

export async function sendReminders (_: unknown, context: JobContext) {
    const remindersDue = await context.redis.zRange(REMINDER_QUEUE, 0, new Date().getTime(), { by: "score" });
    console.log(`Send Reminders: ${remindersDue.length} ${pluralize("reminder", remindersDue.length)} due`);

    for (const reminder of remindersDue) {
        const conversationId = reminder.member;
        const username = await context.redis.hGet(REMINDER_USERNAMES, conversationId);

        let sendReminder = true;
        const sendForDeadAccounts = await context.settings.get<boolean>(AppSetting.SendRemindersForSuspendedAccounts);
        if (!sendForDeadAccounts) {
            const conversation = await context.reddit.modMail.getConversation({ conversationId });
            const participant = conversation.conversation?.participant?.name;
            if (participant === "[deleted]") {
                sendReminder = false;
            } else if (participant) {
                try {
                    const user = await context.reddit.getUserByUsername(participant);
                    sendReminder = user !== undefined;
                } catch {
                    sendReminder = false;
                }
            }
        }

        if (sendReminder) {
            let message: json2md.DataObject;
            if (username) {
                message = { p: `/u/${username} asked to be reminded about this modmail thread at this time.` };
            } else {
                message = { p: `Someone asked to be reminded about this modmail thread at this time.` };
            }

            try {
                await context.reddit.modMail.reply({
                    conversationId,
                    body: json2md(message),
                    isInternal: true,
                });
                console.log(`Send Reminders: Reminder sent for conversation ${conversationId}`);
            } catch (error) {
                console.error(`Send Reminders: Failed to send reminder for conversation ${conversationId}`, error);
            }
        } else {
            console.log(`Send Reminders: Skipping reminder for conversation ${conversationId} due to deleted/suspended/shadowbanned account`);
        }

        await context.redis.zRem(REMINDER_QUEUE, [conversationId]);
        await context.redis.hDel(REMINDER_USERNAMES, [conversationId]);
    }

    await queueAdhocTask(context);
}
