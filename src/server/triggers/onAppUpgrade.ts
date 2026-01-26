import { Request, Response } from "express";
import { queueAdhocTask } from "../core";

export const onAppUpgrade = async (_: Request, response: Response) => {
    await queueAdhocTask();

    return response.status(200).json({ message: "app upgraded" });
};
