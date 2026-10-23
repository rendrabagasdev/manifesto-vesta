/**
 * Midtrans Snap (sandbox) helper.
 *
 * When MIDTRANS_SERVER_KEY is configured, `createSnapTransaction` asks Midtrans
 * for a Snap token and returns the hosted payment page URL. Without a key the
 * platform runs in demo mode: orders are marked PAID immediately so the whole
 * cascade flow stays testable for judges.
 */

const SNAP_ENDPOINT = "https://app.sandbox.midtrans.com/snap/v1/transactions";

export interface SnapItem {
  id: string;
  price: number;
  quantity: number;
  name: string;
}

export interface SnapCustomer {
  first_name?: string;
  email?: string;
  phone?: string;
}

export interface SnapResult {
  token: string;
  redirectUrl: string;
}

export function isMidtransConfigured(): boolean {
  return Boolean(process.env.MIDTRANS_SERVER_KEY);
}

export async function createSnapTransaction(options: {
  orderId: string;
  grossAmount: number;
  items: SnapItem[];
  customer?: SnapCustomer;
}): Promise<SnapResult | null> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) return null;

  const auth = Buffer.from(`${serverKey}:`).toString("base64");

  const response = await fetch(SNAP_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: options.orderId,
        gross_amount: options.grossAmount,
      },
      item_details: options.items,
      customer_details: options.customer,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Midtrans Snap gagal (${response.status}): ${detail}`);
  }

  const payload = (await response.json()) as { token: string; redirect_url: string };
  return { token: payload.token, redirectUrl: payload.redirect_url };
}
