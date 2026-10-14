import { Box, Typography, Button } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { useNavigate } from "react-router-dom";

export default function SuccessScreen() {
  const navigate = useNavigate();
  return (
    <Box
      sx={{
        minHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 2,
      }}
    >
      <CheckCircleOutlineIcon sx={{ fontSize: 90, color: "success.main" }} />
      <Typography variant="h4" fontWeight={700}>
        Booking Confirmed!
      </Typography>
      <Typography variant="body1" color="text.secondary" maxWidth={400}>
        Thank you for booking with Nivas Beauty Enhancement. Your appointment details have been shared via email.
      </Typography>
      <Button
        variant="contained"
        sx={{ mt: 3, px: 4, borderRadius: "8px" }}
        onClick={() => navigate("/services")}
      >
        Continue Browsing
      </Button>
    </Box>
  );
}
