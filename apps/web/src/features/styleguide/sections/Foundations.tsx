import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import {
  breakpoints,
  contrastLevel,
  contrastRatio,
  grid,
  Monogram,
  motion,
  spaceScale,
  StatusPill,
  type BookingStatus,
  type TypeToken,
  typeScale,
  Wordmark,
} from "@/design-system";
import { useBrandDirection } from "@/app/brandDirectionContext";
import { Grid, Row, Section, Specimen } from "../parts";

function Swatch({ name, hex, onWhite = true }: { name: string; hex: string; onWhite?: boolean }) {
  const { tokens } = useTheme();
  const ratio = contrastRatio(hex, tokens.neutral[0]);
  // Light tokens are surfaces, borders and disabled states; "Fail" would misread as a defect.
  const level = ratio < 3 ? "not for text" : contrastLevel(ratio);
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 3, minWidth: 0 }}>
      <Box sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: `${tokens.radius.sm}px`, bgcolor: hex, border: `1px solid ${tokens.neutral[200]}` }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="label" component="p" sx={{ m: 0 }}>
          {name}
        </Typography>
        <Typography variant="body2" component="p" sx={{ m: 0, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
          {hex}
          {onWhite && ` · ${ratio.toFixed(2)}:1 ${level}`}
        </Typography>
      </Box>
    </Box>
  );
}

const STATUSES: BookingStatus[] = [
  "awaiting_payment",
  "searching",
  "accepted",
  "arrived",
  "in_progress",
  "completed",
  "cancelled",
  "no_professional_found",
  "refund_pending",
  "refund_failed",
];

const TYPE_SAMPLES: Record<TypeToken, { en: string; hi: string }> = {
  display: { en: "At your door in 10–15 minutes", hi: "10–15 मिनट में आपके दरवाज़े पर" },
  h1: { en: "Checkout", hi: "चेकआउट" },
  h2: { en: "Where should we come?", hi: "हम कहाँ आएँ?" },
  h3: { en: "Korean glow facial", hi: "कोरियन ग्लो फ़ेशियल" },
  bodyLg: { en: "Verified professionals, one clear price, start with your OTP.", hi: "वेरिफ़ाइड प्रोफेशनल, एक साफ़ क़ीमत, आपके OTP से शुरुआत।" },
  body: { en: "If no one is free within 2 minutes, you'll get a full refund automatically.", hi: "अगर 2 मिनट में कोई खाली न मिले, तो पूरा पैसा अपने आप लौट आएगा।" },
  bodySm: { en: "Taxes included. Platform fee shown at checkout.", hi: "टैक्स शामिल। प्लेटफ़ॉर्म फ़ीस चेकआउट पर दिखेगी।" },
  label: { en: "House / flat number", hi: "मकान / फ़्लैट नंबर" },
  caption: { en: "Updated 20 seconds ago", hi: "20 सेकंड पहले अपडेट हुआ" },
  numericXl: { en: "₹1,049 · 12 min", hi: "₹1,049 · 12 मिनट" },
};

const MUI_VARIANT: Record<TypeToken, "display" | "h1" | "h2" | "h3" | "bodyLg" | "body1" | "body2" | "label" | "caption" | "numericXl"> = {
  display: "display",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  bodyLg: "bodyLg",
  body: "body1",
  bodySm: "body2",
  label: "label",
  caption: "caption",
  numericXl: "numericXl",
};

