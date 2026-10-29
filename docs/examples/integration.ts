/**
 * Example: Vesta API Integration
 * 
 * Contoh integrasi dengan Vesta Marketplace API menggunakan TypeScript/JavaScript
 */

interface VestaConfig {
  baseUrl: string;
  sessionToken?: string;
  cronSecret?: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errorCode?: string;
}

interface Batch {
  id: number;
  code: string;
  status: 'FRESH' | 'RESCUE' | 'FEED' | 'RESIDUE' | 'DISPOSED';
  freshnessScore: number;
  quantityKg: number;
  reservedKg: number;
}

interface Order {
  code: string;
  paid: boolean;
  paymentUrl: string | null;
}

class VestaAPIClient {
  private baseUrl: string;
  private sessionToken?: string;
  private cronSecret?: string;

  constructor(config: VestaConfig) {
    this.baseUrl = config.baseUrl;
    this.sessionToken = config.sessionToken;
    this.cronSecret = config.cronSecret;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    // Session auth (untuk web apps)
    if (this.sessionToken) {
      headers['Cookie'] = `next-auth.session-token=${this.sessionToken}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();
    return data;
  }

  private async cronRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    if (!this.cronSecret) {
      throw new Error('Cron secret not configured');
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.cronSecret}`,
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();
    return data;
  }

  // Health Check
  async healthCheck() {
    return this.request('/api/health');
  }

  // Products
  async getProductBreakdown(productId: number): Promise<
    ApiResponse<{
      product: { id: number; name: string; category: string };
      cascadePricing: Array<{
        status: string;
        pricePerKg: number;
        discountPct: number;
      }>;
    }>
  > {
    return this.request(`/api/products/${productId}/breakdown`);
  }

  // Batches
  async createBatch(data: {
    productId: number;
    warehouseId: number;
    harvestDate: string;
    quantityKg: number;
    storageTempC: number;
    qualityNote?: string;
  }): Promise<ApiResponse<Batch>> {
    return this.request('/api/batches', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBatchQuality(
    batchId: number,
    data: {
      storageTempC?: number;
      qualityNote?: string;
      isManuallyAdjusted?: boolean;
    }
  ): Promise<ApiResponse<Batch>> {
    return this.request(`/api/batches/${batchId}/quality`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async syncBatchState(batchId: number): Promise<ApiResponse<Batch>> {
    return this.request(`/api/batches/${batchId}/sync`, {
      method: 'POST',
    });
  }

  // Orders
  async placeOrder(data: {
    items: Array<{
      batchId: number;
      quantityKg: number;
      source?: 'FRESH' | 'RESCUE' | 'FEED' | 'RESIDUE';
    }>;
    deliveryAddress?: string;
    contactPhone?: string;
    notes?: string;
    kind?: 'REGULAR' | 'PREORDER';
    scheduledFor?: string;
    recurrence?: 'NONE' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  }): Promise<ApiResponse<Order>> {
    return this.request('/api/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Rescue Deals
  async claimRescueDeal(
    dealId: number,
    quantityKg: number
  ): Promise<ApiResponse<Order & { quota: unknown }>> {
    return this.request(`/api/rescue-deals/${dealId}/claim`, {
      method: 'POST',
      body: JSON.stringify({ quantityKg }),
    });
  }

  // Cascade
  async simulateTick(hours: number = 24): Promise<
    ApiResponse<{ newRescueDeals: number; statusTransitions: number }>
  > {
    return this.request('/api/demo/simulate-tick', {
      method: 'POST',
      body: JSON.stringify({ hours }),
    });
  }

  async cascadeTick() {
    return this.cronRequest('/api/cron/cascade-tick');
  }

  // Admin
  async getPlatformConfig() {
    return this.request('/api/admin/config');
  }

  async updatePlatformConfig(data: {
    thresholds?: {
      fresh?: number;
      rescue?: number;
      feed?: number;
      residue?: number;
    };
    stageTimersHours?: {
      FRESH?: number | null;
      RESCUE?: number | null;
      FEED?: number | null;
      RESIDUE?: number | null;
    };
    pricing?: {
      warehouseCostPerKg?: number;
      logisticsCostPerKg?: number;
      marginPerKg?: number;
    };
    rescueDealDurationHours?: number;
    earlyAccessWindowHours?: number;
  }) {
    return this.request('/api/admin/config', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

// ===========================
// USAGE EXAMPLES
// ===========================

async function examples() {
  // Initialize client
  const client = new VestaAPIClient({
    baseUrl: 'http://localhost:3000',
    sessionToken: 'your-session-token-here',
    cronSecret: process.env.CRON_SECRET,
  });

  // Example 1: Health check
  const health = await client.healthCheck();
  console.log('Health:', health);

  // Example 2: Create a batch (as Producer)
  const batch = await client.createBatch({
    productId: 1,
    warehouseId: 1,
    harvestDate: '2026-10-20',
    quantityKg: 500,
    storageTempC: 5.0,
    qualityNote: 'Grade A, organik',
  });

  if (batch.success && batch.data) {
    console.log('Batch created:', batch.data.code);

    // Example 3: Update batch quality (as Warehouse)
    const updated = await client.updateBatchQuality(batch.data.id, {
      storageTempC: 7.5,
      qualityNote: 'Suhu naik sedikit',
    });

    if (updated.success && updated.data) {
      console.log('Batch updated, new score:', updated.data.freshnessScore);

      if (updated.data.status === 'RESCUE') {
        console.log('⚠️ Batch transitioned to RESCUE status!');
      }
    }
  }

  // Example 4: Place an order (as Consumer)
  const order = await client.placeOrder({
    items: [
      {
        batchId: 123,
        quantityKg: 10.0,
      },
    ],
    deliveryAddress: 'Jl. Raya No. 123, Jakarta',
    contactPhone: '081234567890',
  });

  if (order.success && order.data) {
    console.log('Order placed:', order.data.code);

    if (order.data.paymentUrl) {
      console.log('Payment URL:', order.data.paymentUrl);
      // Redirect user to payment page
    }
  }

  // Example 5: Claim rescue deal (as Consumer)
  const deal = await client.claimRescueDeal(45, 5.0);

  if (deal.success && deal.data) {
    console.log('Rescue deal claimed:', deal.data.code);
    console.log('Quota remaining:', deal.data.quota);
  } else if (deal.errorCode === 'RESCUE_QUOTA_EXHAUSTED') {
    console.log('Weekly quota exhausted, try again next week');
  }

  // Example 6: Simulate time (as Admin, for demo)
  const simulation = await client.simulateTick(48);

  if (simulation.success && simulation.data) {
    console.log('Simulated 48 hours forward');
    console.log('New rescue deals:', simulation.data.newRescueDeals);
    console.log('Status transitions:', simulation.data.statusTransitions);
  }

  // Example 7: Get product pricing breakdown (public)
  const breakdown = await client.getProductBreakdown(1);

  if (breakdown.success && breakdown.data) {
    console.log('Product:', breakdown.data.product.name);
    console.log('Cascade pricing:');
    breakdown.data.cascadePricing.forEach((stage) => {
      console.log(
        `  ${stage.status}: Rp ${stage.pricePerKg} (${stage.discountPct}% off)`
      );
    });
  }

  // Example 8: Update platform config (as Admin)
  const config = await client.updatePlatformConfig({
    thresholds: {
      fresh: 75,
      rescue: 45,
    },
    stageTimersHours: {
      RESCUE: 36,
      FEED: 18,
    },
  });

  if (config.success) {
    console.log('Platform config updated successfully');
  }
}

// Example with error handling
async function robustExample() {
  const client = new VestaAPIClient({
    baseUrl: 'http://localhost:3000',
  });

  try {
    const result = await client.createBatch({
      productId: 1,
      warehouseId: 1,
      harvestDate: '2026-10-20',
      quantityKg: 500,
      storageTempC: 5.0,
    });

    if (!result.success) {
      console.error('Error:', result.error);
      console.error('Error code:', result.errorCode);
      return;
    }

    console.log('Success:', result.data);
  } catch (error) {
    console.error('Network error:', error);
  }
}

// Example with retry logic
async function fetchWithRetry<T>(
  fn: () => Promise<ApiResponse<T>>,
  maxRetries = 3
): Promise<ApiResponse<T>> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await fn();

      // Don't retry on client errors
      if (!result.success && result.errorCode?.startsWith('VALIDATION')) {
        return result;
      }

      if (result.success) {
        return result;
      }
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      // Exponential backoff
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * Math.pow(2, i))
      );
    }
  }

  throw new Error('Max retries exceeded');
}

// Example usage with retry
async function retryExample() {
  const client = new VestaAPIClient({
    baseUrl: 'http://localhost:3000',
  });

  const result = await fetchWithRetry(() =>
    client.createBatch({
      productId: 1,
      warehouseId: 1,
      harvestDate: '2026-10-20',
      quantityKg: 500,
      storageTempC: 5.0,
    })
  );

  console.log('Result:', result);
}

// Export
export { VestaAPIClient, type VestaConfig, type ApiResponse };

// Run examples if executed directly
if (require.main === module) {
  examples().catch(console.error);
}
