import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const PrivacyPolicyModal = ({ open, onClose }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      scroll="paper"
    >
      <DialogTitle sx={{ m: 0, p: 2 }}>
        Privacy Policy
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 12,
            top: 12,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Typography gutterBottom>
          We value your privacy and are committed to protecting your personal
          information. Any details you share, such as your name, phone number,
          address, or booking preferences, are stored securely.
        </Typography>

        <Typography gutterBottom>
          Your information will never be shared or sold to third parties except
          when necessary for booking confirmation, service communication, or
          operational requirements.
        </Typography>

        <Typography gutterBottom>
          By using our services or submitting any form, you agree to receive
          communication regarding your service request or application.
        </Typography>

        <Typography gutterBottom>
          To request data removal or raise privacy concerns, please email:
          <strong> support@yourdomain.com</strong>
        </Typography>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained" sx={{ textTransform: "none" }}>
          I Understand
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PrivacyPolicyModal;
