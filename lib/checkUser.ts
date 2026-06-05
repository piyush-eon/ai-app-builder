import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "./prisma";
import { PLANS } from "./constants";
import type { Plan } from "@/types/plans";

const getCurrentPlan = async (): Promise<Plan> => {
  const { has } = await auth();
  if (has({ plan: "pro" })) return "pro";
  if (has({ plan: "starter" })) return "starter";
  return "free";
};

export const checkUser = async () => {
  const user = await currentUser();
  if (!user) return null;

  try {
    const currentPlan = await getCurrentPlan();

    const existing = await db.user.findUnique({
      where: { clerkId: user.id },
    });

    if (existing) {
      if (existing.plan !== currentPlan) {
        // Only top up credits on upgrade (positive delta), not on downgrade
        const existingPlanCredits = PLANS[existing.plan as Plan]?.credits ?? 0;
        const newPlanCredits = PLANS[currentPlan].credits;
        const creditDelta = newPlanCredits - existingPlanCredits;

        // Use updateMany with the old plan in the where clause to prevent
        // race conditions from double-crediting on concurrent requests
        await db.user.updateMany({
          where: { clerkId: user.id, plan: existing.plan },
          data: {
            plan: currentPlan,
            credits:
              creditDelta > 0
                ? existing.credits + creditDelta
                : existing.credits,
          },
        });

        // Re-fetch and return the updated record
        return await db.user.findUnique({ where: { clerkId: user.id } });
      }

      return existing;
    }

    // New user — create with free plan credits
    return await db.user.create({
      data: {
        clerkId: user.id,
        name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
        email: user.emailAddresses[0].emailAddress,
        imageUrl: user.imageUrl ?? "",
        credits: PLANS.free.credits,
        plan: "free",
      },
    });
  } catch (error) {
    console.error("checkUser error:", error);
    return null;
  }
};
