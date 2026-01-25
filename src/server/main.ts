import express from "express";
import {
    createServer,
    getServerPort,
} from "@devvit/web/server";
import {
    onAppUpgrade,
    onModmailReceive,
} from "./triggers/index.js";
import {
    sendReminderJob,
} from "./tasks/index.js";

const application = express();
application.use(express.json());
application.use(express.urlencoded({ extended: true }));
application.use(express.text());

const router = express.Router();
router.post("/internal/triggers/app-upgrade", onAppUpgrade);
router.post("/internal/triggers/modmail", onModmailReceive);
router.post("/internal/tasks/send-reminder-job", sendReminderJob);

application.use(router);

const server = createServer(application);
server.on("error", (err) => {
    console.error(`server error; ${err.stack}`);
});

const port = getServerPort();
server.listen(port);
