# Vesta Marketplace UI/UX Review Report

**Date:** Fri Oct 23 2026
**Scope:** B2C vs B2B marketplace UI consistency, navigation, and component reuse

---

## ✅ What's Working Well (Centralized Aspects)

### 1. **Shared Design Language**
- Both B2C and B2B pages use the same Tailwind CSS tokens:
  - `text-ink`, `text-ink-muted`, `bg-surface`, `border-line`
  - `bg-brand-strong`, `bg-brand-soft`, `bg-stage-rescue`
  - Consistent border radius (`rounded-xl`), shadow patterns, and spacing
- Header layout pattern is consistent: `flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between`

### 2. **Shared Components (Truly Shared)**
| Component | Used In | Purpose |
| --------- | ------- | --------- |
| `ProductCard` | `marketplace/page.tsx` (FRESH) | FRESH listings with freshness meter, add-to-cart |
| `ListingCard` | `feed/page.tsx`, `residue/page.tsx` (FEED/RESIDUE) | Downstream cascade listings |
| `FreshnessMeter` | product-card, listing-card, rescue-deals | Visual freshness score display |
| `Countdown` | rescue-deals, cart-view | Timer for deal expiration |
| `EmptyState` | All marketplace pages | Empty states with action links |
| `MarketplaceNav` | Available component | Navigation between marketplace sections |

### 3. **Unified Purchase Flow**
- Both FRESH and RESCUE use `AddToCart` component with same quantity stepping (0.5 kg)
- `CartView` provides consistent cart experience across all channels
- `placeOrderAction` and `claimRescueDealAction` share validation patterns
- Same Midtrans payment integration

### 4. **Data Layer Unification**
- Single Prisma schema with `Batch` status cascade (FRESH → RESCUE → FEED → RESIDUE)
- Shared queries: `getFreshListings`, `getRescueDeals`, `getFeedListings`, `getResidueListings`
- Unified `MarketplaceListing` and `SimpleListing` interfaces
- Single cart system (`shop/cart-context.tsx`) - *though see issues below*

---

## ⚠️ Fragmentation/Inconsistency Issues Found

### 1. **TWO Separate Cart Systems** (CRITICAL)
The codebase maintains **two incompatible cart implementations**:

**A. `src/components/shop/cart-context.tsx`** (Used by most pages)
- LocalStorage-based (`vesta-cart-v1` key)
- Simpler API: `addItem`, `updateQty`, `removeItem`, `clear`
- Items: `batchId`, `batchCode`, `productName`, `unit`, `pricePerKg`, `qtyKg`, `maxKg`, `stage`, `warehouseName`
- Used by: `AddToCart`, `CartView`, `CartProvider` (marketplace version exists but not consistently used)

**B. `src/components/marketplace/cart-provider.tsx`** (Less used)
- React Context API
- More comprehensive API: `addItem`, `setQuantity`, `removeItem`, `clearCart`, `saved`, `toggleSaved`, `isSaved`
- Supports "saved items"/bookmarking feature
- No localStorage persistence defined

**Impact:** Unclear which cart is active. `AddToCart` uses `shop/cart-context.tsx`, but `cart-provider.tsx` exists as a parallel implementation with bookmarking features that aren't used anywhere.

### 2. **Inconsistent Grid Layouts**
| Page | Grid Pattern |
| ---- | ------------ |
| `marketplace/page.tsx` (FRESH) | `grid gap-4 sm:grid-cols-2 lg:grid-cols-3` |
| `rescue-deals/page.tsx` | `grid gap-4 lg:grid-cols-3` (no sm breakpoint) |
| `feed/page.tsx` | `grid gap-4 sm:grid-cols-2 lg:grid-cols-3` |
| `residue/page.tsx` | `grid gap-4 sm:grid-cols-2 lg:grid-cols-3` |
| `bulk/page.tsx` (B2B) | `grid gap-4 lg:grid-cols-[1fr_320px]` **— unusual subgrid pattern** |

**Recommendation:** Standardize on `sm:grid-cols-2 lg:grid-cols-3` as the universal pattern. The B2B bulk page's `lg:grid-cols-[1fr_320px]` should be replaced with the standard pattern or justified explicitly.

### 3. **Fragmented Navigation Entry Points**
- **B2C:** `/marketplace` → links to `/rescue-deals`, `/feed`, `/residue`
- **B2B:** `/dashboard/business` → link to `/marketplace/bulk`
- **No unified view:** Neither consumers nor businesses have a single entry point that shows ALL marketplace sections relevant to them

**Missing:**
- Consumer dashboard doesn't exist (no `/dashboard/consumer`)
- Business dashboard doesn't show FRESH/rescue/fresh listings alongside bulk pre-orders
- No cross-navigation between B2C and B2B sections

### 4. **`ListingCard` Source Prop Limitation**
- `ListingCard` only accepts `source: "FEED" | "RESIDUE"` 
- FRESH listings use `ProductCard` instead — different component, different UI
- The `source` prop affects the `DirectBuyForm` action handler, but the distinction between FRESH/RESCUE/FEED/RESIDUE at the component level creates unnecessary divergence

**Issue:** Why does FRESH use `ProductCard` while FEED/RESIDUE use `ListingCard`? The components are nearly identical in structure; the difference should be a prop, not a different component entirely.

