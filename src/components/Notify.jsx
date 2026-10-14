import { Box, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

// SUCCESS
export const SuccessMessage = () => {
  const navigate = useNavigate();

  return (
    <Box textAlign="center" py={10}>
      <Typography variant="h4" fontWeight={700} color="success.main" mb={2}>
        Booking Successful!
      </Typography>

      <Typography variant="body1" color="text.secondary" mb={4}>
        Your booking has been submitted and a confirmation email has been sent.
      </Typography>

      <Button
        variant="contained"
        onClick={() => navigate("/all-services")}   // ⬅ Back to Checkout
        sx={{ px: 4, py: 1.2, borderRadius: 2 }}
      >
        Make Another Booking
      </Button>
    </Box>
  );
};


// ERROR
export const ErrorMessage = () => {
  const navigate = useNavigate();

  return (
    <Box textAlign="center" py={10}>
      <Typography variant="h4" fontWeight={700} color="error.main" mb={2}>
        Email Could Not Be Sent
      </Typography>

      <Typography variant="body1" color="text.secondary" mb={2}>
        We could not send your booking confirmation email at the moment.
      </Typography>

      <Typography variant="body1" fontWeight={600} mb={4}>
        You can contact us at:<br />
        <span style={{ color: "#000" }}>support@niwassalonexpress.com</span>
      </Typography>

      <Button
        variant="outlined"
        onClick={() => navigate("/cart")}  // ⬅ Back to Checkout
        sx={{ px: 4, py: 1.2, borderRadius: 2 }}
      >
        Try Again
      </Button>
    </Box>
  );
};
