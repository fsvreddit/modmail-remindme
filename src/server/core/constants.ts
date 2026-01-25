export enum AppSetting {
    SendRemindersForSuspendedAccounts = "sendRemindersForSuspendedAccounts",
}

export enum SchedulerJob {
    SendReminderJob = "sendReminderJob",
}

export const SEND_REMINDER_CRON = "0 1 * * *";
