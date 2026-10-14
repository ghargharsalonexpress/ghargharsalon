import React from "react";
import { Box, IconButton, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";

const QtyCounter = ({ qty, onIncrease, onDecrease }) => {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        border: "1px solid #ddd",
        borderRadius: "40px",
        backgroundColor: "#fff",
        height: 40,
        minWidth: 110,
        px: 1,
        boxSizing: "border-box",
      }}
    >
      <IconButton
        size="small"
        onClick={onDecrease}
        sx={{
          width: 32,
          height: 32,
          backgroundColor: "#f7f7f7",
          "&:hover": { backgroundColor: "#eee" },
        }}
      >
        <RemoveIcon fontSize="small" />
      </IconButton>

      <Typography fontWeight={600} sx={{ minWidth: 24, textAlign: "center" }}>
        {qty}
      </Typography>

      <IconButton
        size="small"
        onClick={onIncrease}
        sx={{
          width: 32,
          height: 32,
          backgroundColor: "#f7f7f7",
          "&:hover": { backgroundColor: "#eee" },
        }}
      >
        <AddIcon fontSize="small" />
      </IconButton>
    </Box>
  );
};

export default QtyCounter;
