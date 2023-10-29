export * as Replicache from ".";
import { Realtime } from "../realtime";

export async function poke(profileID?: string) {
  console.log("sending poke");
  await Realtime.publish("poke", {});
  console.log("poke sent");
}
