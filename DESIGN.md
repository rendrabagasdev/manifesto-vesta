---
version: alpha
name: vesta-freshness-cascade
description: >-
  Vesta is a freshness-cascade marketplace with two visual themes: a neutral
  deep-green operations theme for staff and public informational pages, and a
  warm orange buyer theme for CONSUMER and BUSINESS. Orange is the buyer primary
  action color, never the page background. Raleway carries headings and prices;
  Nunito Sans carries body copy and controls. The contract covers marketplace,
  rescue deals, feed, residue, cart, orders, buyer profile, auth, and impact
  surfaces.
colors:
  primary: "#FF9900"
  on-primary: "#402400"
  primary-hover: "#e68a00"
  primary-soft: "#fff1e0"
  primary-ink: "#b45309"
  ornament: "#FFD8A8"
  focus-ring: "#b45309"
  staff-primary: "oklch(0.4 0.09 160)"
  staff-primary-strong: "oklch(0.3 0.07 160)"
  staff-primary-soft: "oklch(0.94 0.03 160)"
  on-staff-primary: "oklch(0.98 0.01 160)"
  canvas: "oklch(0.985 0.004 106)"
  surface: "#FFFFFF"
  surface-muted: "oklch(0.965 0.005 106)"
  ink: "oklch(0.22 0.015 160)"
  ink-muted: "oklch(0.5 0.012 160)"
  line: "oklch(0.9 0.006 160)"
  danger: "oklch(0.52 0.18 27)"
  danger-soft: "oklch(0.96 0.03 27)"
  stage-fresh: "oklch(0.78 0.13 160)"
  stage-rescue: "oklch(0.84 0.12 85)"
  stage-feed: "oklch(0.78 0.12 55)"
  stage-residue: "oklch(0.63 0.02 70)"
  stage-disposed: "oklch(0.46 0.012 70)"
typography:
  display-xl:
    fontFamily: "Raleway, sans-serif"
    fontSize: 60px
    fontWeight: 800
    lineHeight: 64px
    letterSpacing: -0.02em
  display-lg:
    fontFamily: "Raleway, sans-serif"
    fontSize: 48px
    fontWeight: 800
    lineHeight: 52px
    letterSpacing: -0.02em
  heading-xl:
    fontFamily: "Raleway, sans-serif"
    fontSize: 30px
    fontWeight: 700
    lineHeight: 36px
    letterSpacing: -0.025em
  heading-lg:
    fontFamily: "Raleway, sans-serif"
    fontSize: 24px
    fontWeight: 700
    lineHeight: 32px
    letterSpacing: -0.025em
  heading-md:
    fontFamily: "Raleway, sans-serif"
    fontSize: 20px
    fontWeight: 700
    lineHeight: 28px
    letterSpacing: -0.02em
  heading-sm:
    fontFamily: "Raleway, sans-serif"
    fontSize: 18px
    fontWeight: 700
    lineHeight: 28px
    letterSpacing: -0.015em
  metric-lg:
    fontFamily: "Raleway, sans-serif"
    fontSize: 30px
    fontWeight: 800
    lineHeight: 36px
    letterSpacing: -0.025em
  metric-md:
    fontFamily: "Raleway, sans-serif"
    fontSize: 18px
    fontWeight: 700
    lineHeight: 28px
    letterSpacing: -0.015em
  body-lg:
    fontFamily: "Nunito Sans, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
    letterSpacing: 0px
  body-md:
    fontFamily: "Nunito Sans, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0px
  body-sm:
    fontFamily: "Nunito Sans, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
    letterSpacing: 0px
  caption:
    fontFamily: "Nunito Sans, sans-serif"
    fontSize: 11px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0px
  micro:
    fontFamily: "Nunito Sans, sans-serif"
    fontSize: 10px
    fontWeight: 600
    lineHeight: 14px
    letterSpacing: 0.01em
  button-md:
    fontFamily: "Nunito Sans, sans-serif"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 20px
    letterSpacing: 0px
  button-sm:
    fontFamily: "Nunito Sans, sans-serif"
    fontSize: 12px
    fontWeight: 600
    lineHeight: 16px
    letterSpacing: 0px
  label:
    fontFamily: "Nunito Sans, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
    letterSpacing: 0px
rounded:
  none: 0px
  sm: 6px
  md: 8px
  lg: 10px
  xl: 14px
  2xl: 18px
  3xl: 22px
  full: 9999px
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  xxl: 32px
  section: 48px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    padding: 0 16px
    height: 40px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    padding: 0 16px
    height: 40px
  button-compact:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-sm}"
    rounded: "{rounded.md}"
    padding: 0 12px
    height: 36px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    padding: 0 16px
    height: 40px
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.ink-muted}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    padding: 0 12px
    height: 36px
  text-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 0 12px
    height: 40px
  text-input-search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.full}"
    padding: 0 80px 0 40px
    height: 44px
  quantity-stepper:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: 36px
  product-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: 16px
  deal-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: 16px
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: 16px
  hero-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: 20px
  top-header:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    height: 56px
  bottom-nav:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.micro}"
    height: 64px
  bottom-nav-active:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-ink}"
    typography: "{typography.micro}"
    rounded: "{rounded.full}"
    size: 32px
  badge-primary:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  badge-neutral:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  badge-stage-fresh:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  empty-state:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    padding: 40px 24px
  alert-danger:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 12px 16px
---

# Vesta Design Contract

## Overview

Vesta is a marketplace for fresh produce that moves stock through a five-stage cascade: **Segar → Diskon → Pakan → Residu → Dibuang**. The interface has to make freshness, price, and impact understandable at a glance, on a phone, for a buyer who is not a logistics expert.

