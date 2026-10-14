// src/theme/theme.js
import { createTheme, responsiveFontSizes } from "@mui/material/styles";

let theme = createTheme({
  palette: {
    primary: {
      main: "#F26522",   // Yes Madam inspired orange
      light: "#FF8D54",
      dark: "#C54E1B",
      contrastText: "#FFFFFF",
    },

    secondary: {
      main: "#2C2C2C",
      contrastText: "#FFFFFF",
    },

    background: {
      default: "#FFFFFF",
      paper: "#FFFFFF",
    },

    text: {
      primary: "#000000",
      secondary: "#4C4C4C",
    },

    divider: "#FFD5C2",
  },
  typography: {
    fontFamily: `"Poppins", "DM Sans", "Roboto", sans-serif`,

    h1: { fontWeight: 700, fontSize: "2.5rem" },
    h2: { fontWeight: 700, fontSize: "2rem" },
    h3: { fontWeight: 600, fontSize: "1.75rem" },
    h4: { fontWeight: 600, fontSize: "1.4rem" },
    h5: { fontWeight: 500, fontSize: "1.2rem" },
    h6: { fontWeight: 500, fontSize: "1.05rem" },

    body1: { fontSize: "1rem", lineHeight: 1.6 },
    body2: { fontSize: "0.9rem", lineHeight: 1.5 },

    button: {
      textTransform: "none",
      fontWeight: 600,
      letterSpacing: 0.3,
      borderRadius: 10,
    },
  },

  shape: { borderRadius: 14 },

  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: "10px 24px",
          fontWeight: 600,
          transition: "all 0.3s ease",
        },

        containedPrimary: {
          backgroundColor: "#000",
          color: "#fff",
          "&:hover": { backgroundColor: "#333" },
        },

        outlinedPrimary: {
          borderColor: "#000",
          color: "#000",
          "&:hover": {
            backgroundColor: "rgba(0,0,0,0.06)",
            borderColor: "#000",
            color: "#000",
          },
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: "#fff",
          borderRadius: 16,
          border: "1px solid #E5E5E5",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          transition: "all 0.25s ease",
          "&:hover": {
            boxShadow: "0 6px 16px rgba(0,0,0,0.10)",
            transform: "translateY(-3px)",
          },
        },
      },
    },

    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#fff",
          color: "#000",
          boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
        },
      },
    },

    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: "#E5E5E5",
        }
      }
    }
  },
});

theme = responsiveFontSizes(theme);
export default theme;
