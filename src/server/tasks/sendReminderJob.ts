import { Context } from "hono";
import { sendReminders } from "../core";
import { TaskRequest } from "@devvit/web/server";
import { hasTriggerBeenHandled } from "@fsvreddit/fsv-devvit-web-helpers";
import { addMinutes } from "date-fns";

export type SendReminderJobData = {
    type?: "adhoc" | "cron";
    jobGuid: string;
};

export const sendReminderJob = async (context: Context) => {
    const request = await context.req.json<TaskRequest<SendReminderJobData | undefined>>();

    const jobGuid = request.data?.jobGuid;
    if (jobGuid && await hasTriggerBeenHandled(`job:${jobGuid}`, { expiration: addMinutes(new Date(), 5) })) {
        console.warn(`Job ${jobGuid} has already been handled. Skipping.`);
        return context.json({ message: "job already handled" }, 200);
    }

    await sendReminders(request.data?.type);

    return context.json({ message: "reminder sent" }, 200);
};
