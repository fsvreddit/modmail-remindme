import { Context } from "hono";
import { queueAdhocTask } from "../core";

export const onAppUpgrade = async (context: Context) => {
    await queueAdhocTask();

    return context.json({ message: "app upgraded" }, 200);
};
