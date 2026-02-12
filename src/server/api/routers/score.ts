import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  protectedProcedure,
  teacherProcedure,
} from "~/server/api/trpc";
import {
  estimateScaleScore,
  calculateOverallScore,
  getOverallBand,
  type ComponentKey,
  type ScaleScoreMap,
} from "~/lib/scoring";

const createScoreInput = z.object({
  examDate: z.date(),
  reading: z.number().int().min(0).max(44).nullable(),
  useOfEnglish: z.number().int().min(0).max(28).nullable(),
  writing: z.number().int().min(0).max(40).nullable(),
  listening: z.number().int().min(0).max(30).nullable(),
  speaking: z
    .number()
    .min(0)
    .max(75)
    .refine((v) => v % 0.5 === 0, {
      message: "Speaking allows half marks only",
    })
    .nullable(),
  notes: z.string().max(500).optional(),
});

const updateScoreInput = z.object({
  id: z.string(),
  examDate: z.date().optional(),
  reading: z.number().int().min(0).max(44).nullable().optional(),
  useOfEnglish: z.number().int().min(0).max(28).nullable().optional(),
  writing: z.number().int().min(0).max(40).nullable().optional(),
  listening: z.number().int().min(0).max(30).nullable().optional(),
  speaking: z
    .number()
    .min(0)
    .max(75)
    .refine((v) => v % 0.5 === 0, {
      message: "Speaking allows half marks only",
    })
    .nullable()
    .optional(),
  notes: z.string().max(500).optional().nullable(),
});

function enrichScore(score: {
  reading: number | null;
  useOfEnglish: number | null;
  writing: number | null;
  listening: number | null;
  speaking: number | null;
  [key: string]: unknown;
}) {
  const components: { key: ComponentKey; raw: number | null }[] = [
    { key: "reading", raw: score.reading },
    { key: "useOfEnglish", raw: score.useOfEnglish },
    { key: "writing", raw: score.writing },
    { key: "listening", raw: score.listening },
    { key: "speaking", raw: score.speaking },
  ];

  const scaleScores: ScaleScoreMap = {};
  for (const { key, raw } of components) {
    if (raw != null) {
      scaleScores[key] = estimateScaleScore(key, raw);
    }
  }

  const { overall, included, isComplete } = calculateOverallScore(scaleScores);
  const band = getOverallBand(overall);

  return {
    ...score,
    scaleScores,
    overall,
    included,
    isComplete,
    band,
  };
}

export const scoreRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createScoreInput)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization",
        });
      }

      const score = await ctx.db.scoreLog.create({
        data: {
          userId: ctx.userId,
          organizationId: ctx.orgId,
          examDate: input.examDate,
          reading: input.reading,
          useOfEnglish: input.useOfEnglish,
          writing: input.writing,
          listening: input.listening,
          speaking: input.speaking,
          notes: input.notes,
        },
      });

      return enrichScore(score);
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const scores = await ctx.db.scoreLog.findMany({
      where: { userId: ctx.userId },
      orderBy: { examDate: "desc" },
    });

    return scores.map(enrichScore);
  }),

  progress: protectedProcedure.query(async ({ ctx }) => {
    const scores = await ctx.db.scoreLog.findMany({
      where: { userId: ctx.userId },
      orderBy: { examDate: "asc" },
    });

    return scores.map(enrichScore);
  }),

  update: protectedProcedure
    .input(updateScoreInput)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.scoreLog.findUnique({
        where: { id: input.id },
      });

      if (!existing || existing.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const { id, ...data } = input;
      const score = await ctx.db.scoreLog.update({
        where: { id },
        data,
      });

      return enrichScore(score);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.scoreLog.findUnique({
        where: { id: input.id },
      });

      if (!existing || existing.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await ctx.db.scoreLog.delete({ where: { id: input.id } });
      return { success: true };
    }),

  latestByStudent: teacherProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No active organization",
      });
    }

    // Get the 2 most recent scores per student for delta calculation
    const allScores = await ctx.db.scoreLog.findMany({
      where: { organizationId: ctx.orgId },
      orderBy: { examDate: "desc" },
    });

    const byStudent = new Map<string, typeof allScores>();
    for (const score of allScores) {
      const existing = byStudent.get(score.userId) ?? [];
      if (existing.length < 2) {
        existing.push(score);
        byStudent.set(score.userId, existing);
      }
    }

    const result: Record<
      string,
      { latest: ReturnType<typeof enrichScore>; previous?: ReturnType<typeof enrichScore> }
    > = {};

    for (const [userId, scores] of byStudent) {
      const latest = scores[0];
      const previous = scores[1];
      if (latest) {
        result[userId] = {
          latest: enrichScore(latest),
          previous: previous ? enrichScore(previous) : undefined,
        };
      }
    }

    return result;
  }),

  studentProgress: teacherProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization",
        });
      }

      const scores = await ctx.db.scoreLog.findMany({
        where: {
          userId: input.studentId,
          organizationId: ctx.orgId,
        },
        orderBy: { examDate: "asc" },
      });

      return scores.map(enrichScore);
    }),
});
