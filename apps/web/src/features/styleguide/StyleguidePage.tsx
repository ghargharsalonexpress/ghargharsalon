import { useState } from "react";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useSearchParams } from "react-router";
import { LanguageSwitch, Link, SegmentedControl, SkipLink, Wordmark } from "@/design-system";
import { useBrandDirection } from "@/app/brandDirectionContext";
import { Grid, Section, Specimen } from "./parts";
import { Booking } from "./sections/Booking";
import { DataDisplay } from "./sections/DataDisplay";
import { Feedback } from "./sections/Feedback";
import { Foundations } from "./sections/Foundations";
import { Inputs } from "./sections/Inputs";

const NAV = [
  ["brand", "Brand"],
  ["colour", "Colour"],
  ["typography", "Typography"],
  ["spacing", "Spacing and layout"],
  ["shape", "Shape and elevation"],
  ["motion", "Motion"],
  ["buttons", "Buttons"],
  ["fields", "Form fields"],
  ["selection", "Selection controls"],
  ["feedback", "Feedback"],
  ["data", "Data display"],
  ["booking", "Booking components"],
  ["shells", "Shells and samples"],
] as const;

type Width = "full" | "360" | "768" | "1024";

const SAMPLES = [
  { to: "/samples/home", title: "Home (public shell)", body: "Hero, categories, trust and how it works. Compare the brand directions here first." },
  { to: "/samples/checkout", title: "Checkout", body: "Where, who, availability and the final total, with the sticky pay bar on phones." },
  { to: "/samples/job-alert", title: "Job alert (professional panel)", body: "Full-screen offer with the 30-second ring, earnings and one-hand actions." },
  { to: "/samples/admin", title: "Admin dashboard", body: "Sidebar shell, today's numbers, alerts and the bookings table." },
] as const;

function Content() {
  return (
    <>
      <Foundations />
      <Inputs />
      <Feedback />
      <DataDisplay />
      <Booking />
      <Section
        id="shells"
        title="Shells and samples"
        description="Each role has its own shell (plan A7). The samples below use only design-system components and are the basis for the client's brand decision."
      >
        <Grid min={260}>
          {SAMPLES.map((sample) => (
            <Specimen key={sample.to} label={sample.to}>
              <Typography variant="h3" component="p" sx={{ m: 0 }}>
                <Link to={sample.to}>{sample.title}</Link>
              </Typography>
              <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
                {sample.body}
              </Typography>
            </Specimen>
          ))}
        </Grid>
      </Section>
    </>
  );
}

/** Live style guide (plan Phase 1). Every component and state, in both languages and every brand direction. */
export function StyleguidePage() {
  const theme = useTheme();
  const n = theme.tokens.neutral;
  const [params] = useSearchParams();
  const embedded = params.get("embed") === "1";
  const { direction, setDirection } = useBrandDirection();
  const [width, setWidth] = useState<Width>("full");

  if (embedded) {
    return (
      <Box component="main" id="main" sx={{ px: { xs: 4, md: 8 }, pb: 16 }}>
        <Content />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: n[0] }}>
      <SkipLink label="Skip to content" />
      <Box
        component="header"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: theme.tokens.layer.appBar,
          bgcolor: n[0],
          borderBottom: `1px solid ${n[200]}`,
          px: { xs: 4, md: 8 },
          py: 3,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 4,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 3, mr: "auto" }}>
          <Wordmark size="sm" />
          <Typography variant="label" component="p" sx={{ m: 0, color: "text.secondary" }}>
            Design system
          </Typography>
        </Box>
        <SegmentedControl
          label="Brand direction"
          name="direction"
          value={direction}
          onChange={setDirection}
          options={[
            { value: "orange", label: "Orange" },
            { value: "berry", label: "A · Berry" },
            { value: "teal", label: "B · Teal" },
          ]}
        />
        <LanguageSwitch name="language-styleguide" />
        <Box sx={{ display: { xs: "none", md: "block" } }}>
          <SegmentedControl<Width>
            label="Preview width"
            name="width"
            value={width}
            onChange={setWidth}
            options={[
              { value: "full", label: "Full" },
              { value: "360", label: "360" },
              { value: "768", label: "768" },
              { value: "1024", label: "1024" },
            ]}
          />
        </Box>
      </Box>

      {width !== "full" ? (
        <Box component="main" id="main" sx={{ display: "flex", justifyContent: "center", bgcolor: n[50], py: 8, minHeight: "calc(100dvh - 72px)" }}>
          <Box
            component="iframe"
            title={`Style guide at ${width} pixels`}
            src={`/styleguide?embed=1&brand=${direction}`}
            sx={{ width: Number(width), height: "calc(100dvh - 140px)", border: `1px solid ${n[300]}`, borderRadius: `${theme.tokens.radius.md}px`, bgcolor: n[0] }}
          />
        </Box>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "220px minmax(0, 1fr)" }, gap: { md: 10 }, px: { xs: 4, md: 8 }, maxWidth: theme.tokens.container.admin, mx: "auto" }}>
          <Box component="nav" aria-label="Style guide sections" sx={{ display: { xs: "none", md: "block" } }}>
            <List dense sx={{ position: "sticky", top: 88, py: 8 }}>
              {NAV.map(([id, label]) => (
                <ListItem key={id} disablePadding>
                  <ListItemButton component="a" href={`#${id}`} sx={{ typography: "body2", minHeight: 36 }}>
                    {label}
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
          <Box component="main" id="main" tabIndex={-1} sx={{ minWidth: 0, pb: 16, outline: "none" }}>
            <Box sx={{ pt: { xs: 8, md: 12 }, pb: 4 }}>
              <Typography variant="h1">Design system</Typography>
              <Typography sx={{ mt: 2, color: "text.secondary", maxWidth: "72ch" }}>
                Every token, component and state used by the product, rendered from the same code the screens use. Switch the brand direction, language and preview width in the toolbar.
              </Typography>
            </Box>
            <Content />
          </Box>
        </Box>
      )}
    </Box>
  );
}
