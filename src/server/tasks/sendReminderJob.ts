import { Context } from "hono";
import { sendReminders } from "../core";
import { TaskRequest } from "@devvit/web/server";
import { hasTriggerBeenHandled } from "@fsvreddit/fsv-devvit-web-helpers";
import { DateTime } from "luxon";

export const sendReminderJob = async (context: Context) => {
    const request = await context.req.json<TaskRequest>();

    const jobGuid = request.data?.jobGuid as string | undefined;
    if (jobGuid && await hasTriggerBeenHandled(`job:${jobGuid}`, { expiration: DateTime.now().plus({ minutes: 5 }).toJSDate() })) {
        console.log(`Job ${jobGuid} has already been handled. Skipping.`);
        return context.json({ message: "job already handled" }, 200);
    }

    await sendReminders();

    return context.json({ message: "reminder sent" }, 200);
};