The product has two visual themes that share one token vocabulary:

| Surface | Theme | Primary role |
| --- | --- | --- |
| Auth (`/login`, `/register`) | Orange splash | Brand moment, not a shopping surface |
| Shop (`/marketplace`, `/rescue-deals`, `/feed`, `/residue`, `/cart`, `/orders`, `/impact-certificate`, `/marketplace/bulk`) | `.theme-buyer` | Orange action color on a neutral canvas |
| Buyer account (`/dashboard`, `/dashboard/consumer`, `/dashboard/business`, `/dashboard/profile` via `AppShell`) | `.theme-buyer` | Orange action color on a neutral canvas |
| Staff dashboard (`/dashboard/**` except buyer account pages) | Default | Deep green operations theme |
| Public (`/impact`, `/products/[id]/breakdown`) | Default | Deep green informational theme |

The buyer theme is applied at the shell level, not per component. A component should never know which theme is active; it should use semantic tokens such as `bg-brand-strong`, `text-on-brand`, `bg-brand-soft`, and `text-brand-ink`.

### Mandatory customer mobile navigation

Every buyer-facing view below `md` must render the shared `BottomNav` from `src/components/shop/bottom-nav.tsx`. This includes the shop shell and the buyer account surfaces rendered by `AppShell` (`/dashboard`, `/dashboard/consumer`, `/dashboard/business`, `/dashboard/profile`). Staff dashboard pages do not render it.

The bottom bar is the only bottom navigation in the product. Do not create a page-level bar, a second copy, or a variant with a different item set. If a new buyer destination belongs in the bar, change the shared file and update this contract.

### Buyer information boundaries

Buyer surfaces expose only what a shopper needs to decide and buy. Tier mechanics, weekly quotas, and deadlines are internal rules, not shopping content.

- Do not show tier names, tier progress, points, spend thresholds, tier comparison tables, or early-access hours anywhere in the buyer area (`app/(shop)` and buyer account pages).
- Do not show the weekly purchase quota, its usage meter, remaining count, or reset date on buyer surfaces. The limit still applies in the backend.
- Do not show live countdowns or reset timers for deals, quotas, or early access. Replace urgency with static availability copy such as "Selama stok tersedia".
- Do not show freshness scores, freshness meters, stage chips, or "presentasi segar" on buyer surfaces. The score still drives pricing and the cascade in the backend; buyers only see stage-level offer pages (Diskon, Pakan, Residu).
- Tier, quota, and early-access rules still run in the backend. When a deal is locked or the quota is exhausted, use neutral copy ("Penawaran belum terbuka", "Batas pembelian minggu ini sudah tercapai") without naming the tier or exposing counters.
- Admin and staff surfaces may continue to show full tier and quota configuration.

### Design principles

1. **Neutral canvas, orange action.** Page backgrounds stay `surface-muted` or `canvas`. Orange is reserved for actions, active states, and one hero moment per screen.
2. **Corporate and calm.** Flat white surfaces, 1px borders, and restrained corners keep the marketplace tidy. Buyer pages avoid decorative illustrations, icon-heavy cards, and freshness presentation.
3. **Flat by default.** Cards rest on a 1px `line` border. Shadows appear on overlays, not on every surface.
4. **One primary action per section.** A screen should have one obvious next step; secondary actions stay outlined or text-only.
5. **Plain Indonesian.** Copy is short, everyday language. Avoid "freshness cascade", "rescue", and other internal terms in buyer-facing UI; use "segar", "diskon", "pakan", "residu", "dibuang".
6. **Icons are functional.** In the buyer area, icons are limited to navigation, search, and quantity glyphs. Actions use text labels ("Tambah", "Simpan", "Hapus", "Detail", "Keluar") instead of icons.

### Source of truth

