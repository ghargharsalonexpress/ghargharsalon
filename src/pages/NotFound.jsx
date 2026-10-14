// src/pages/NotFound.jsx
import React from "react";
import { Box, Typography, Button, Container } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <Container
      maxWidth="md"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        textAlign: "center",
      }}
    >
      <Box>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <Typography
            variant="h1"
            fontWeight={800}
            sx={{
              fontSize: { xs: "6rem", md: "8rem" },
              background: "linear-gradient(45deg, #a03355, #4a90e2)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            404
          </Typography>

          <Typography
            variant="h5"
            color="text.primary"
            fontWeight={600}
            mb={1}
          >
            Oops! Page not found
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            mb={4}
          >
            The page you’re looking for doesn’t exist or has been moved.
            Don’t worry — we’ll get you back on track.
          </Typography>

          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={() => navigate("/")}
            sx={{
              textTransform: "none",
              borderRadius: "25px",
              px: 4,
              py: 1.2,
            }}
          >
            Back to Home
          </Button>
        </motion.div>

        <motion.img
          src="https://cdn.dribbble.com/users/285475/screenshots/2083086/dribbble_1.gif"
          alt="Not Found"
          style={{
            width: "100%",
            maxWidth: 400,
            marginTop: 50,
            borderRadius: "20px",
          }}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        />
      </Box>
    </Container>
  );
};

export default NotFound;
