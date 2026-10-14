// src/sections/WhyChooseUsFinalFlex.jsx
import React from "react";
import {
  Box,
  Typography,
  Container,
  Button,
  Divider,
  useTheme,
} from "@mui/material";
import LocalAtmIcon from "@mui/icons-material/LocalAtm";
import CreditScoreIcon from "@mui/icons-material/CreditScore";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import StarIcon from "@mui/icons-material/Star";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
const reasons = [
  {
    icon: <LocalAtmIcon sx={{ fontSize: 36 }} />,
    title: "Competitive Pricing",
    desc: "Premium home salon services at fair, transparent prices—experience quality without overspending.",
  },
  {
    icon: <CreditScoreIcon sx={{ fontSize: 36 }} />,
    title: "Easy Scheduling",
    desc: "Book your appointment with ease—our flexible scheduling fits perfectly into your busy routine.",
  },
  {
    icon: <WorkspacePremiumIcon sx={{ fontSize: 36 }} />,
    title: "Certified Experts",
    desc: "Every service is performed by trained and certified beauty professionals for consistent, high-quality results.",
  },
  {
    icon: <StarIcon sx={{ fontSize: 36 }} />,
    title: "100% Satisfaction",
    desc: "Your satisfaction is our priority—discover why clients choose Nivas Beauty Enhancement again and again.",
  },
];
const WhyChooseUsFinalFlex = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  return (
    <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: theme.palette.background.paper }}>
      <Container maxWidth="lg">
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: "flex-start",
            gap: { xs: 6, md: 10 },
          }}
        >
          {/* LEFT COLUMN */}
          <Box sx={{ flex: { md: "0 0 40%", xs: "1 1 auto" } }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: theme.palette.primary.dark,
                mb: 1,
                letterSpacing: "0.5px",
              }}
            >
              / Why Nivas Beauty Enhancement?
            </Typography>

            <Typography
              variant="h3"
              fontWeight={800}
              lineHeight={1.2}
              sx={{ color: theme.palette.text.primary, mb: 3 }}
            >
              Nivas Beauty Enhancement <br /> Difference
            </Typography>

            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ maxWidth: 420, mb: 4 }}
            >
              For over a decade, we’ve been delivering trusted home salon experiences—bringing expert care and unmatched convenience to clients across India.
            </Typography>

            <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
              <Button
                onClick={() => navigate("/contact")}
                sx={{
                  color: theme.palette.primary.main,
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "1rem",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                Call Now →
              </Button>

              <Button
                onClick={() => navigate("/contact")}
                sx={{
                  color: theme.palette.primary.main,
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "1rem",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                Book Free Estimate →
              </Button>
            </Box>
          </Box>

          {/* RIGHT 2×2 CARDS */}
          <Box
            sx={{
              flex: 1,
              borderLeft: { md: `1px solid ${theme.palette.divider}` },
              pl: { md: 6, xs: 0 },
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                columnGap: 4,
                rowGap: 6,
              }}
            >
              {reasons.map((reason, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Box sx={{ color: theme.palette.primary.main, mb: 1.5 }}>
                    {reason.icon}
                  </Box>

                  <Typography
                    variant="h6"
                    fontWeight={700}
                    sx={{ color: theme.palette.text.primary, mb: 0.5 }}
                  >
                    {reason.title}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ lineHeight: 1.6 }}
                  >
                    {reason.desc}
                  </Typography>

                  {(index === 0 || index === 1) && (
                    <Divider
                      sx={{
                        mt: 4,
                        opacity: 0.15,
                        display: { xs: "none", sm: "block" },
                      }}
                    />
                  )}
                </motion.div>
              ))}
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};
export default WhyChooseUsFinalFlex;
