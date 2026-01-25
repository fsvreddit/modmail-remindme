import { OnAppUpgradeRequest } from "@devvit/web/shared";
import { Request, Response } from "express";
import { queueAdhocTask } from "../core";

export const onAppUpgrade = async (request: Request, response: Response) => {
    console.log("onAppUpgrade:", request.body);
    const event = request.body as OnAppUpgradeRequest;
    console.log(event);

    await queueAdhocTask();

    return response.status(200).json({ message: "app upgraded" });
};
