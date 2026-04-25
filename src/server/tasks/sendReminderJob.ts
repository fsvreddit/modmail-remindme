import { Context } from "hono";
import { sendReminders } from "../core";

export const sendReminderJob = async (context: Context) => {
    const body = await context.req.text();
    console.log("sendReminderJob:", body);

    await sendReminders();

    return context.json({ message: "reminder sent" }, 200);
};
