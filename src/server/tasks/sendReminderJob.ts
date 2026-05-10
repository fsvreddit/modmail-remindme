import { Context } from "hono";
import { sendReminders } from "../core";

export const sendReminderJob = async (context: Context) => {
    await sendReminders();

    return context.json({ message: "reminder sent" }, 200);
};
