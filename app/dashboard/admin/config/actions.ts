"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/src/lib/auth/session";
import {
  assertValidThresholds,
  savePlatformConfig,
  type PlatformConfigPatch,
} from "@/src/lib/config/platform";

const percent = z.coerce
  .number({ error: "Isi nilai ambang." })
  .int("Ambang harus bilangan bulat.")
  .min(0, "Ambang minimal 0.")
  .max(100, "Ambang maksimal 100.");

const hours = z.coerce
  .number({ error: "Isi durasi dalam jam." })
  .int("Durasi harus bilangan bulat.")
  .min(0, "Durasi minimal 0 jam.")
  .max(8760, "Durasi maksimal 8760 jam.");

const rupiah = z.coerce
  .number({ error: "Isi biaya per kg." })
  .int("Biaya harus bilangan bulat.")
  .min(0, "Biaya minimal Rp0.")
  .max(10_000_000, "Biaya maksimal Rp10.000.000.");

const configSchema = z.object({
  thresholdFresh: percent,
  thresholdRescue: percent,
  thresholdFeed: percent,
  thresholdResidue: percent,
  rescueTimerHours: hours,
  feedTimerHours: hours,
  residueTimerHours: hours,
  warehouseCostPerKg: rupiah,
  logisticsCostPerKg: rupiah,
  marginPerKg: rupiah,
  rescueDealDurationHours: z.coerce
    .number({ error: "Isi durasi penawaran layu." })
    .int("Durasi harus bilangan bulat.")
    .min(1, "Durasi penawaran layu minimal 1 jam.")
    .max(720, "Durasi penawaran layu maksimal 720 jam."),
  earlyAccessWindowHours: z.coerce
    .number({ error: "Isi jendela akses awal." })
    .int("Jendela harus bilangan bulat.")
    .min(0, "Jendela minimal 0 jam.")
    .max(168, "Jendela maksimal 168 jam."),
});

export type ConfigFormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export async function saveConfigAction(
  _previousState: ConfigFormState,
  formData: FormData,
): Promise<ConfigFormState> {
  const user = await requireRole(["ADMIN"]);
  const parsed = configSchema.safeParse({
    thresholdFresh: formData.get("thresholdFresh"),
    thresholdRescue: formData.get("thresholdRescue"),
    thresholdFeed: formData.get("thresholdFeed"),
    thresholdResidue: formData.get("thresholdResidue"),
    rescueTimerHours: formData.get("rescueTimerHours"),
    feedTimerHours: formData.get("feedTimerHours"),
    residueTimerHours: formData.get("residueTimerHours"),
    warehouseCostPerKg: formData.get("warehouseCostPerKg"),
    logisticsCostPerKg: formData.get("logisticsCostPerKg"),
    marginPerKg: formData.get("marginPerKg"),
    rescueDealDurationHours: formData.get("rescueDealDurationHours"),
    earlyAccessWindowHours: formData.get("earlyAccessWindowHours"),
  });

  if (!parsed.success) {
    return {
      error: "Periksa kembali nilai konfigurasi.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const thresholdValues = {
    fresh: parsed.data.thresholdFresh,
    rescue: parsed.data.thresholdRescue,
    feed: parsed.data.thresholdFeed,
    residue: parsed.data.thresholdResidue,
  };

  try {
    assertValidThresholds(thresholdValues);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Ambang cascade tidak valid.",
    };
  }

  const patch: PlatformConfigPatch = {
    thresholdFresh: thresholdValues.fresh,
    thresholdRescue: thresholdValues.rescue,
    thresholdFeed: thresholdValues.feed,
    thresholdResidue: thresholdValues.residue,
    rescueTimerHours: parsed.data.rescueTimerHours,
    feedTimerHours: parsed.data.feedTimerHours,
    residueTimerHours: parsed.data.residueTimerHours,
    warehouseCostPerKg: parsed.data.warehouseCostPerKg,
    logisticsCostPerKg: parsed.data.logisticsCostPerKg,
    marginPerKg: parsed.data.marginPerKg,
    rescueDealDurationHours: parsed.data.rescueDealDurationHours,
    earlyAccessWindowHours: parsed.data.earlyAccessWindowHours,
  };

  try {
    await savePlatformConfig(patch, Number(user.id));
  } catch (error) {
    console.error("saveConfigAction", error);
    return { error: "Konfigurasi gagal disimpan. Coba lagi." };
  }

  revalidatePath("/dashboard/admin/config");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/batches");
  revalidatePath("/marketplace");
  revalidatePath("/rescue-deals");

  return { success: "Konfigurasi cascade berhasil disimpan." };
}
