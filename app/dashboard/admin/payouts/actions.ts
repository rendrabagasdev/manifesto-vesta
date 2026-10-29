"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/src/lib/auth/session";
import { ApiError } from "@/src/lib/api/http";
import { reviewWithdrawal } from "@/src/lib/wallet/service";

export interface PayoutActionState {
  error?: string;
  success?: string;
}

const reviewSchema = z.object({
  withdrawalId: z.coerce.number().int().positive(),
  decision: z.enum(["APPROVED", "REJECTED"]),
  decisionNote: z
    .string()
    .trim()
    .max(200, "Catatan keputusan maksimal 200 karakter.")
    .optional(),
});

export async function reviewWithdrawalAction(
  _previousState: PayoutActionState,
  formData: FormData,
): Promise<PayoutActionState> {
  const user = await requireRole(["ADMIN"]);

  const parsed = reviewSchema.safeParse({
    withdrawalId: formData.get("withdrawalId"),
    decision: formData.get("decision"),
    decisionNote: formData.get("decisionNote") || undefined,
  });
  if (!parsed.success) {
    return { error: "Data review penarikan tidak valid." };
  }

  try {
    const result = await reviewWithdrawal({
      actorId: Number(user.id),
      actorRole: user.role,
      withdrawalId: parsed.data.withdrawalId,
      approve: parsed.data.decision === "APPROVED",
      decisionNote: parsed.data.decisionNote,
    });

    revalidatePath("/dashboard/admin/payouts");

    return {
      success:
        result.status === "APPROVED"
          ? `Penarikan #${result.id} disetujui dan saldo produsen didebit.`
          : `Penarikan #${result.id} ditolak. Saldo tidak berubah.`,
    };
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    console.error("reviewWithdrawalAction", error);
    return { error: "Review penarikan gagal. Coba lagi." };
  }
}
