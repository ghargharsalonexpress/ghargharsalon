// src/components/Footer.jsx
import React from "react";
import {
  Box,
  Grid,
  Typography,
  Stack,
  Link,
  IconButton,
  useTheme,
} from "@mui/material";

import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import XIcon from "@mui/icons-material/X";
import LinkedInIcon from "@mui/icons-material/LinkedIn";

const Footer = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        backgroundColor: theme.palette.background.paper,
        borderTop: `1px solid ${theme.palette.divider}`,
        mt: 8,
        py: 6,
        px: { xs: 3, md: 10 },
      }}
    >
      {/* ABOUT SECTION */}
      <Grid container spacing={5}>
        <Grid item xs={12}>
          <Typography variant="h6" fontWeight={700} mb={1}>
            Nivas Beauty Enhancement
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Nivas Beauty Enhancement is India's Prominent Salon at Home, launched in 2016 and
            currently functioning in 50+ cities in India. Our commitment is to
            deliver quality salon and wellness services at home with top-level
            professionals & excellent leading products.
          </Typography>
        </Grid>
      </Grid>

      {/* CONTENT ROWS */}
      <Grid
        container
        spacing={4}
        sx={{ justifyContent: "space-between", mt: "2%" }}
      >
        {/* QUICK LINKS */}
        <Grid item sm={4} md={4}>
          <Typography variant="h6" fontWeight={700} mb={1}>
            Quick Links
          </Typography>

          <Stack spacing={0.6}>
            {[
              "About Us",
              " Madam Salon",
              "Corporate Wellness",
              "Register as a Professional",
              "Careers",
              "Blog",
              "Privacy Policy",
            ].map((link, i) => (
              <Link
                key={i}
                href="#"
                underline="none"
                sx={{
                  fontSize: 14,
                  color: theme.palette.text.secondary,
                  "&:hover": {
                    color: theme.palette.secondary.main,
                    textDecoration: "underline",
                  },
                }}
              >
                {link}
              </Link>
            ))}
          </Stack>
        </Grid>

        {/* SUPPORT */}
        <Grid item md={4}>
          <Box
            sx={{
              backgroundColor: theme.palette.background.default,
              p: 2.5,
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Typography variant="subtitle1" fontWeight={700}>
              Facing issues? Reach us out at:
            </Typography>

            <Typography variant="body2" sx={{ mt: 0.5 }}>
              <Link
                href="#"
                underline="none"
                sx={{
                  fontWeight: 600,
                  color: theme.palette.text.primary,
                  "&:hover": {
                    color: theme.palette.secondary.main,
                  },
                }}
              >
                Contact Us
              </Link>
            </Typography>

            <Typography variant="body2" color="text.secondary">
              support@Nivas Beauty Enhancement.com
            </Typography>
          </Box>
        </Grid>

        {/* APPS + SOCIAL */}
        <Grid item md={4}>
          <Typography variant="h6" fontWeight={700} mb={1}>
            Experience Nivas Beauty Enhancement Mobile App
          </Typography>

          <Stack spacing={1} direction="row" flexWrap="wrap" useFlexGap>
            <Box
              component="img"
              src="/images/google-play.png"
              alt="Google Play"
              sx={{ width: 130 }}
            />
            <Box
              component="img"
              src="/images/app-store.png"
              alt="App Store"
              sx={{ width: 130 }}
            />
          </Stack>

          <Typography variant="body2" sx={{ mt: 2 }}>
            Show some love 💛 on social media
          </Typography>

          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            {[FacebookIcon, InstagramIcon, XIcon, LinkedInIcon].map(
              (Icon, idx) => (
                <IconButton
                  key={idx}
                  size="small"
                  sx={{
                    color: theme.palette.text.primary,
                    "&:hover": {
                      color: theme.palette.secondary.main,
                    },
                  }}
                >
                  <Icon fontSize="small" />
                </IconButton>
              )
            )}
          </Stack>
        </Grid>
      </Grid>

      {/* FOOTER BOTTOM */}
      <Box
        sx={{
          borderTop: `1px solid ${theme.palette.divider}`,
          mt: 4,
          pt: 2,
          textAlign: "center",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Copyright © 2017–2024 @Nivas Beauty Enhancement | Powered by: Notion Online Solutions
          Private Limited
        </Typography>
      </Box>
    </Box>
  );
};

export default Footer;
