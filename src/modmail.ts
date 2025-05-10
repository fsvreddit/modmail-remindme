import { TriggerContext } from "@devvit/public-api";
import { ModMail } from "@devvit/protos";
import { parseCancellation, parseCommandDate } from "./commandParser.js";
import { cancelReminder, getConversationReminderDate, queueReminder } from "./sendReminders.js";
import json2md from "json2md";

export async function handleModmail (event: ModMail, context: TriggerContext) {
    if (event.messageAuthor?.name === context.appName) {
        return;
    }

    const conversation = await context.reddit.modMail.getConversation({ conversationId: event.conversationId });
    if (!conversation.conversation) {
        console.error("Modmail: Conversation not found");
        return;
    }

    const messagesInConversation = Object.values(conversation.conversation.messages);
    const currentMessage = messagesInConversation.find(message => message.id && event.messageId.includes(message.id));
    if (!currentMessage) {
        console.error("Modmail: Current message not found");
        return;
    }

    if (!currentMessage.bodyMarkdown) {
        console.log(`Modmail: Message ${currentMessage.id} has no body`);
        return;
    }

    if (currentMessage.participatingAs !== "moderator") {
        console.log(`Modmail: Message ${currentMessage.id} is not from a moderator`);
        return;
    }

    const message: json2md.DataObject[] = [];

    if (parseCancellation(currentMessage.bodyMarkdown)) {
        const reminderDate = await getConversationReminderDate(event.conversationId, context);
        if (!reminderDate) {
            console.log(`Modmail: Cancellation command received, but no reminder date found for conversation ${event.conversationId}`);
            message.push({ p: "No reminder is scheduled for this modmail conversation." });
        } else {
            await cancelReminder(event.conversationId, context);
            message.push({ p: `Reminder for this modmail conversation has been cancelled. The reminder was scheduled for ${reminderDate.toUTCString()}.` });
        }
    };

    const reminderDate = parseCommandDate(currentMessage.bodyMarkdown);
    if (reminderDate) {
        console.log(`Modmail: Remind command found in message ${currentMessage.id} for ${reminderDate.toUTCString()}`);
        const existingReminderDate = await getConversationReminderDate(event.conversationId, context);
        await queueReminder(event.conversationId, currentMessage.author?.name, reminderDate, context);
        message.push({ p: `A reminder for this modmail conversation has been scheduled for ${reminderDate.toUTCString()}.` });
        if (existingReminderDate) {
            message.push({ p: `A previous reminder was scheduled for ${existingReminderDate.toUTCString()}, and this has been replaced.` });
        }
    }

    if (message.length > 0) {
        await context.reddit.modMail.reply({
            conversationId: event.conversationId,
            body: json2md(message),
            isInternal: true,
        });
    }
}
