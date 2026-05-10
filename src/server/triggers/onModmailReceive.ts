import { context, GetConversationResponse, reddit } from "@devvit/web/server";
import { OnModMailRequest, TriggerResponse } from "@devvit/web/shared";
import { Context } from "hono";
import { cancelReminder, formatDateForLogs, formatDateForModmail, getConversationReminderDate, parseCancellation, parseCommandDate, queueReminder } from "../core";
import json2md from "json2md";
import { hasTriggerBeenHandled } from "@fsvreddit/fsv-devvit-web-helpers";

export const onModmailReceive = async (c: Context) => {
    const event = await c.req.json<OnModMailRequest>();

    if (event.messageAuthor?.name === context.appSlug) {
        return c.json<TriggerResponse>({ message: "ignoring self message" }, 200);
    }

    let conversation: GetConversationResponse;
    try {
        conversation = await reddit.modMail.getConversation({ conversationId: event.conversationId });
        if (!conversation.conversation) {
            console.error(`Modmail: Conversation ${event.conversationId} not found`);
            return c.json<TriggerResponse>({ message: "conversation not found" }, 404);
        }
    } catch (error) {
        console.error(`Modmail: Error fetching conversation ${event.conversationId}`, error);
        console.log(JSON.stringify(event, null, 2));
        return c.json<TriggerResponse>({ message: "error fetching conversation" }, 500);
    }

    const messagesInConversation = Object.values(conversation.conversation.messages);
    const currentMessage = messagesInConversation.find(message => message.id && event.messageId.includes(message.id));
    if (!currentMessage) {
        console.error("Modmail: Current message not found");
        return c.json<TriggerResponse>({ message: "current message not found" }, 400);
    }

    if (!currentMessage.bodyMarkdown) {
        return c.json<TriggerResponse>({ message: "no body markdown" }, 200);
    }

    if (currentMessage.participatingAs !== "moderator") {
        return c.json<TriggerResponse>({ message: "not a mod message" }, 200);
    }

    const message: json2md.DataObject[] = [];

    const isCancellation = parseCancellation(currentMessage.bodyMarkdown);
    const reminderDate = parseCommandDate(currentMessage.bodyMarkdown);
    if (!isCancellation && !reminderDate) {
        return c.json<TriggerResponse>({ message: "no action needed" }, 200);
    }

    if (await hasTriggerBeenHandled(event.messageId, { verboseLogs: true })) {
        console.log(`Modmail: Message ${event.messageId} already handled, duplicate trigger?`);
        return c.json<TriggerResponse>({ message: "duplicate trigger" }, 200);
    }

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

    return c.json<TriggerResponse>({ message: "modmail received" }, 200);
};
