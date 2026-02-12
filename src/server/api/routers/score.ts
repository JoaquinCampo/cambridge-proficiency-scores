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

function enrichScore<
  T extends {
    reading: number | null;
    useOfEnglish: number | null;
    writing: number | null;
    listening: number | null;
    speaking: number | null;
  },
>(score: T) {
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

  dashboard: teacherProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No active organization",
      });
    }

    const allScores = await ctx.db.scoreLog.findMany({
      where: { organizationId: ctx.orgId },
      orderBy: { examDate: "desc" },
      include: { user: true },
    });

    // Group by student — keep examDate alongside enriched data
    type EnrichedWithDate = ReturnType<typeof enrichScore> & {
      examDate: Date;
    };
    const byStudent = new Map<
      string,
      { name: string; scores: EnrichedWithDate[] }
    >();
    for (const score of allScores) {
      const enriched = {
        ...enrichScore(score),
        examDate: score.examDate,
      };
      const existing = byStudent.get(score.userId);
      if (existing) {
        existing.scores.push(enriched);
      } else {
        byStudent.set(score.userId, {
          name: score.user.name ?? "Unknown",
          scores: [enriched],
        });
      }
    }

    // Filter out the teacher
    if (ctx.userId) byStudent.delete(ctx.userId);

    const totalStudents = byStudent.size;

    // Latest score per student
    const latestPerStudent = [...byStudent.entries()].map(
      ([userId, { name, scores }]) => {
        const latest = scores[0]!;
        const previous = scores[1];
        return { userId, name, latest, previous };
      },
    );

    // Class average (from latest scores)
    const latestOveralls = latestPerStudent.map((s) => s.latest.overall);
    const classAverage =
      latestOveralls.length > 0
        ? Math.round(
            latestOveralls.reduce((a, b) => a + b, 0) / latestOveralls.length,
          )
        : 0;

    // Pass rate (C2 pass = overall >= 200, i.e. Grade A/B/C)
    const passing = latestOveralls.filter((o) => o >= 200).length;
    const passRate =
      totalStudents > 0 ? Math.round((passing / totalStudents) * 100) : 0;

    // Band distribution (from latest scores)
    const bandDistribution = { A: 0, B: 0, C: 0, C1: 0, below: 0 };
    for (const s of latestPerStudent) {
      const label = s.latest.band.label;
      if (label === "Grade A") bandDistribution.A++;
      else if (label === "Grade B") bandDistribution.B++;
      else if (label === "Grade C") bandDistribution.C++;
      else if (label === "Level C1") bandDistribution.C1++;
      else bandDistribution.below++;
    }

    // Class skill averages (from latest scores only)
    const skillTotals: Record<ComponentKey, { sum: number; count: number }> = {
      reading: { sum: 0, count: 0 },
      useOfEnglish: { sum: 0, count: 0 },
      writing: { sum: 0, count: 0 },
      listening: { sum: 0, count: 0 },
      speaking: { sum: 0, count: 0 },
    };
    for (const s of latestPerStudent) {
      for (const [key, value] of Object.entries(s.latest.scaleScores)) {
        if (value != null) {
          const k = key as ComponentKey;
          skillTotals[k].sum += value;
          skillTotals[k].count++;
        }
      }
    }
    const skillAverages = Object.fromEntries(
      Object.entries(skillTotals).map(([key, { sum, count }]) => [
        key,
        count > 0 ? Math.round(sum / count) : 0,
      ]),
    ) as Record<ComponentKey, number>;

    // Top performers (top 3 by latest overall)
    const topPerformers = [...latestPerStudent]
      .sort((a, b) => b.latest.overall - a.latest.overall)
      .slice(0, 3)
      .map((s) => ({
        userId: s.userId,
        name: s.name,
        overall: s.latest.overall,
        band: s.latest.band,
      }));

    // Most improved (top 3 by delta between latest and previous)
    const mostImproved = latestPerStudent
      .filter((s) => s.previous)
      .map((s) => ({
        userId: s.userId,
        name: s.name,
        delta: s.latest.overall - s.previous!.overall,
      }))
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 3);

    // Students needing attention — prioritized, one flag per student
    const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    const attention: {
      userId: string;
      name: string;
      reason: "regressing" | "below_pass" | "inactive" | "incomplete";
      detail: string;
      overall: number;
    }[] = [];

    for (const s of latestPerStudent) {
      const delta = s.previous
        ? s.latest.overall - s.previous.overall
        : null;

      // Regressing: dropped 10+ points between exams
      if (delta !== null && delta <= -10) {
        attention.push({
          userId: s.userId,
          name: s.name,
          reason: "regressing",
          detail: `Latest: ${s.latest.overall} — dropped ${Math.abs(delta)} pts`,
          overall: s.latest.overall,
        });
        continue;
      }

      // Below pass: under 200 (C2 pass threshold) with at least 2 exams
      const studentScores = byStudent.get(s.userId)?.scores ?? [];
      if (
        s.latest.overall < 200 &&
        s.latest.overall > 0 &&
        studentScores.length >= 2 &&
        studentScores.slice(0, 2).every((sc) => sc.overall < 200)
      ) {
        attention.push({
          userId: s.userId,
          name: s.name,
          reason: "below_pass",
          detail: `Latest: ${s.latest.overall} — below C2 pass mark`,
          overall: s.latest.overall,
        });
        continue;
      }

      // Inactive: no scores in 4+ weeks
      const latestDate = byStudent.get(s.userId)?.scores[0]?.examDate;
      if (latestDate && latestDate < fourWeeksAgo) {
        attention.push({
          userId: s.userId,
          name: s.name,
          reason: "inactive",
          detail: "No scores logged in 4+ weeks",
          overall: s.latest.overall,
        });
        continue;
      }

      // Incomplete: last 2 exams both have fewer than 3 skills
      if (
        studentScores.length >= 2 &&
        studentScores.slice(0, 2).every((sc) => sc.included < 3)
      ) {
        attention.push({
          userId: s.userId,
          name: s.name,
          reason: "incomplete",
          detail: `Only ${s.latest.included} of 5 skills in recent exams`,
          overall: s.latest.overall,
        });
      }
    }

    // Sort attention: regressing first, then below_pass, inactive, incomplete
    const reasonOrder = { regressing: 0, below_pass: 1, inactive: 2, incomplete: 3 };
    attention.sort((a, b) => reasonOrder[a.reason] - reasonOrder[b.reason]);

    // Class progress over time — monthly averages
    const monthlyMap = new Map<string, number[]>();
    for (const score of allScores) {
      if (ctx.userId && score.userId === ctx.userId) continue;
      const key = `${score.examDate.getFullYear()}-${String(score.examDate.getMonth() + 1).padStart(2, "0")}`;
      const arr = monthlyMap.get(key) ?? [];
      arr.push(enrichScore(score).overall);
      monthlyMap.set(key, arr);
    }
    const classProgress = [...monthlyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, overalls]) => ({
        month,
        average: Math.round(
          overalls.reduce((a, b) => a + b, 0) / overalls.length,
        ),
      }));

    return {
      totalStudents,
      classAverage,
      passRate,
      passing,
      bandDistribution,
      skillAverages,
      topPerformers,
      mostImproved,
      attention,
      classProgress,
    };
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
