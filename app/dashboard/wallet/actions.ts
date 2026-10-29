"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/src/lib/auth/session";
import { ApiError } from "@/src/lib/api/http";
import { requestWithdrawal } from "@/src/lib/wallet/service";
import { MIN_WITHDRAWAL_AMOUNT } from "@/src/lib/wallet/service";

export interface WalletActionState {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

const withdrawalSchema = z.object({
  amount: z.coerce
    .number({ message: "Jumlah penarikan tidak valid." })
    .int("Jumlah penarikan harus bilangan bulat rupiah.")
    .min(
      MIN_WITHDRAWAL_AMOUNT,
      `Minimal penarikan Rp${MIN_WITHDRAWAL_AMOUNT.toLocaleString("id-ID")}.`,
    ),
  bankName: z
    .string()
    .trim()
    .min(2, "Nama bank minimal 2 karakter.")
    .max(60, "Nama bank maksimal 60 karakter."),
  bankAccountName: z
    .string()
    .trim()
    .min(2, "Nama pemilik rekening minimal 2 karakter.")
    .max(80, "Nama pemilik rekening maksimal 80 karakter."),
  bankAccountNumber: z
    .string()
    .trim()
    .regex(/^[0-9]{6,20}$/, "Nomor rekening 6-20 digit angka."),
  note: z
    .string()
    .trim()
    .max(200, "Catatan maksimal 200 karakter.")
    .optional(),
});

export async function requestWithdrawalAction(
  _previousState: WalletActionState,
  formData: FormData,
): Promise<WalletActionState> {
  const user = await requireRole(["PRODUCER"]);
  const userId = Number(user.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return { error: "Sesi pengguna tidak valid." };
  }

  const parsed = withdrawalSchema.safeParse({
    amount: formData.get("amount"),
    bankName: formData.get("bankName"),
    bankAccountName: formData.get("bankAccountName"),
    bankAccountNumber: formData.get("bankAccountNumber"),
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    return {
      error: "Periksa kembali data penarikan.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await requestWithdrawal({
      userId,
      amount: parsed.data.amount,
      bankName: parsed.data.bankName,
      bankAccountName: parsed.data.bankAccountName,
      bankAccountNumber: parsed.data.bankAccountNumber,
      note: parsed.data.note,
    });

    revalidatePath("/dashboard/wallet");
    revalidatePath("/dashboard");

    return {
      success: `Permintaan penarikan #${result.id} dikirim. Saldo tetap terkunci sampai admin menyetujui.`,
    };
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    console.error("requestWithdrawalAction", error);
    return { error: "Permintaan penarikan gagal. Coba lagi." };
  }
}