### 5. **B2B Bulk Page Grid Pattern**
- `bulk/page.tsx` uses `lg:grid-cols-[1fr_320px]` which is a non-standard CSS grid fragment
- This creates a layout that doesn't match the rest of the codebase
- The `[_1fr_320px]` syntax is a subgrid-like pattern that may cause unexpected behavior

### 6. **Missing B2C Dashboard**
- No consumer-facing dashboard to show:
  - Order history
  - Loyalty tier status
  - Rescue quota
  - Saved items
- Business dashboard (`/dashboard/business`) has full features but consumer side is absent

---

## 🔧 Specific Files/Components to Unify or Fix

### **High Priority**

| # | Issue | File(s) | Fix |
|---|-------|---------|-----|
| 1 | **Consolidate cart systems** | `src/components/shop/cart-context.tsx`, `src/components/marketplace/cart-provider.tsx` | Merge into single implementation. Keep `shop/cart-context.tsx` features (localStorage) and add `cart-provider.tsx` bookmarking/saved items as optional enhancement. |
| 2 | **Standardize grid layouts** | All marketplace page files | Replace all grid patterns with `grid gap-4 sm:grid-cols-2 lg:grid-cols-3`. Update `bulk/page.tsx` to use standard pattern. |
| 3 | **Unify FRESH/ListingCard components** | `src/components/marketplace/product-card.tsx`, `src/components/marketplace/listing-card.tsx` | Add `stage?: "FRESH" | "FEED" | "RESIDUE"` prop to `ListingCard`, render `ProductCard` layout for FRESH, keep current layout for FEED/RESIDUE. Or vice versa — make `ProductCard` accept `source` prop. |
| 4 | **Add consumer dashboard** | New file: `app/(shop)/dashboard/page.tsx` OR integrate into existing flow | Create minimal dashboard showing: tier status, quota, order history, saved items. Match business dashboard design language. |
| 5 | **Fix B2B bulk grid** | `app/(shop)/marketplace/bulk/page.tsx` | Change `lg:grid-cols-[1fr_320px]` to `lg:grid-cols-2` or `lg:grid-cols-3` to match codebase convention. |

### **Medium Priority**

| # | Issue | File(s) | Fix |
|---|-------|---------|-----|
| 6 | **Unify navigation** | `src/components/marketplace/marketplace-nav.tsx`, page headers | Add B2B bulk link to `MarketplaceNav` for B2B users. Add consumer nav links to business dashboard. Create conditional nav based on user role. |
| 7 | **Make `ListingCard` source-agnostic** | `src/components/marketplace/listing-card.tsx` | Accept `source?: "FRESH" \| "RESCUE" \| "FEED" \| "RESIDUE"` and render appropriate buy button/label. Remove need for `ProductCard` entirely. |
| 8 | **Consistent rescue deal access UI** | `app/(shop)/rescue-deals/page.tsx`, `app/dashboard/business/page.tsx` | Both show quota + early access. Ensure visual design and flow are consistent. Business dashboard should use same quota component as rescue-deals page. |
| 9 | **Unify empty state patterns** | All marketplace pages | `EmptyState` component is shared, but descriptions and actions vary. Standardize the pattern: title + description + primary action + secondary link. |

### **Low Priority**

| # | Issue | File(s) | Fix |
|---|-------|---------|-----|
| 10 | **Bulk order form styling** | `src/components/marketplace/bulk-order-form.tsx` | Form layout is consistent, but recurrence selector and date input could use shared form component patterns from the codebase. |
| 11 | **Price breakdown display** | Various pages | FRESH shows `pricePerKg` per unit, RESCUE shows discount %, FEED/RESIDUE show `pricePerKg` per kg. Consider standardizing the price display format while preserving the semantic difference (discount vs. base price). |

---

## Summary Recommendations

### **Immediate Actions (Sprint 1)**
1. **Merge cart systems** — choose `shop/cart-context.tsx` as the single source, add bookmarking/saved items feature from `cart-provider.tsx`
2. **Standardize grid patterns** — update all pages to `sm:grid-cols-2 lg:grid-cols-3`
3. **Fix B2B bulk grid** — replace `lg:grid-cols-[1fr_320px]` with standard pattern
4. **Unify FRESH/ProductCard with ListingCard** — add stage prop or merge components

### **Short-term Actions (Sprint 2)**
5. **Add consumer dashboard** — minimal viable dashboard matching business dashboard design language
6. **Update marketplace navigation** — add role-conditional links, ensure B2B bulk is accessible from consumer side (and vice versa appropriately)
7. **Make ListingCard source-agnostic** — accept all cascade stages

### **Long-term Actions (Sprint 3+)**
8. **Create unified purchase flow** — single checkout path that handles FRESH, RESCUE, FEED, RESIDUE based on item type, not separate cart systems
9. **Full B2B/B2C cross-navigation** — ensure users can move between consumer and business contexts seamlessly
10. **Design system documentation** — document the shared tokens, components, and patterns to prevent future fragmentation

---

**Overall Assessment:** The marketplace has a strong foundation with many shared components and a consistent design language. The primary issues are **cart system fragmentation** and **layout inconsistency**, which should be addressed first. The component reuse rate is approximately 60-70% — the goal should be 80%+ by merging `ProductCard`/`ListingCard` and consolidating the cart system.