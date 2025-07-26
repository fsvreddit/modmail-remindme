import { SettingsFormField } from "@devvit/public-api";

export enum AppSetting {
    SendRemindersForSuspendedAccounts = "sendRemindersForSuspendedAccounts",
}

export const appSettings: SettingsFormField[] = [
    {
        name: AppSetting.SendRemindersForSuspendedAccounts,
        type: "boolean",
        label: "Send reminders for deleted, suspended and shadowbanned accounts",
        helpText: "If enabled, reminders will be sent even if the account has been deleted, suspended or shadowbanned.",
        defaultValue: true,
    },
];
