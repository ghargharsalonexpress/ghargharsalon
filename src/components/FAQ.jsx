// src/sections/ExperienceAssuranceSplit.jsx
import React, { useState } from "react";
import {
    Box,
    Container,
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Grid,
    Divider,
    useTheme,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SpaIcon from "@mui/icons-material/Spa";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import VerifiedIcon from "@mui/icons-material/Verified";
import { motion } from "framer-motion";
import HowItWorks from "./HowItWorks";

export default function ExperienceAssuranceSplit() {
    const theme = useTheme();
    const [expanded, setExpanded] = useState(false);

    const steps = [
        {
            icon: <SpaIcon fontSize="inherit" />,
            title: "1. Choose Your Service",
            desc: "Browse from a curated range of beauty, spa, and wellness services designed for your comfort.",
        },
        {
            icon: <CleaningServicesIcon fontSize="inherit" />,
            title: "2. Relax at Home",
            desc: "Our expert arrives with a sealed hygiene kit and professional setup — you just sit back and enjoy.",
        },
        {
            icon: <VerifiedIcon fontSize="inherit" />,
            title: "3. Glow with Confidence",
            desc: "Experience salon perfection and unmatched hygiene, right where you are.",
        },
    ];

    const faqs = [
        {
            q: "Are your professionals verified?",
            a: "Yes, every professional is background-checked, trained, and certified before onboarding.",
        },
        {
            q: "How do you maintain hygiene?",
            a: "We use single-use disposable kits, sanitize all tools, and follow WHO-recommended hygiene standards.",
        },
        {
            q: "Do I need to provide any setup at home?",
            a: "No, our experts bring everything — from towels to tools — ensuring a complete professional experience.",
        },
        {
            q: "Can I reschedule my booking?",
            a: "Absolutely. You can reschedule 2 hours before the appointment without extra charges.",
        },
    ];

    return (
        <>
            <Divider
                sx={{
                    width: 80,
                    height: 3,
                    mx: "auto",
                    borderRadius: 2,
                    backgroundColor: theme.palette.primary.main,
                }}
            />
            <HowItWorks />
            <Divider
                sx={{
                    width: 80,
                    height: 3,
                    mx: "auto",
                    borderRadius: 2,
                    backgroundColor: theme.palette.primary.main,
                }}
            />
            <Box
                sx={{
                    backgroundColor: theme.palette.background.paper,
                    py: 8,
                }}
            >
                <Container maxWidth="md">
                    {/* Heading */}
                    <Typography
                        variant="h5"
                        fontWeight={700}
                        textAlign="center"
                        mb={5}
                        sx={{ color: theme.palette.text.primary }}
                    >
                        Safety & FAQs
                    </Typography>

                    {/* Accordion Section */}
                    <Box
                        sx={{
                            p: 3,
                            borderRadius: 4,
                            border: `1px solid ${theme.palette.divider}`,
                            boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
                            backdropFilter: "blur(10px)",
                            backgroundColor: theme.palette.background.paper,
                        }}
                    >
                        {faqs.map((faq, i) => (
                            <Accordion
                                key={i}
                                expanded={expanded === i}
                                onChange={() => setExpanded(expanded === i ? false : i)}
                                sx={{
                                    mb: 1.5,
                                    backgroundColor: theme.palette.background.paper,
                                    borderBottom: `1px solid ${theme.palette.divider}`,
                                    "&:before": { display: "none" },
                                    transition: "all 0.3s ease",
                                    "&:hover": {
                                        backgroundColor: theme.palette.action.hover,
                                    },
                                    borderRadius: 2,
                                    boxShadow: "none",
                                }}
                            >
                                <AccordionSummary
                                    expandIcon={
                                        <ExpandMoreIcon
                                            sx={{ color: theme.palette.primary.main, fontSize: 24 }}
                                        />
                                    }
                                >
                                    <Typography
                                        fontWeight={600}
                                        sx={{
                                            color: theme.palette.text.primary,
                                            fontSize: "1rem",
                                        }}
                                    >
                                        {faq.q}
                                    </Typography>
                                </AccordionSummary>

                                <AccordionDetails>
                                    <Typography
                                        variant="body2"
                                        color={theme.palette.text.secondary}
                                        sx={{ lineHeight: 1.7, pl: 1 }}
                                    >
                                        {faq.a}
                                    </Typography>
                                </AccordionDetails>
                            </Accordion>
                        ))}
                    </Box>
                </Container>
            </Box>
        </>
    );
}
