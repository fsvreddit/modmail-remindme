import { Devvit } from "@devvit/public-api";
import { handleModmail } from "./modmail.js";
import { handleInstallActions } from "./installActions.js";
import { SEND_REMINDER_JOB } from "./constants.js";
import { sendReminders } from "./sendReminders.js";

Devvit.addTrigger({
    event: "ModMail",
    onEvent: handleModmail,
});

Devvit.addTrigger({
    events: ["AppInstall", "AppUpgrade"],
    onEvent: handleInstallActions,
});

Devvit.addSchedulerJob({
    name: SEND_REMINDER_JOB,
    onRun: sendReminders,
});

Devvit.configure({
    redditAPI: true,
});

export default Devvit;