export function Foundations() {
  const { tokens } = useTheme();
  const { direction } = useBrandDirection();
  const n = tokens.neutral;

  return (
    <>
      <Section
        id="brand"
        title="Brand"
        description="A simple identity: the name set in Noto Sans SemiBold with slight negative tracking, plus a monogram on the accent square for icons. No mascot, illustration style or gradients."
        rules={[
          "Two directions for the client to choose (decision D1). Switch between them in the toolbar.",
          "Berry (recommended): warm and beauty-specific. Deep Teal: calm, clinical trust.",
          "Both are distinct from the legacy orange (#F26522), which fails contrast with white text at 3.15:1.",
        ]}
      >
        <Specimen label={`Wordmark and monogram · current direction: ${direction}`}>
          <Row>
            <Wordmark size="lg" />
            <Wordmark size="md" />
            <Wordmark size="sm" />
            <Monogram size={48} />
            <Monogram size={32} />
            <Monogram size={20} />
          </Row>
        </Specimen>
      </Section>

      <Section
        id="colour"
        title="Colour"
        description="Warm neutrals carry the interface; the accent marks actions and the current state. Contrast is computed live against white and verified in unit tests."
        rules={[
          "Text: neutral-900 (primary) and neutral-600 (secondary). neutral-400 is for disabled states only.",
          "Input borders use neutral-500 (meets the 3:1 rule for UI components).",
          "Status is never shown by colour alone; every pill has a text label.",
        ]}
      >
        <Specimen label="Neutral">
          <Grid min={220}>
            {(Object.keys(n) as unknown as Array<keyof typeof n>).map((step) => (
              <Swatch key={step} name={`neutral-${step}`} hex={n[step]} />
            ))}
          </Grid>
        </Specimen>
        <Specimen label={`Accent (${direction})`}>
          <Grid min={220}>
            {(Object.keys(tokens.accent) as unknown as Array<keyof typeof tokens.accent>).map((step) => (
              <Swatch key={step} name={`accent-${step}`} hex={tokens.accent[step]} />
            ))}
          </Grid>
        </Specimen>
        <Specimen label="Semantic tones (text · background · border)">
          <Grid min={220}>
            {(Object.keys(tokens.semantic) as Array<keyof typeof tokens.semantic>).map((tone) => (
              <Box key={tone} sx={{ display: "grid", gap: 3 }}>
                <Swatch name={`${tone} text`} hex={tokens.semantic[tone].fg} />
                <Swatch name={`${tone} background`} hex={tokens.semantic[tone].bg} onWhite={false} />
                <Swatch name={`${tone} border`} hex={tokens.semantic[tone].border} onWhite={false} />
              </Box>
            ))}
          </Grid>
        </Specimen>
        <Specimen label="Booking status pills">
          <Row>
            {STATUSES.map((status) => (
              <StatusPill key={status} status={status} />
            ))}
          </Row>
        </Specimen>
      </Section>

      <Section
        id="typography"
        title="Typography"
        description="Noto Sans with Noto Sans Devanagari: one family designed for both scripts. Sizes step up at 900px. Hindi gets 4px extra line height automatically through the lang attribute."
        rules={[
          "One h1 per page. Display is for the home hero only.",
          "Sentence case everywhere; no all-caps, letter-spacing tricks or italics.",
          "Prices, times and tables use tabular figures. Inputs are always 16px (prevents iOS zoom).",
          "Hindi strings run 30–40% longer: wrap, never truncate.",
        ]}
      >
        {(Object.keys(typeScale) as TypeToken[]).map((token) => {
          const spec = typeScale[token];
          return (
            <Specimen key={token} label={`${token} · ${spec.mobile[0]}/${spec.mobile[1]} → ${spec.desktop[0]}/${spec.desktop[1]} · weight ${spec.weight} · ${spec.use}`}>
              <Typography variant={MUI_VARIANT[token]} component="p" lang="en" sx={{ m: 0 }}>
                {TYPE_SAMPLES[token].en}
              </Typography>
              <Typography variant={MUI_VARIANT[token]} component="p" lang="hi" sx={{ m: 0, mt: 2 }}>
                {TYPE_SAMPLES[token].hi}
              </Typography>
            </Specimen>
          );
        })}
      </Section>

      <Section
        id="spacing"
        title="Spacing and layout"
        description="A 4px base. Components use 12–16 inside, 8 between related items, 16–24 between groups and 48–80 between marketing sections."
        rules={[
          "Breakpoints: 0 / 600 / 900 / 1200 / 1440. Test at 360, 390, 768, 1024, 1280 and 1440.",
          "Containers: marketing 1200, app 1120, reading 720, forms 560, auth card 400.",
          "No horizontal page scroll at any width from 320px.",
        ]}
      >
        <Specimen label="Spacing scale (px)">
          <Box sx={{ display: "grid", gap: 2 }}>
            {spaceScale.filter((value) => value > 0).map((value) => (
              <Box key={value} sx={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Typography variant="body2" sx={{ width: 40, textAlign: "right", fontVariantNumeric: "tabular-nums", color: "text.secondary" }}>
                  {value}
                </Typography>
                <Box sx={{ height: 12, width: value, bgcolor: tokens.accent[600], borderRadius: `${tokens.radius.sm / 2}px` }} />
              </Box>
            ))}
          </Box>
        </Specimen>
        <Specimen label="Breakpoints and grid">
          <Box component="table" sx={{ borderCollapse: "collapse", width: "100%", typography: "body2", "& th, & td": { textAlign: "left", py: 2, pr: 4, borderBottom: `1px solid ${n[200]}` } }}>
            <thead>
              <tr>
                <th>Breakpoint</th>
                <th>From</th>
                <th>Columns</th>
                <th>Margin</th>
                <th>Gutter</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(grid) as Array<keyof typeof grid>).map((key) => (
                <tr key={key}>
                  <td>{key}</td>
                  <td>{breakpoints[key]}px</td>
                  <td>{grid[key].columns}</td>
                  <td>{grid[key].margin}</td>
                  <td>{grid[key].gutter}</td>
                </tr>
              ))}
            </tbody>
          </Box>
        </Specimen>
      </Section>

      <Section
        id="shape"
        title="Shape and elevation"
        description="Small, deliberate radii and almost no shadows. Separation comes from borders and background, not depth."
        rules={[
          "Radii: 6 (buttons, inputs, chips), 8 (cards, menus, dialogs), 12 (bottom sheet top corners only), full (pills, avatars).",
          "Cards never lift on hover; only the border colour changes.",
          "Shadows only on floating layers: e2 for menus, popovers and toasts; e3 for dialogs and sheets.",
        ]}
      >
        <Specimen label="Radii" subtle>
          <Row>
            {(["sm", "md", "lg", "full"] as const).map((key) => (
              <Box key={key} sx={{ textAlign: "center" }}>
                <Box sx={{ width: 72, height: 72, bgcolor: n[0], border: `1px solid ${n[300]}`, borderRadius: `${tokens.radius[key]}px` }} />
                <Typography variant="caption" component="p" sx={{ mt: 2 }}>
                  {key} · {key === "full" ? "pill" : `${tokens.radius[key]}`}
                </Typography>
              </Box>
            ))}
          </Row>
        </Specimen>
        <Specimen label="Elevation" subtle>
          <Grid min={180}>
            {(["e0", "e2", "e3"] as const).map((key) => (
              <Box key={key} sx={{ height: 96, bgcolor: n[0], borderRadius: `${tokens.radius.md}px`, border: key === "e0" ? `1px solid ${n[200]}` : "none", boxShadow: tokens.elevation[key], display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Typography variant="label">{key}</Typography>
              </Box>
            ))}
          </Grid>
        </Specimen>
      </Section>

      <Section
        id="motion"
        title="Motion"
        description={`Durations: ${motion.duration.fast} ms (press, hover), ${motion.duration.base} ms (fades), ${motion.duration.enter} ms enter and ${motion.duration.exit} ms exit for overlays. Motion is used only where it explains a change.`}
        rules={[
          "Allowed: press feedback, overlay enter/exit, toasts, skeleton pulse, the 'finding' pulse, the countdown ring, map marker movement, status step changes, accordion height.",
          "Banned: scroll reveal, parallax, marquee, autoplay video, hover lift, page transitions, attention loops.",
          "With 'reduce motion' turned on, every transition becomes instant.",
        ]}
      >
        <Specimen label="Live indicator (the only looping motion)">
          <Row>
            <StatusPill status="searching" />
          </Row>
        </Specimen>
      </Section>
    </>
  );
}
