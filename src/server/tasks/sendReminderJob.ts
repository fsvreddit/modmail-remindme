import { Request, Response } from "express";
import { sendReminders } from "../core";

export const sendReminderJob = async (request: Request, response: Response) => {
    console.log("sendReminderJob:", request.body);

    await sendReminders();

    return response.status(200).send({ message: "reminder sent" });
};
