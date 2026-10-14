import React from "react";
import { Box, Container, Typography, Grid, useTheme } from "@mui/material";
import { motion } from "framer-motion";

const steps = [
    {
      number: 1,
      title: "Choose Your Service",
      desc: "Pick from a curated range of salon and spa services designed for your comfort.",
    },
    {
      number: 2,
      title: "Book Your Slot",
      desc: "Select your preferred time and our trained professionals will arrive on schedule.",
    },
    {
      number: 3,
      title: "Enjoy the Experience",
      desc: "Relax while our experts deliver a safe, hygienic, and premium salon session.",
    },
    {
      number: 4,
      title: "Pay Securely",
      desc: "Complete your payment easily through safe and verified online payment options.",
    },
  ];

export default function HowItWorks() {
  const theme = useTheme();

  return (
    <Box
    sx={{
      py: { xs: 8, md: 10 },
      backgroundColor: theme.palette.background.paper,
      position: "relative",
    }}
  >
    <Typography
      variant="h5"
      fontWeight={700}
      textAlign="center"
      mb={6}
      sx={{
        color: theme.palette.text.primary,
        "& span": { color: theme.palette.primary.main },
      }}
    >
      How It <span>Works</span>
    </Typography>

    <Grid
      container
      spacing={{ xs: 3, sm: 4, md: 5 }}
      justifyContent="center"
      alignItems="stretch"
    >
      {steps.map((step, i) => (
        <Grid
          item
          key={i}
          xs={12}
          sm={6}
          md={6}
          lg={3}
          xl={3}
        >
          <Box
            component={motion.div}
            whileHover={{ scale: 1.03 }}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            viewport={{ once: true }}
            sx={{
              background: theme.palette.background.paper,
              borderRadius: "24px",
              p: 4,
              height: "100%",
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
              transition: "all 0.3s ease",
              "&:hover": {
                boxShadow: `0 12px 28px ${theme.palette.primary.main}40, 0 4px 8px rgba(0,0,0,0.05)`,
                transform: "translateY(-5px)",
              },
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "10px",
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 2,
                fontSize: "1rem",
                boxShadow: `0 4px 10px ${theme.palette.primary.main}66`,
              }}
            >
              {step.number}
            </Box>

            <Typography
              variant="h6"
              fontWeight={700}
              mb={1}
              sx={{ color: theme.palette.text.primary }}
            >
              {step.title}
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.secondary,
                lineHeight: 1.6,
              }}
            >
              {step.desc}
            </Typography>
          </Box>
        </Grid>
      ))}
    </Grid>
  </Box>
  );
}
