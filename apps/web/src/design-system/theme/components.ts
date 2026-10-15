import type { ThemeOptions } from "@mui/material/styles";
import type { AppTokens } from "../tokens";
import { dangerInteractive } from "../tokens/color";
import { HINDI_EXTRA_LH, typeStyle } from "./typography";

const COARSE = "@media (pointer: coarse)";

/** Component defaults and overrides. Screens never restyle these; they use the wrappers. */
export function buildComponents(t: AppTokens): ThemeOptions["components"] {
  const { neutral: n, accent: a, semantic: s, radius: r, elevation: e, motion: m } = t;
  const focusRing = { outline: `2px solid ${a[600]}`, outlineOffset: 2 };
  const colourTransition = `background-color ${m.duration.fast}ms ${m.easing.enter}, border-color ${m.duration.fast}ms ${m.easing.enter}, color ${m.duration.fast}ms ${m.easing.enter}`;
  const label = typeStyle("label", t.fontFamily);
  const body = typeStyle("body", t.fontFamily);
  const bodySm = typeStyle("bodySm", t.fontFamily);
  const mdUp = `@media (min-width:${t.breakpoints.md}px)`;
  const phone = `@media (max-width:${t.breakpoints.sm - 0.05}px)`;

  return {
    MuiCssBaseline: {
      styleOverrides: {
        ":root": { "--hi-extra-lh": "0rem", colorScheme: "light" },
        ":lang(hi)": { "--hi-extra-lh": HINDI_EXTRA_LH },
        html: { WebkitTextSizeAdjust: "100%", textRendering: "optimizeLegibility" },
        body: {
          backgroundColor: n[0],
          color: n[900],
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        },
        "::selection": { backgroundColor: a[100], color: n[900] },
        "a, button, input, select, textarea, [tabindex]": { WebkitTapHighlightColor: "transparent" },
        ":focus-visible": focusRing,
        "@media (prefers-reduced-motion: reduce)": {
          "*, *::before, *::after": {
            animationDuration: "0.01ms !important",
            animationIterationCount: "1 !important",
            transitionDuration: "0.01ms !important",
            scrollBehavior: "auto !important",
          },
        },
      },
    },

    MuiButtonBase: {
      defaultProps: { disableRipple: true, disableTouchRipple: true },
      styleOverrides: { root: { "&.Mui-focusVisible": focusRing } },
    },

    MuiButton: {
      defaultProps: { disableElevation: true, variant: "contained", color: "primary" },
      styleOverrides: {
        root: {
          ...label,
          borderRadius: r.sm,
          textTransform: "none",
          minWidth: 0,
          boxShadow: "none",
          transition: colourTransition,
          "&:hover, &:active": { boxShadow: "none" },
          "&.Mui-focusVisible": focusRing,
          variants: [
            {
              props: { variant: "contained", color: "primary" },
              style: {
                backgroundColor: a[600],
                color: n[0],
                "&:hover": { backgroundColor: a[700] },
                "&:active": { backgroundColor: a[800] },
                "&.Mui-disabled": { backgroundColor: n[100], color: n[400] },
              },
            },
            {
              props: { variant: "contained", color: "error" },
              style: {
                backgroundColor: s.danger.fg,
                color: n[0],
                "&:hover": { backgroundColor: dangerInteractive.hover },
                "&:active": { backgroundColor: dangerInteractive.pressed },
                "&.Mui-disabled": { backgroundColor: n[100], color: n[400] },
              },
            },
            {
              props: { variant: "outlined" },
              style: {
                backgroundColor: n[0],
                borderColor: n[300],
                color: n[900],
                "&:hover": { backgroundColor: n[50], borderColor: n[400] },
                "&:active": { backgroundColor: n[100] },
                "&.Mui-disabled": { borderColor: n[200], color: n[400] },
              },
            },
            {
              props: { variant: "text" },
              style: {
                color: a[700],
                "&:hover": { backgroundColor: a[50] },
                "&:active": { backgroundColor: a[100] },
                "&.Mui-disabled": { color: n[400] },
              },
            },
          ],
        },
        sizeSmall: { minHeight: 32, padding: "4px 12px", [COARSE]: { minHeight: 44 } },
        sizeMedium: { minHeight: 40, padding: "8px 16px", [COARSE]: { minHeight: 44 } },
        sizeLarge: { minHeight: 48, padding: "12px 20px", fontSize: "1rem", lineHeight: "1.5rem" },
        startIcon: { marginLeft: -2, marginRight: 8 },
        endIcon: { marginLeft: 8, marginRight: -2 },
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: r.sm,
          color: n[700],
          padding: 8,
          transition: colourTransition,
          "&:hover": { backgroundColor: n[50] },
          "&.Mui-focusVisible": focusRing,
          [COARSE]: { minWidth: t.touchTarget.default, minHeight: t.touchTarget.default },
        },
        sizeSmall: { padding: 4 },
        sizeLarge: { padding: 12 },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          ...body,
          borderRadius: r.sm,
          backgroundColor: n[0],
          "& .MuiOutlinedInput-notchedOutline": { borderColor: n[500], transition: colourTransition },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: n[700] },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: a[600], borderWidth: 2 },
          "&.Mui-error .MuiOutlinedInput-notchedOutline": { borderColor: s.danger.fg },
          "&.Mui-disabled": { backgroundColor: n[50] },
          "&.Mui-disabled .MuiOutlinedInput-notchedOutline": { borderColor: n[200] },
        },
        input: {
          padding: "10px 12px",
          height: "1.5rem",
          "&::placeholder": { color: n[600], opacity: 1 },
        },
        multiline: { padding: "10px 12px", "& .MuiOutlinedInput-input": { padding: 0, height: "auto" } },
        adornedStart: { paddingLeft: 12, "& .MuiOutlinedInput-input": { paddingLeft: 0 } },
        adornedEnd: { paddingRight: 4 },
      },
    },
    MuiInputAdornment: {
      styleOverrides: { root: { color: n[600], "& .MuiTypography-root": { ...body, color: n[700] } } },
    },
    MuiSelect: {
      styleOverrides: { select: { "&:focus": { backgroundColor: "transparent" } }, icon: { color: n[600] } },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          ...label,
          display: "block",
          color: n[900],
          marginBottom: 6,
          "&.Mui-focused, &.Mui-error": { color: n[900] },
          "&.Mui-disabled": { color: n[400] },
        },
        asterisk: { display: "none" },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: { ...bodySm, margin: "6px 0 0", color: n[600], "&.Mui-error": { color: s.danger.fg } },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: { root: { marginLeft: -10, marginRight: 0 }, label: { ...body } },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: n[500],
          padding: 10,
          borderRadius: r.sm,
          "&:hover": { backgroundColor: n[50] },
          "&.Mui-checked": { color: a[600] },
          "&.Mui-focusVisible": { ...focusRing, outlineOffset: -4 },
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          color: n[500],
          padding: 10,
          "&:hover": { backgroundColor: n[50] },
          "&.Mui-checked": { color: a[600] },
          "&.Mui-focusVisible": { ...focusRing, outlineOffset: -4, borderRadius: r.full },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: { width: 44, height: 24, padding: 0, margin: 10, overflow: "visible" },
        switchBase: {
          padding: 2,
          "&.Mui-checked": {
            transform: "translateX(20px)",
            color: n[0],
            "& + .MuiSwitch-track": { backgroundColor: a[600], opacity: 1 },
          },
          "&.Mui-focusVisible + .MuiSwitch-track": { ...focusRing },
          "&.Mui-disabled + .MuiSwitch-track": { opacity: 0.4 },
        },
        thumb: { width: 20, height: 20, boxShadow: "0 1px 2px rgba(31, 28, 25, 0.24)" },
        track: { borderRadius: r.full, backgroundColor: n[500], opacity: 1 },
      },
    },

    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 44, borderBottom: `1px solid ${n[200]}` },
        // The sliding, JS-measured indicator is motion the plan doesn't allow (B7); each tab draws its own.
        indicator: { display: "none" },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          ...label,
          textTransform: "none",
          minHeight: 44,
          minWidth: 0,
          padding: "10px 12px",
          color: n[600],
          "&.Mui-selected": { color: n[900], boxShadow: `inset 0 -2px 0 ${a[600]}` },
          "&.Mui-focusVisible": { ...focusRing, outlineOffset: -2 },
        },
      },
    },

    MuiBackdrop: {
      styleOverrides: { root: { "&:not(.MuiBackdrop-invisible)": { backgroundColor: t.overlay.scrim } } },
    },
    MuiDialog: {
      styleOverrides: {
        // Only the content scrolls: at some browser zoom levels the paper used to scroll too,
        // showing two scrollbars and pushing the action buttons out of view.
        paper: { borderRadius: r.md, boxShadow: e.e3, margin: 16, width: "calc(100% - 32px)", overflowY: "hidden" },
      },
    },
    MuiDialogTitle: { styleOverrides: { root: { ...typeStyle("h3", t.headingFamily), padding: "20px 24px 4px" } } },
    MuiDialogContent: { styleOverrides: { root: { padding: "8px 24px", minHeight: 0 } } },
    MuiDialogActions: {
      styleOverrides: {
        root: { padding: "16px 24px 20px", gap: 8, "& > :not(style) ~ :not(style)": { marginLeft: 0 } },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { borderColor: n[200], boxShadow: e.e3 },
        // MUI 9 resolves only root/docked/modal for the root slot, so anchor styles key off the class.
        root: {
          "&.MuiDrawer-anchorBottom .MuiDrawer-paper": {
            borderTopLeftRadius: r.lg,
            borderTopRightRadius: r.lg,
            maxHeight: "90dvh",
          },
        },
      },
    },
    MuiPopover: {
      styleOverrides: { paper: { borderRadius: r.md, boxShadow: e.e2, border: `1px solid ${n[200]}` } },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          ...body,
          minHeight: 40,
          "&:hover": { backgroundColor: n[50] },
          "&.Mui-selected": { backgroundColor: a[50], "&:hover": { backgroundColor: a[100] } },
          "&.Mui-focusVisible": { backgroundColor: n[100] },
        },
      },
    },
    MuiTooltip: {
      defaultProps: { enterDelay: 300 },
      styleOverrides: {
        tooltip: {
          ...bodySm,
          backgroundColor: n[900],
          color: n[0],
          borderRadius: r.sm,
          padding: "6px 10px",
          maxWidth: 280,
        },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: {
          ...bodySm,
          borderRadius: r.md,
          border: "1px solid",
          padding: "12px 16px",
          alignItems: "flex-start",
          color: n[900],
          // MUI 9 resolves only root and the variant for the root slot, so tones key off the classes.
          "&.MuiAlert-standard.MuiAlert-colorSuccess": { backgroundColor: s.success.bg, borderColor: s.success.border, color: n[900] },
          "&.MuiAlert-colorSuccess .MuiAlert-icon": { color: s.success.fg },
          "&.MuiAlert-standard.MuiAlert-colorWarning": { backgroundColor: s.warning.bg, borderColor: s.warning.border, color: n[900] },
          "&.MuiAlert-colorWarning .MuiAlert-icon": { color: s.warning.strong },
          "&.MuiAlert-standard.MuiAlert-colorError": { backgroundColor: s.danger.bg, borderColor: s.danger.border, color: n[900] },
          "&.MuiAlert-colorError .MuiAlert-icon": { color: s.danger.fg },
          "&.MuiAlert-standard.MuiAlert-colorInfo": { backgroundColor: s.info.bg, borderColor: s.info.border, color: n[900] },
          "&.MuiAlert-colorInfo .MuiAlert-icon": { color: s.info.fg },
          // On phones the action moves under the message, aligned with its text (icon 20 + gap 12).
          flexWrap: "wrap",
          [phone]: { "& .MuiAlert-action": { flexBasis: "100%", margin: "8px 0 0 32px", padding: 0 } },
        },
        icon: { marginRight: 12, padding: "2px 0", opacity: 1, fontSize: 20 },
        message: { padding: "1px 0", overflow: "visible", flex: "1 1 0", minWidth: 0 },
        action: { padding: "0 0 0 12px", marginRight: -4, alignItems: "flex-start" },
      },
    },
    MuiAlertTitle: {
      styleOverrides: { root: { ...label, fontWeight: 600, marginTop: 0, marginBottom: 2, color: n[900] } },
    },
    MuiSnackbarContent: {
      styleOverrides: {
        root: {
          ...bodySm,
          backgroundColor: n[900],
          color: n[0],
          borderRadius: r.md,
          boxShadow: e.e2,
          padding: "6px 16px",
          minWidth: "auto",
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: { ...label, borderRadius: r.sm, height: 32 },
        outlined: { borderColor: n[300], "&.MuiChip-clickable:hover": { backgroundColor: n[50] } },
        label: { paddingLeft: 12, paddingRight: 12 },
      },
    },
    MuiSkeleton: {
      defaultProps: { animation: "pulse" },
      styleOverrides: { root: { backgroundColor: n[100] }, rounded: { borderRadius: r.sm } },
    },
    MuiLink: {
      defaultProps: { underline: "always" },
      styleOverrides: {
        root: {
          color: a[600],
          textDecorationColor: `${a[600]}66`,
          textUnderlineOffset: "0.18em",
          transition: colourTransition,
          "&:hover": { textDecorationColor: a[600] },
          "&:focus-visible": { ...focusRing, borderRadius: 2 },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { backgroundImage: "none" }, outlined: { borderColor: n[200] } },
    },
    MuiCard: { defaultProps: { variant: "outlined" }, styleOverrides: { root: { borderRadius: r.md } } },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: "inherit", position: "sticky" },
      styleOverrides: { root: { backgroundColor: n[0], borderBottom: `1px solid ${n[200]}` } },
    },
    MuiToolbar: {
      styleOverrides: { regular: { minHeight: 56, [mdUp]: { minHeight: 64 } } },
    },
    MuiDivider: { styleOverrides: { root: { borderColor: n[200] } } },
    // Page margins from the grid (plan B4): 16 on phones, 24 on tablets, 32 from md.
    MuiContainer: {
      styleOverrides: {
        root: ({ ownerState }) =>
          ownerState.disableGutters
            ? {}
            : {
                paddingLeft: t.grid.xs.margin,
                paddingRight: t.grid.xs.margin,
                [`@media (min-width:${t.breakpoints.sm}px)`]: { paddingLeft: t.grid.sm.margin, paddingRight: t.grid.sm.margin },
                [mdUp]: { paddingLeft: t.grid.md.margin, paddingRight: t.grid.md.margin },
              },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { ...bodySm, borderBottom: `1px solid ${n[200]}`, padding: "12px 16px", color: n[900] },
        head: { ...label, color: n[600], backgroundColor: n[25] },
      },
    },
    MuiTableRow: {
      styleOverrides: { root: { "&.MuiTableRow-hover:hover": { backgroundColor: n[25] } } },
    },
    MuiPaginationItem: {
      styleOverrides: {
        root: {
          ...label,
          borderRadius: r.sm,
          minWidth: 40,
          height: 40,
          "&.Mui-selected": { backgroundColor: a[600], color: n[0], "&:hover": { backgroundColor: a[700] } },
          "&.Mui-focusVisible": focusRing,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { backgroundColor: n[100], borderRadius: r.full, height: 4 },
        bar: { backgroundColor: a[600], borderRadius: r.full },
      },
    },
    MuiAvatar: {
      styleOverrides: { root: { backgroundColor: n[100], color: n[700], fontWeight: 600 } },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: r.sm,
          minHeight: 44,
          "&:hover": { backgroundColor: n[50] },
          "&.Mui-selected": { backgroundColor: a[50], color: a[700], "&:hover": { backgroundColor: a[100] } },
          "&.Mui-focusVisible": focusRing,
        },
      },
    },
    MuiListItemIcon: { styleOverrides: { root: { minWidth: 36, color: "inherit" } } },
    MuiAccordion: {
      defaultProps: { disableGutters: true, elevation: 0, slotProps: { transition: { timeout: m.duration.base } } },
      styleOverrides: {
        root: {
          border: `1px solid ${n[200]}`,
          "&::before": { display: "none" },
          "&:not(:last-of-type)": { borderBottom: 0 },
          "&:first-of-type": { borderTopLeftRadius: r.md, borderTopRightRadius: r.md },
          "&:last-of-type": { borderBottomLeftRadius: r.md, borderBottomRightRadius: r.md },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: { ...label, fontSize: "1rem", minHeight: 48, padding: "0 16px", "&.Mui-focusVisible": { ...focusRing, outlineOffset: -2 } },
        content: { margin: "12px 0" },
      },
    },
    MuiAccordionDetails: { styleOverrides: { root: { ...bodySm, padding: "0 16px 16px", color: n[700] } } },
  };
}
