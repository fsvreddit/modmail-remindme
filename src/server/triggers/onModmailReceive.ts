import { context, GetConversationResponse, reddit, redis } from "@devvit/web/server";
import { OnModMailRequest } from "@devvit/web/shared";
import { Request, Response } from "express";
import { cancelReminder, formatDateForLogs, formatDateForModmail, getConversationReminderDate, parseCancellation, parseCommandDate, queueReminder } from "../core";
import { DateTime } from "luxon";
import json2md from "json2md";

export const onModmailReceive = async (request: Request, response: Response) => {
    const event = request.body as OnModMailRequest;

    if (event.messageAuthor?.name === context.appSlug) {
        return response.status(200).json({ message: "ignoring self message" });
    }

    let conversation: GetConversationResponse;
    try {
        conversation = await reddit.modMail.getConversation({ conversationId: event.conversationId });
        if (!conversation.conversation) {
            console.error(`Modmail: Conversation ${event.conversationId} not found`);
            return response.status(404).json({ message: "conversation not found" });
        }
    } catch (error) {
        console.error(`Modmail: Error fetching conversation ${event.conversationId}`, error);
        console.log(JSON.stringify(event, null, 2));
        return response.status(500).json({ message: "error fetching conversation" });
    }

    const messagesInConversation = Object.values(conversation.conversation.messages);
    const currentMessage = messagesInConversation.find(message => message.id && event.messageId.includes(message.id));
    if (!currentMessage) {
        console.error("Modmail: Current message not found");
        return response.status(400).json({ message: "current message not found" });
    }

    if (!currentMessage.bodyMarkdown) {
        return response.status(200).json({ message: "no body markdown" });
    }

    if (currentMessage.participatingAs !== "moderator") {
        return response.status(200).json({ message: "not a mod message" });
    }

    const message: json2md.DataObject[] = [];

    const isCancellation = parseCancellation(currentMessage.bodyMarkdown);
    const reminderDate = parseCommandDate(currentMessage.bodyMarkdown);
    if (!isCancellation && !reminderDate) {
        return response.status(200).json({ message: "no action needed" });
    }

    const handledKey = `handled:${event.messageId}`;
    const alreadyHandled = await redis.exists(handledKey);
    if (alreadyHandled) {
        console.log(`Modmail: Message ${event.messageId} already handled, duplicate trigger?`);
        return response.status(200).json({ message: "duplicate trigger" });
    }

    await redis.set(handledKey, "true", { expiration: DateTime.now().plus({ days: 1 }).toJSDate() });

    if (isCancellation) {
        const reminderDate = await getConversationReminderDate(event.conversationId);
        if (!reminderDate) {
            console.log(`Modmail: Cancellation command received, but no reminder date found for conversation ${event.conversationId}`);
            message.push({ p: "No reminder is scheduled for this modmail conversation." });
        } else {
            await cancelReminder(event.conversationId);
            message.push({ p: `Reminder for this modmail conversation has been cancelled. The reminder was scheduled for ${formatDateForLogs(reminderDate)}.` });
        }
    };

    if (reminderDate) {
        console.log(`Modmail: Remind command found in message ${currentMessage.id} for ${formatDateForLogs(reminderDate)}`);
        const existingReminderDate = await getConversationReminderDate(event.conversationId);
        await queueReminder(event.conversationId, currentMessage.author?.name, reminderDate);
        message.push({ p: `A reminder for this modmail conversation has been scheduled for ${formatDateForModmail(reminderDate)}.` });
        if (existingReminderDate) {
            message.push({ p: `A previous reminder was scheduled for ${formatDateForModmail(existingReminderDate)}, and this has been replaced.` });
        }
    }

    if (message.length > 0) {
        const messageBody = json2md(message);
        await reddit.modMail.reply({
            conversationId: event.conversationId,
            body: messageBody,
            isInternal: true,
        });
    }

    return response.status(200).json({ message: "modmail received" });
};