- Tokens: `app/globals.css` (`:root` for staff, `.theme-buyer` for buyer).
- Fonts: `app/layout.tsx` (Raleway `--font-raleway`, Nunito Sans `--font-nunito`).
- This document wins when implementation and contract disagree. Drift is recorded in [Known Gaps](#known-gaps).

## Colors

### Neutral roles

| Token | Value | Use | Avoid |
| --- | --- | --- | --- |
| `canvas` | `oklch(0.985 0.004 106)` | Public page background | Shop cards |
| `surface` | `#FFFFFF` | Cards, headers, sheets, inputs | Full-page shop background |
| `surface-muted` | `oklch(0.965 0.005 106)` | Shop and dashboard page background, neutral badges, skeleton blocks | Text |
| `ink` | `oklch(0.22 0.015 160)` | Headings, prices, primary text | Large decorative fills |
| `ink-muted` | `oklch(0.5 0.012 160)` | Meta, captions, secondary copy, inactive nav | Primary CTA text |
| `line` | `oklch(0.9 0.006 160)` | Card borders, dividers, input borders | Text |

### Buyer action roles

| Token | Value | Use | Avoid |
| --- | --- | --- | --- |
| `primary` | `#FF9900` | Primary button fill, auth splash fill, active filter, search submit, bottom-nav badge | Page background, body text, borders on white |
| `on-primary` | `#402400` | Text and icons on `primary` | Cream or white text on orange |
| `primary-hover` | `#e68a00` | Hover and pressed state of primary fills | Resting fill |
| `primary-soft` | `#fff1e0` | Active nav pill, avatar background, icon tile, subtle CTA band, image fallback | Large section background |
| `primary-ink` | `#b45309` | Text and icons on `primary-soft`, text links, focus outline on light surfaces | Large fill |
| `ornament` | `#FFD8A8` | Decorative circles and illustration accents | Text, borders, state colors |
| `focus-ring` | `#b45309` | Keyboard focus outline on light surfaces | Decorative use |

### Staff roles

| Token | Value | Use |
| --- | --- | --- |
| `staff-primary` | `oklch(0.4 0.09 160)` | Staff hover, accent text on soft green |
| `staff-primary-strong` | `oklch(0.3 0.07 160)` | Staff primary fill, logo tile |
| `staff-primary-soft` | `oklch(0.94 0.03 160)` | Staff active nav, soft emphasis |
| `on-staff-primary` | `oklch(0.98 0.01 160)` | Text on staff primary fill |

### Semantic state roles

| Token | Value | Use |
| --- | --- | --- |
| `danger` | `oklch(0.52 0.18 27)` | Errors, destructive actions, invalid fields |
| `danger-soft` | `oklch(0.96 0.03 27)` | Error banners and destructive hover backgrounds |
| `stage-fresh` | `oklch(0.78 0.13 160)` | Freshness dot/meter for Segar |
| `stage-rescue` | `oklch(0.84 0.12 85)` | Freshness dot/meter for Diskon |
| `stage-feed` | `oklch(0.78 0.12 55)` | Freshness dot/meter for Pakan |
| `stage-residue` | `oklch(0.63 0.02 70)` | Freshness dot/meter for Residu |
| `stage-disposed` | `oklch(0.46 0.012 70)` | Freshness dot/meter for Dibuang |

Stage colors are theme-independent. They are used for dots, meter fills, and low-opacity tint backgrounds. Text on a stage tint is always `ink` or `ink-muted`; never the stage color itself.

### Theme mapping to code

| Contract token | Buyer implementation | Staff implementation | Tailwind |
| --- | --- | --- | --- |
| `primary` | `--brand-strong` `#FF9900` | `--brand-strong` deep green | `bg-brand-strong` |
| `on-primary` | `--on-brand` (target `#402400`) | `--on-brand` cream | `text-on-brand` |
| `primary-hover` | `--brand` `#e68a00` | `--brand` green | `hover:bg-brand` |
| `primary-soft` | `--brand-soft` `#fff1e0` | `--brand-soft` green-soft | `bg-brand-soft` |
| `primary-ink` | `--brand-ink` `#b45309` | `--brand-ink` deep green | `text-brand-ink` |
| `focus-ring` | `--ring` (target `#b45309`) | `--ring` green | `outline-brand-ink` |
| `canvas` | `--canvas` | `--canvas` | `bg-canvas` |
| `surface` | `--surface` | `--surface` | `bg-surface` |
| `surface-muted` | `--surface-muted` | `--surface-muted` | `bg-surface-muted` |
| `ink` | `--ink` | `--ink` | `text-ink` |
| `ink-muted` | `--ink-muted` | `--ink-muted` | `text-ink-muted` |
| `line` | `--line` | `--line` | `border-line` |
| `danger` | `--danger` | `--danger` | `text-danger` |
| `danger-soft` | `--danger-soft` | `--danger-soft` | `bg-danger-soft` |
| `stage-*` | `--stage-*` | `--stage-*` | `bg-stage-*` |

`bg-brand-strong` is the primary fill in **both** themes. This is intentional: in the buyer theme it resolves to orange, in the staff theme to deep green, and `hover:bg-brand` always provides a lighter hover state.

### Contrast contract

Measured against the buyer theme:

| Pair | Ratio | Verdict |
| --- | --- | --- |
| `on-primary` `#402400` on `primary` `#FF9900` | ≈6.7:1 | AA normal text |
| `primary-ink` `#b45309` on `primary-soft` `#fff1e0` | ≈4.5:1 | AA normal text, do not lighten either value |
| `primary-ink` `#b45309` on `surface` | ≈5.0:1 | AA normal text and focus indicator |
| `ink` on `surface` | >12:1 | AAA |
| `ink-muted` on `surface` | ≈5:1 | AA normal text |
| `primary` `#FF9900` on `surface` | ≈2.1:1 | Fill only, never text |
| Cream `#fff8f0` on `primary` | ≈2.0:1 | Prohibited, current debt |
| `focus-ring` on `surface` | ≈5.0:1 | Passes 3:1 UI requirement |

Rules:

- Orange as text on white is forbidden. Use `primary-ink`.
- Cream or white text on orange is forbidden. Use `on-primary`.
- `primary-soft` is a background token. Text on it must be `primary-ink` or `ink`.
- Focus outlines on light surfaces use `primary-ink` / `focus-ring`, not `primary`.
- Do not reduce `primary-ink` or `on-primary` opacity for text.

## Typography

Raleway is the display face: headings, prices, metrics, and the auth hero. Nunito Sans is the text face: body copy, labels, navigation, buttons, and tables. Never set long paragraphs in Raleway.

| Token | Font | Size / line | Weight | Use |
| --- | --- | --- | --- | --- |
| `display-xl` | Raleway | 60 / 64 | 800 | Auth hero at ≥1280px |
| `display-lg` | Raleway | 48 / 52 | 800 | Auth hero at ≥640px |
| `heading-xl` | Raleway | 30 / 36 | 700 | Page title on desktop |
| `heading-lg` | Raleway | 24 / 32 | 700 | Page title on mobile, marketplace desktop title |
| `heading-md` | Raleway | 20 / 28 | 700 | Marketplace banner headline, section heading |
| `heading-sm` | Raleway | 18 / 28 | 700 | Section heading, card group heading |
| `metric-lg` | Raleway | 30 / 36 | 800 | Quota, impact counter, large stat |
| `metric-md` | Raleway | 18 / 28 | 700 | Price in deal card, order total |
| `body-lg` | Nunito Sans | 16 / 24 | 400 | Page intro, long description |
| `body-md` | Nunito Sans | 14 / 20 | 400 | Default body, form value, table cell |
| `body-sm` | Nunito Sans | 12 / 16 | 400 | Meta, helper text, footer |
| `caption` | Nunito Sans | 11 / 16 | 500 | Badge label, image chip, secondary meta |
| `micro` | Nunito Sans | 10 / 14 | 600 | Bottom-nav label, count badge only |
| `button-md` | Nunito Sans | 14 / 20 | 600 | Default button |
| `button-sm` | Nunito Sans | 12 / 16 | 600 | Compact button, image overlay CTA |
| `label` | Nunito Sans | 14 / 20 | 500 | Form label |

### Typography rules

- **One `h1` per page.** Use `heading-lg` on mobile and `heading-xl` from `sm`. The marketplace `h1` must move from 20/24 to this pair.
- **Section headings use `heading-sm`** (18/28). Do not use 14px semibold as a section heading, and do not use `metric-lg` for a label.
- **Product and card titles use `body-md` semibold** (14/20). Product names must never be smaller than 12px; 13px is not a token.
- **Prices use Raleway with `tabular-nums`.** Pair the amount with a `body-sm` muted unit (`/kg`, `tersedia`). Currency is `Rp`, no space before the number.
- **`micro` is badge-only.** 10px is allowed for a count badge, category chip, or bottom-nav label. It is forbidden for body copy, product names, prices, and CTA labels.
- **`caption` replaces the ad-hoc 11px utilities.** Use it for image chips, secondary meta, and badge labels.
- **Uppercase only for eyebrow labels**, with `tracking-wide` and a short phrase. Never uppercase buttons, headings, or prices.
- **Weights:** 400 body, 500 labels, 600 buttons and card titles, 700 headings, 800 hero and metrics. Do not use 900.
- **Line length:** page intros use `max-w-2xl` (672px); long prose uses `max-w-prose`. Do not let body text span a full desktop card grid.
- **Letter spacing:** tight (−0.02em to −0.025em) only on Raleway headings and metrics; `0` on Nunito body and controls; `wide` on uppercase eyebrows.

## Layout

### Shells

| Shell | Page background | Header | Content width | Navigation |
| --- | --- | --- | --- | --- |
| Shop (`ShopShell`) | `surface-muted` | 56px sticky, `surface`, border-bottom | `max-w-6xl` (1152px), `px-4 py-6`, `sm:px-6`, `lg:py-8` | Desktop links in header; mandatory bottom nav below `md` |
| Buyer account (`AppShell`, buyer roles) | `surface-muted` | 48px workspace header | Sidebar 224px + content `max-w-6xl`, `px-4 py-6`, `sm:px-6`, `lg:px-8 lg:py-8` | Desktop sidebar; workspace nav in header; mandatory bottom nav below `md` |
| Staff dashboard (`AppShell`, staff roles) | `surface-muted` | 48px workspace header | Same as buyer account | Desktop sidebar; horizontal nav on mobile; no bottom nav |
| Public (`app/(public)/layout.tsx`) | `canvas` | 56px `PublicHeader` | `max-w-6xl`, `px-4 py-8`, `sm:px-6`, `lg:py-10` | Header links + footer |
| Auth (`/login`, `/register`) | Orange splash + `surface` sheet | None | Form `max-w-md`, `lg:max-w-sm` | Text link to the opposite flow |

The shop shell must be `flex min-h-dvh flex-col`, with `main` as `flex-1` and the footer after it. This keeps the footer at the bottom on short pages such as `/feed`.

### Customer mobile navigation (mandatory)

The bar is fixed to the bottom, 64px tall plus `env(safe-area-inset-bottom)`, hidden from `md`, and rendered only by `BottomNav` in `src/components/shop/bottom-nav.tsx`.

| Item | Route | Active when |
| --- | --- | --- |
| Beranda | `/marketplace` | `/marketplace` or any `/marketplace/*` |
| Diskon | `/rescue-deals` | `/rescue-deals` or child routes |
| Keranjang | `/cart` | `/cart` or child routes |
| Pesanan | `/orders` | `/orders` or child routes |
| Profil | `/dashboard/profile` | `/dashboard` or any `/dashboard/*` for buyer roles |

- Shells must reserve at least 96px bottom padding on mobile so content is not hidden behind the bar.
- The bar uses `bg-surface/95`, `backdrop-blur`, `border-t border-line`, and `z-50`.
- The active item uses `text-brand-ink` for both icon and label; there is no soft background circle. Inactive items are `text-ink-muted`.
- The cart item shows a count badge when the cart is ready and non-empty.
- On buyer mobile, the workspace nav in `AppShell` omits Profil and Belanja; the bottom bar owns those destinations. It keeps Ringkasan and the role module (Akun saya / Modul bisnis).
- Public pages (`/impact`, `/products/[id]/breakdown`) do not render the bar until they are moved into the buyer shell.
- Do not hide the bar on scroll, on short pages, or inside a modal. It is persistent.

### Spacing rhythm

Use the spacing scale; do not invent intermediate values.

| Relationship | Space |
| --- | --- |
| Page header to first section | 24px (`mt-6`) |
| Between major sections | 32–48px (`mt-8`, `mt-12`) |
| Between cards in a grid | 12px mobile, 16px from `sm` |
| Between form fields | 16px (`space-y-4`) |
| Label to input | 6px (`mt-1.5`) |
| Input to hint/error | 4px (`mt-1`) |
| Card inner padding | 12px compact, 16px panel, 20px hero |
| Section inner header padding | 16px horizontal, 12px vertical |
| Bottom-nav safe area | 64px + `env(safe-area-inset-bottom)` |

### Grids and widths

- **Listing grids:** product, deal, feed, and residue cards use 2 columns on mobile and 3 columns from `lg`; gap 12px → 16px. Cards must stretch to equal height.
- **Deal preview:** the home deal section uses the same grid as products, never a horizontal rail.
- **Model overview:** marketplace banner and quick links stack full width; no quota or tier card beside them.
- **Cart:** content + 360px summary aside from `lg`.
- **Profile:** content + 320px aside from `lg`.
- **Forms:** 448px (`max-w-md`) for auth and single-column forms; two columns from `sm` inside panels.
- **Reading:** 672px (`max-w-2xl`) for page intros and empty-state descriptions.

### Touch and safe areas

- Interactive targets are at least 44px tall on touch surfaces. Icon-only buttons are at least 36px, preferably 40px.
- Bottom-nav items are 64px tall and span the viewport with 5 equal columns.
- Fixed bottom navigation and footer padding must include `env(safe-area-inset-bottom)`.
- Do not place a primary action within 16px of the bottom edge on mobile; leave room for the bottom nav.

## Elevation & Depth

Depth is communicated by borders and background contrast, not by stacked shadows.

| Level | Treatment | Use |
| --- | --- | --- |
| Flat | `1px` `line` border, no shadow | Cards, panels, list rows, inputs, headers |
| Hover lift | `shadow-sm` plus `transition-shadow` | Product card only |
| Overlay | `shadow-xl` | Auth sheet on mobile |
| Illustration | `drop-shadow-lg` / `drop-shadow-xl` | Farmer illustration, never UI chrome |
| Sticky | `z-40` + border-bottom | Shop and dashboard headers |
| Fixed nav | `z-50` + `bg-surface/95` + `backdrop-blur` | Bottom navigation |

Rules:

- No colored glows around orange elements.
- No more than one shadow on an element.
- Do not use shadows to signal focus; use a visible outline.
- Do not add elevation to table rows, form fields, or badges.
- Modal and dialog layers, when added, sit above `z-50` and use a scrim of `ink/40`.

## Shapes

| Token | Value | Use |
| --- | --- | --- |
| `none` | 0px | Tables, full-bleed strips |
| `sm` | 6px | Small chips, count badges that are not pills |
| `md` | 8px | Buttons, inputs, selects, compact controls, logo tile inner |
| `lg` | 10px | Logo tile, icon button, segmented control |
| `xl` | 14px | Panels, order rows, empty states, stat tiles |
| `2xl` | 18px | Large feature surfaces that need extra softness |
| `3xl` | 22px | Auth sheet top corners |
| `full` | 9999px | Pills, avatars, icon circles, search field, stage badges |

Rules:

- Do not write arbitrary radii such as `rounded-t-[28px]`; use a token.
- Buttons and inputs share `md`. Do not mix 8px and 10px for the same control family.
- Equivalent cards must share a radius. All marketplace listing cards (product, deal, feed, residue), banners, panels, and order rows use `xl`.
- Avatars and icon tiles are circles. The logo tile is a rounded square (`md` or `lg`), not a circle.
- Borders are `1px solid line`. Dashed borders are reserved for empty states.

## Components

Component names below match the frontmatter keys. Each entry is a contract, not a suggestion.

### Buttons

- **`button-primary`** — `inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-brand-strong px-4 text-sm font-semibold text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink disabled:cursor-not-allowed disabled:opacity-60`.
  - One primary button per section. Use for "Masukkan keranjang", "Lanjut ke pembayaran", "Simpan profil", "Cari".
  - Hover uses `primary-hover`. Disabled keeps the label and width; only opacity changes.
  - Loading keeps the button width and swaps the label for a spinner plus "Memproses…".
  - Never use cream or white text on orange. Never uppercase the label.
- **`button-compact`** — 36px height, 12px label, 12px horizontal padding. Use inside image overlays, search submit, and dense card actions.
- **`button-secondary`** — `h-10 rounded-lg border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-muted`. Use for "Lihat semua", "Kembali", "Ubah".
- **`button-ghost`** — 36px height, no border, `text-ink-muted hover:bg-surface-muted hover:text-ink`. Use for icon actions, "Batal", and tertiary links.
- **Icon button** — `size-9` or `size-10`, `rounded-lg`, ghost styling. Always provide `aria-label` and a tooltip title when the icon is not universally understood.
- **Link button** — use `text-brand-ink font-semibold` on light surfaces. Do not style a link as a filled primary button unless it triggers the same action.

### Inputs and forms

- **`text-input`** — `h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted/70 focus:border-brand-ink focus:ring-2 focus:ring-brand-ink/20`.
  - Current code focuses with `border-brand`/`ring-brand`; the contract requires `brand-ink` so the focus indicator reaches 3:1 on white.
  - Labels use `label` typography and sit above the field. Required fields carry a visible marker and `required`.
  - Errors set `aria-invalid`, `aria-describedby`, `border-danger`, and a `text-xs text-danger` message. Errors are never color-only.
  - Hints use `text-xs text-ink-muted` and are announced through `aria-describedby`.
- **`text-input-search`** — a bordered `rounded-lg` bar with a search icon at the left and an orange submit button at the right. Use only for the marketplace search.
- **Select and textarea** — match `text-input` height and radius. Textarea may grow; minimum height is 96px.
- **`quantity-stepper`** — 36px tall, bordered, minus/plus 36px square buttons, centered numeric value with `tabular-nums`. Steps are 0.5 kg; the maximum is the batch's remaining stock. Both buttons need `aria-label` with the product name.
- **Checkout fields** — group delivery method and address in a panel with 16px padding; the selected option uses `bg-brand-soft text-brand-ink` plus a visible radio/check, not color alone.

### Cards and panels

- **`product-card`** — `rounded-xl border border-line bg-surface`, media 112px mobile / 160px `sm`, body padding 16px.
  - Media uses `bg-surface-muted`. When there is no photo, show the text "Foto belum tersedia"; never a category icon.
  - Buyer cards do not show freshness scores, meters, or stage chips. Category appears as an uppercase `caption` label in the body.
  - Title `body-md` semibold, truncated to one line. Warehouse `caption` muted. Price in Raleway 18px bold `tabular-nums`, unit `caption` muted. Stock `caption` muted.
  - The add-to-cart control is text-first: quantity stepper with `−`/`+`, an orange "Tambah" text action, and a "Simpan"/"Tersimpan" text toggle. No cart or heart icons.
  - Hover changes the border to `brand/50`; no lift and no image scale.
- **`deal-card`** — same anatomy and radius as `product-card`: media 112px / 160px, one orange percent badge at the top-right of the media, uppercase discount label in the body, price bold with the original struck through in `caption`, stock `caption`, then the direct-buy form. Never render a freshness meter.
- **`listing-card`** — feed and residue listings reuse the `product-card` shell with plain `bg-surface-muted` media (no stage icon), an uppercase tag in the body, warehouse as plain text, and the direct-buy form at the bottom. Description is hidden below `sm`.
- **`panel`** — `rounded-xl`, 16px padding, `border-line`. Section headers inside a panel use `body-md` semibold without icons; page-level section headers use `heading-sm`.
- **`hero-card`** — the buyer marketplace banner is a white `rounded-xl border border-line bg-surface` panel, full width, padding 20–24px. Eyebrow `caption` uppercase `brand-ink`, headline `heading-md` → `heading-xl` from `sm`, one-line body `body-sm` muted, and a single orange primary CTA.
  - Keep the banner text-first: no farmer illustration, decorative circles, or orange fill. Auth pages keep their own orange splash.
- **Quick links** — one `rounded-xl border border-line bg-surface` row with three equal text links ("Diskon", "Pakan", "Residu"). No icon circles or colored tiles.
- **Stat tile** — `rounded-xl border border-line bg-surface`; label `caption` muted, value `heading-md` `tabular-nums`. No icon unless the metric is otherwise ambiguous.

### Navigation

- **`top-header`** — 56px tall, `bg-surface`, 1px bottom border, sticky at `z-40`. Left: "Vesta." wordmark with an orange dot. Center/left: desktop marketplace links. Right: text "Keranjang" with count, Dashboard, avatar + name, and Keluar. No icon buttons on buyer desktop.
- **Desktop marketplace nav** — underline tabs, `text-sm`. Active: `border-brand-strong font-semibold text-ink`; inactive: `border-transparent font-medium text-ink-muted hover:text-ink`. Always set `aria-current="page"`.
- **`bottom-nav`** — mandatory on every buyer route below `md`, fixed, `bg-surface/95`, `backdrop-blur`, top border, 64px + safe area, 5 equal columns, hidden from `md`. Active icon and label use `text-brand-ink` with no background circle; inactive is `text-ink-muted`. Labels use `micro`.
  - Single source: `src/components/shop/bottom-nav.tsx`. Pages and shells render it; they never copy its markup.
  - Accessible name: "Navigasi belanja". The workspace nav is "Navigasi ruang kerja" and the marketplace nav is "Navigasi marketplace"; never give two landmarks the same name.
  - Cart badge: top-right, `min-w-4`, `rounded-full`, `bg-brand-strong text-on-brand`, 10px bold, `aria-label` includes the item count.
  - The active item must be one of the five destinations. Destinations outside the nav (feed, residue) must show a clearly active parent or be added to the nav.
  - Always render the bar for buyer roles in `AppShell`, including profile, consumer dashboard, and business dashboard pages. Staff roles must not render it.
- **Staff sidebar** — active item is `bg-surface text-ink` on the muted shell background; inactive is `text-ink-muted hover:bg-surface/70`. Do not reuse the buyer orange active pill in the staff shell.

### Badges and status

- **`badge-primary`** — `rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand-ink`. Use for pre-order and selected filters.
- **`badge-neutral`** — `rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-ink-muted`. Use for order status and generic meta.
- **`badge-stage-fresh`** — `bg-brand-soft text-brand-ink`; the current `text-brand-strong` variant fails contrast and must not be copied.
- **Other stage badges** — `bg-stage-{stage}/20 text-ink` with a 6px `bg-stage-{stage}` dot. Disposed uses `text-ink-muted`. Always show the Indonesian label ("Segar", "Diskon", "Pakan", "Residu", "Dibuang"); color is never the only signal.
- **Order status** — use one centralized label map. "Menunggu bayar" (list) and "Menunggu pembayaran" (detail) must be reconciled to one label.

### Empty states and feedback

- **`empty-state`** — `rounded-xl border border-dashed border-line bg-surface px-6 py-10 text-center`. Title `text-sm font-semibold text-ink`; description `text-sm leading-relaxed text-ink-muted` with `max-w-md`; action `mt-4` primary or secondary button.
  - Every empty surface uses the shared `EmptyState` component. Cart, rescue deals, orders, and marketplace deal previews must not hand-roll different paddings or dashed styles.
- **`alert-danger`** — `rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger`, `role="alert"`. Use for form and checkout errors.
- **Success / info banner** — `rounded-lg border border-brand/20 bg-brand-soft px-4 py-3 text-sm text-brand-ink`, `role="status"`. The current `text-brand-strong` success banner is a known contrast gap.
- **Inline feedback** — add-to-cart feedback uses `aria-live="polite"`, 12px text, `text-brand-ink` for success and `text-danger` for failure. Do not rely on a toast alone.

### Pricing and data display

- Prices always use `font-heading font-bold tabular-nums tracking-tight`.
- Discounts show the percentage and the original price; never show a fake original price.
- Freshness scores display as an integer plus a labeled meter. The meter has `role="meter"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and an `aria-label`.
- Charts and impact counters use the stage palette in cascade order. Labels are Indonesian; numbers use `formatNumber`/`formatInteger`.

## Do's and Don'ts

### Do

- Use semantic tokens for every color, radius, and text size.
- Apply `.theme-buyer` once at the shell, then write theme-agnostic components.
- Use `bg-brand-strong` + `text-on-brand` for primary fills, and `bg-brand-soft` + `text-brand-ink` for active or selected states.
- Use `primary-ink` for orange-family text on light surfaces.
- Use `tabular-nums` for every price, quantity, count, and metric.
- Keep one `h1` per page and one primary CTA per section.
- Use the shared `EmptyState`, button, input, and status primitives once they exist.
- Render the shared `BottomNav` on every buyer mobile route, including buyer dashboard and profile pages.
- Keep the buyer mobile workspace nav limited to destinations the bottom bar does not own.
- Keep buyer cards focused on price, freshness, and stock; use static availability copy instead of timers.
- Give every icon-only control an `aria-label`, and every destructive action a confirmation.
- Test at 500×881 (mobile) and 1280×900 (desktop) before calling a UI change done.

### Don't

- Don't hardcode hex values, arbitrary text sizes, or arbitrary radii in components.
- Don't use orange as a page background on shopping surfaces.
- Don't use cream, white, or orange text on an orange fill.
- Don't use `text-brand-strong` on `bg-brand-soft` in the buyer theme.
- Don't use orange as body text or as a 1px border on white.
- Don't create a local button, input, badge, or empty-state variant when a shared one exists.
- Don't build a page-specific bottom bar or duplicate `BottomNav` markup.
- Don't hide the bottom bar on a buyer mobile route.
- Don't duplicate Profil or Belanja in the buyer mobile workspace nav.
- Don't add shadows to resting cards, rows, or inputs.
- Don't uppercase CTA labels, headings, or prices.
- Don't mix green tokens into `.theme-buyer` surfaces, except theme-independent stage colors.
- Don't show "Masuk" to an authenticated user, or link a logged-in buyer to the green public shell without a deliberate handoff.
- Don't change page backgrounds when applying the orange primary theme. The canvas stays neutral.
- Don't expose tier names, tier progress, points, spend thresholds, early-access hours, or weekly quota counters on buyer surfaces.
- Don't add live countdowns, quota reset timers, or deal expiry timers to buyer surfaces; use static availability copy instead.

## Accessibility

- **Contrast:** normal text ≥4.5:1, large text ≥3:1, UI boundaries and focus indicators ≥3:1. The pairs in [Contrast contract](#contrast-contract) are the approved combinations.
- **Focus visible:** every interactive element uses a 2px outline with 2px offset. On light surfaces use `outline-brand-ink`; on an orange fill use `outline-on-brand`. Do not remove the default outline without a replacement.
- **Color is not the only signal:** stage badges include a text label and a dot; errors include text and an icon; active navigation includes `aria-current` and a shape change; required fields include a marker.
- **Forms:** every input has a visible `<label>`. Do not use placeholder-only labels. Errors use `aria-invalid` and `aria-describedby`. Required fields set `required` and explain the format in a hint.
- **Keyboard:** all controls are reachable in DOM order. Bottom navigation is a list of links. Dialogs, when added, trap focus, close on Escape, and restore focus to the trigger.
- **Live feedback:** cart, form, and checkout feedback uses `aria-live="polite"`; blocking errors use `role="alert"`.
- **Motion:** transitions are ≤200ms. Under `prefers-reduced-motion: reduce`, disable image scale, card lift, and smooth scrolling.
- **Images:** product images use descriptive `alt` when they carry information; use `alt=""` when an adjacent product name already identifies the item. Decorative circles are `aria-hidden`.
- **Semantics:** one `h1` per page, headings in order, a single `<main>` per shell, `<footer>`, and a unique `aria-label` on every `<nav>`. The root document already sets `lang="id"`.
- **Touch:** minimum 44×44px for primary touch actions; 36×36px for secondary icon buttons; 64px bottom-nav rows.
- **Skip link:** add a visible-on-focus "Lewati ke konten" link when the shop shell is refactored; it is currently missing.

## Responsive Behavior

| Breakpoint | Width | Changes |
| --- | --- | --- |
| Base | <640px | Two-column listing grids, stacked sections, mandatory bottom nav on buyer routes, `px-4`, `h1` 24/32, card media 112px |
| `sm` | ≥640px | Listing gap 16px, card media 160px, form panels 2 columns, login hero 48/52 |
| `md` | ≥768px | Bottom nav hidden, desktop marketplace nav visible, cart and avatar appear in header |
| `lg` | ≥1024px | Listing grids 3 columns, cart aside 360px, profile aside 320px, auth split layout, dashboard sidebar 224px |
| `xl` | ≥1280px | Auth hero 60/64, illustration 500px tall |

Rules:

- Page content never scrolls horizontally. Filter chips stay in a single horizontal row at every breakpoint (the rail itself may scroll, with no visible scrollbar); card lists always use grids.
- Text wraps; do not truncate product names to the point of ambiguity. One-line truncation is allowed in cards when the full name is available on the detail page.
- Avoid fixed heights except for media, headers, navigation, and control heights. Cards grow with content and stretch equally in a row.
- On mobile, the footer sits above the bottom nav and includes safe-area padding.
- Desktop content is centered at `max-w-6xl`; the dashboard outer shell may reach `max-w-[1560px]` but the reading column stays `max-w-6xl`.
- The auth page switches from a stacked illustration + sheet to a 1.05fr / 0.95fr split at `lg`.

## Known Gaps

These are confirmed drifts between the contract and the current implementation. Do not copy them into new work.

### Critical

1. **Cream text on orange fails contrast.** `.theme-buyer` sets `--on-brand: #fff8f0`; on `#FF9900` this is ≈2.03:1. It affects all text on the login/register orange splash (headline, body, CTA), buyer primary buttons, cart badge, and bottom-nav badge. The contract target is `on-primary: #402400` (≈6.7:1). Exact shade is an open decision.
2. **Orange text on soft orange fails contrast.** `text-brand-strong` on `bg-brand-soft` is `#FF9900` on `#fff1e0` (≈2.36:1). Affects `profile-form.tsx:101`, `app/dashboard/profile/page.tsx:46` and `:76`, and the FRESH `StatusPill`. Use `text-brand-ink` (≈4.5:1).
3. **Focus ring fails the 3:1 UI requirement.** `.theme-buyer --ring: #FF9900` is ≈2.14:1 on white. Use `brand-ink` / `focus-ring` for focus outlines, and update the global ring token when the theme is revised.

### Major

4. **Public and buyer shells are split.** `/products/[id]/breakdown` and `/impact` render in the green public layout with no `.theme-buyer`, and `PublicHeader` always shows "Masuk" even for an authenticated buyer. Decide whether product breakdown belongs to the shop shell and make the public header session-aware.
5. **Shared primitives are missing.** The buyer area repeats 4 primary CTA class strings, 3 input class strings, 4 empty-state variants, 4 active-nav patterns, and 7 status-label maps. Promote `Button`, `Input`, `PageHeader`, `EmptyState`, `StatusPill`, and a single order-status map to `src/components/ui/`.
6. **Typography drift.** The marketplace `h1` is 20/24 while other pages use 24/32; the profile `h1` has no `sm:text-3xl`; 29 arbitrary micro-size utilities (`text-[10px]`, `text-[11px]`, `text-[13px]`) bypass the scale.
7. **Control height drift.** Primary CTAs appear at 36px, 40px, and 44px. Standardize `sm` 36, `md` 40, `lg` 44, and use one size per context.

### Minor

8. **Navigation coverage.** The bottom bar now covers shop and buyer account routes, including profile and the consumer/business dashboards. `/feed` and `/residue` still have no dedicated item, so neither shows an active item; decide whether to map them to Beranda or add an item. The "Profil" tab still switches from the shop shell to the dashboard shell, although the bar now persists.
9. **Footer anchoring.** `ShopShell` is not a flex column, so the footer floats mid-viewport on short pages (`/feed` at 881px). Make the shell `flex min-h-dvh flex-col` and `main` `flex-1`.
10. **Copy inconsistency.** The public footer says "Freshness Cascade Platform"; the shop footer says "Platform Kaskade Kesegaran". Standardize Indonesian copy.
11. **Ornament token is not exposed.** `--ornamen-orange` exists but is not in `@theme`, so components cannot use `bg-ornament` / `text-ornament`. Add a Tailwind color token if decorative orange is needed.
12. **Auth sheet radius is arbitrary.** `rounded-t-[28px]` bypasses the radius scale. Use `rounded-t-3xl` (22px) or add a `sheet` radius token.

### Informational

13. **Inline meter widths are acceptable.** The only inline styles in the buyer area are dynamic `width` values for freshness meters. They express data, not design values, and must stay inline.
14. **No dark mode.** Tokens are light-only. Do not introduce dark surfaces without a full token pass and a contrast audit.
15. **Product image alt text.** Card images use `alt=""` correctly because the adjacent title names the product. Detail and hero images must use descriptive alt text when they add information.

## Open Design Decisions

- [ ] Confirm the exact dark-on-orange shade (`#402400` proposed) and migrate `--on-brand` and `--primary-foreground`.
- [ ] Confirm whether product breakdown becomes a shop route (buyer shell) or stays public with a buyer-aware header.
- [ ] Confirm whether "Profil" stays in the dashboard shell or moves under the shop shell.
- [ ] Confirm whether `/feed` and `/residue` appear in the bottom nav or only in the desktop nav.
- [ ] Confirm whether dark mode is in scope; if not, document it as out of scope.

## Implementation Checklist

Before merging a UI change:

1. Every color, radius, and font size comes from a token or a component contract above.
2. The primary action uses `bg-brand-strong` + `text-on-brand`, not cream on orange.
3. Active and selected states use `bg-brand-soft` + `text-brand-ink`.
4. Money, quantities, and counts use `tabular-nums`.
5. Empty surfaces use `EmptyState`; batch states use `StatusPill`.
6. Every buyer mobile route renders the shared `BottomNav` from `src/components/shop/bottom-nav.tsx`.
7. Focus is visible with `outline-brand-ink` on light surfaces.
8. The layout works at 500×881 and 1280×900, with no horizontal scroll and no floating footer.
9. `npm run lint` and `npx tsc --noEmit` pass.
