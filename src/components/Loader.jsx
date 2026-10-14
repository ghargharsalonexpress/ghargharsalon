// src/components/Loader.jsx
import React from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import { motion } from "framer-motion";

const Loader = ({ text = "Loading, please wait..." }) => {
  return (
    <Box
      sx={{
        height: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        bgcolor: "background.default",
      }}
    >
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 360],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <CircularProgress
          size={70}
          thickness={4}
          sx={{
            color: "primary.main",
            "& .MuiCircularProgress-circle": {
              strokeLinecap: "round",
            },
          }}
        />
      </motion.div>

      <Typography
        variant="subtitle1"
        sx={{
          color: "text.secondary",
          letterSpacing: "0.5px",
          mt: 2,
        }}
      >
        {text}
      </Typography>
    </Box>
  );
};

export default Loader;
