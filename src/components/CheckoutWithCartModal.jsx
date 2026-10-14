import React, { useState } from "react";
import {
  Box,
  Button,
  Modal,
  Typography,
  IconButton,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import Cart from "../pages/Cart"; // your existing cart component

const CheckoutWithCartModal = ({open, setOpen}) => {

  return (
    <>
      <Modal open={open} onClose={() => setOpen(false)}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "90%", md: "70%" },
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 24,
            maxHeight: "80vh",
            overflowY: "auto",
            p: 3,
          }}
        >
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography variant="h6" fontWeight={700}>
              Review your  Cart
            </Typography>
            <IconButton onClick={() => setOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Divider sx={{ mb: 2 }} />
          <Cart noButtons={true}/>
        </Box>
      </Modal>
    </>
  );
};

export default CheckoutWithCartModal;
