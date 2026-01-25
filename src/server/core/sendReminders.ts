import { reddit, redis, ScheduledJob, scheduler, settings } from "@devvit/web/server";
import { DateTime } from "luxon";
import pluralize from "pluralize";
import json2md from "json2md";
import { AppSetting, formatDateForLogs, SchedulerJob, SEND_REMINDER_CRON } from ".";
import CronExpressionParser from "cron-parser";

const REMINDER_QUEUE = "reminderQueue";
const REMINDER_USERNAMES = "reminderUsernames";

export async function getReminderQueueSize (): Promise<number> {
    return redis.zCard(REMINDER_QUEUE);
}

export async function queueReminder (conversationId: string, username: string | undefined, reminderDate: DateTime) {
    await redis.zAdd(REMINDER_QUEUE, { member: conversationId, score: reminderDate.toMillis() });
    if (username) {
        await redis.hSet(REMINDER_USERNAMES, { [conversationId]: username });
    }

    await queueAdhocTask();
}

export async function cancelReminder (conversationId: string): Promise<boolean> {
    const recordsRemoved = await redis.zRem(REMINDER_QUEUE, [conversationId]);
    await redis.hDel(REMINDER_USERNAMES, [conversationId]);
    return recordsRemoved > 0;
}

export async function getConversationReminderDate (conversationId: string): Promise<DateTime | undefined> {
    const score = await redis.zScore(REMINDER_QUEUE, conversationId);
    if (score) {
        return DateTime.fromMillis(score);
    }
}

export async function queueAdhocTask () {
    const reminderQueue = await redis.zRange(REMINDER_QUEUE, 0, 0);
    const firstReminder = reminderQueue.shift();
    if (!firstReminder) {
        console.log("Queue Adhoc Job: No reminders to send");
        return;
    }

    let nextReminderDue = DateTime.fromMillis(firstReminder.score).plus({ seconds: 5 });
    if (nextReminderDue < DateTime.now()) {
        nextReminderDue = DateTime.now();
    }

    const nextScheduledJob = DateTime.fromJSDate(CronExpressionParser.parse(SEND_REMINDER_CRON).next().toDate());

    if (nextReminderDue > nextScheduledJob.minus({ seconds: 30 })) {
        console.log(`Queue Adhoc Job: Next scheduled run (${formatDateForLogs(nextScheduledJob)}) is due too soon before the next reminder (${formatDateForLogs(nextReminderDue)})`);
        return;
    }

    // Check for any existing adhoc jobs
    const currentJobs = await scheduler.listJobs();
    const adhocJobs = currentJobs.filter(job => job.name === SchedulerJob.SendReminderJob as string && job.data?.type === "adhoc") as ScheduledJob[];
    const cronJobs = currentJobs.filter(job => job.name === SchedulerJob.SendReminderJob as string && job.data?.type !== "adhoc") as ScheduledJob[];

    console.log(`Queue Adhoc Job: Found ${adhocJobs.length} existing adhoc ${pluralize("job", adhocJobs.length)} and ${cronJobs.length} cron ${pluralize("job", cronJobs.length)}`);

    if (adhocJobs.length > 1) {
        console.warn(`Queue Adhoc Job: Found ${adhocJobs.length} existing adhoc ${pluralize("job", adhocJobs.length)}, cancelling all to avoid duplicates`);
        await Promise.all(adhocJobs.map(job => scheduler.cancelJob(job.id)));
    } else if (adhocJobs.length === 1) {
        const adhocJob = adhocJobs[0];
        if (!adhocJob) {
            throw new Error("Queue Adhoc Job: Failed to retrieve existing adhoc job details");
        }

        if (adhocJob.runAt === nextReminderDue.toJSDate()) {
            console.log(`Queue Adhoc Job: Existing adhoc job already scheduled for ${formatDateForLogs(DateTime.fromJSDate(adhocJob.runAt))}`);
            return;
        } else if (adhocJob.runAt < nextReminderDue.toJSDate()) {
            console.log(`Queue Adhoc Job: Existing adhoc job scheduled for ${formatDateForLogs(DateTime.fromJSDate(adhocJob.runAt))} is sooner than next reminder due at ${formatDateForLogs(nextReminderDue)}`);
            return;
        } else {
            console.log(`Queue Adhoc Job: Cancelling existing adhoc job scheduled for ${formatDateForLogs(DateTime.fromJSDate(adhocJob.runAt))}`);
            await scheduler.cancelJob(adhocJob.id);
        }
    }

    await scheduler.runJob({
        name: SchedulerJob.SendReminderJob,
        runAt: nextReminderDue.toJSDate(),
        data: { type: "adhoc" },
    });

    console.log(`Queue Adhoc Job: Job scheduled for ${formatDateForLogs(nextReminderDue)}`);
}

export async function sendReminders () {
    const remindersDue = await redis.zRange(REMINDER_QUEUE, 0, new Date().getTime(), { by: "score" });
    console.log(`Send Reminders: ${remindersDue.length} ${pluralize("reminder", remindersDue.length)} due`);

    for (const reminder of remindersDue) {
        const conversationId = reminder.member;
        const username = await redis.hGet(REMINDER_USERNAMES, conversationId);

        let sendReminder = true;
        const sendForDeadAccounts = await settings.get<boolean>(AppSetting.SendRemindersForSuspendedAccounts);
        if (!sendForDeadAccounts) {
            const conversation = await reddit.modMail.getConversation({ conversationId });
            const participant = conversation.conversation?.participant?.name;
            if (participant === "[deleted]") {
                sendReminder = false;
            } else if (participant) {
                try {
                    const user = await reddit.getUserByUsername(participant);
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
                await reddit.modMail.reply({
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

        await redis.zRem(REMINDER_QUEUE, [conversationId]);
        await redis.hDel(REMINDER_USERNAMES, [conversationId]);
    }

    await queueAdhocTask();
}
