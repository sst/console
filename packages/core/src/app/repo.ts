//import { z } from "zod";
//import { zod } from "../util/zod";
//import { useTransaction } from "../util/transaction";
//import { appRepo } from "./app.sql";
//import { useWorkspace } from "../actor";
//import { createId } from "@paralleldrive/cuid2";
//import { createSelectSchema } from "drizzle-zod";
//
//export * as AppRepo from "./repo";
//
//export type RepoData = {
//  type: "github";
//  repoID: number;
//};
//
//export const Info = createSelectSchema(appRepo).extend({
//  repoID: z.number().int(),
//});
//export type Info = z.infer<typeof Info>;
//
//export const connect = zod(
//  z.object({
//    appID: Info.shape.appID,
//    data: z.custom<RepoData>(),
//  }),
//  async (input) => {
//    await useTransaction(async (tx) =>
//      tx
//        .insert(appRepo)
//        .values({
//          workspaceID: useWorkspace(),
//          id: createId(),
//          appID: input.appID,
//          data: input.data,
//        })
//        .onDuplicateKeyUpdate({
//          set: {
//            data: input.data,
//          },
//        })
//        .execute()
//    );
//  }
//);
//
////export const disconnect = zod(Info.shape.appID, (input) =>
////  useTransaction((tx) => {
////    return tx
////      .delete(appRepo)
////      .where(
////        and(eq(appRepo.id, input), eq(appRepo.workspaceID, useWorkspace()))
////      )
////      .execute();
////  })
////);
////
//
