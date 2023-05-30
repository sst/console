import { EventHandler } from "./handler";
import { Events } from "@console/core/test";

export const handler = EventHandler(Events.Test, async () => {});
