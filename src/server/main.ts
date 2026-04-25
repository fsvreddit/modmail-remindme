import { getRequestListener } from "@hono/node-server";
import { Hono } from "hono";
import { createServer, getServerPort } from "@devvit/web/server";
import { onAppUpgrade, onModmailReceive } from "./triggers/index.js";
import { sendReminderJob } from "./tasks/index.js";
import { Endpoint } from "./core/index.js";

const application = new Hono();

application.post(Endpoint.AppUpgrade, onAppUpgrade);
application.post(Endpoint.ModmailReceive, onModmailReceive);
application.post(Endpoint.SendReminderJob, sendReminderJob);

const server = createServer(getRequestListener(application.fetch));
server.on("error", (err) => {
    console.error(`server error; ${err.stack}`);
});

const port = getServerPort();
server.listen(port);
