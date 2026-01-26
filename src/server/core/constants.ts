export enum AppSetting {
    SendRemindersForSuspendedAccounts = "sendRemindersForSuspendedAccounts",
}

export enum SchedulerJob {
    SendReminderJob = "sendReminderJob",
}

export enum Endpoint {
    SendReminderJob = "/internal/tasks/send-reminder-job",
    ModmailReceive = "/internal/triggers/modmail",
    AppUpgrade = "/internal/triggers/app-upgrade",
}

export const SEND_REMINDER_CRON = "0 1 * * *";
