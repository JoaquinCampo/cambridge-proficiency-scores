import { groupRouter } from "~/server/api/routers/group";
import { scoreRouter } from "~/server/api/routers/score";
import { userRouter } from "~/server/api/routers/user";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  group: groupRouter,
  score: scoreRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
