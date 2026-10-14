import React, { useState } from 'react';
import DynamicForm from '../components/DynamicForm';
import CheckoutWithCartModal from '../components/CheckoutWithCartModal';
import { Button, Tooltip } from '@mui/material';
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import { useBookingSubmit } from '../api/useBookingSubmit';
import Loader from '../components/Loader';

function Checkout() {

  const [open, setOpen] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const {
    submit,
    validateYup,
    loading,
    success,
    serverMessage,
  } = useBookingSubmit();

  // ---------------------------
  // FORM LAYOUT
  // ---------------------------
  const layout = [
    {
      cols: 2,
      fields: [
        { name: "firstName", label: "First Name", type: "text", required: true },
        { name: "lastName", label: "Last Name", type: "text", required: true },
      ],
    },
    {
      cols: 2,
      fields: [
        { name: "email", label: "Email", type: "email", required: true },
        { name: "phone", label: "Phone Number", type: "number", required: true },
      ],
    },
    {
      cols: 3,
      fields: [
        { name: "houseNumber", label: "House / Flat Number", type: "text", required: true },
        { name: "street", label: "Street / Locality", type: "text", required: true },
        { name: "landmark", label: "Nearby Landmark", type: "text" },
        { name: "city", label: "City", type: "text", required: true },
        {
          name: "state",
          label: "State",
          type: "select",
          required: true,
          options: [
            { label: "Delhi", value: "Delhi" },
            { label: "Uttar Pradesh", value: "UP" },
            { label: "Haryana", value: "Haryana" },
            { label: "Maharashtra", value: "Maharashtra" },
            { label: "Karnataka", value: "Karnataka" },
            { label: "Other", value: "Other" },
          ],
        },
        { name: "pincode", label: "Pin Code", type: "text", required: true },
        {
          name: "addressType",
          label: "Address Type",
          type: "select",
          required: true,
          options: [
            { label: "Home", value: "home" },
            { label: "Office", value: "office" },
            { label: "Other", value: "other" },
          ],
        },
        { name: "specialInstructions", label: "Special Instructions", type: "textarea" },
      ],
    },
  ];

  // ---------------------------
  // FORM SUBMIT HANDLER
  // ---------------------------
  const handleSubmit = async (data) => {

    const yupErrors = await validateYup(data);
    if (Object.keys(yupErrors).length > 0) {
      setFormErrors(yupErrors);
      return;
    }

    const result = await submit(data);

    if (!result.success) {
      setFormErrors(result.errors || {});
      return;
    }
  };

  if (loading) return <Loader />;

  // ---------------------------
  // RESET FUNCTION
  // ---------------------------
  const resetAll = () => {
    setOpen(false);
    setFormErrors({})
  };

  return (
    <>
      {open && <CheckoutWithCartModal open={open} setOpen={setOpen} />}

      {/* Floating Cart Button */}
      <Tooltip title="Review Cart" arrow placement="left">
        <Button
          variant="contained"
          color="primary"
          onClick={() => setOpen(true)}
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: "50%",
            boxShadow: 4,
            zIndex: 1200,
            p: 0,
          }}
        >
          <ShoppingCartOutlinedIcon sx={{ fontSize: 28, color: "#fff" }} />
        </Button>
      </Tooltip>

      <DynamicForm
        title="Add Your Address Details"
        subtitle="Please provide your contact and address information to confirm your home salon booking."
        layout={layout}
        buttonLabel="Confirm Booking"
        externalErrors={formErrors}
        onSubmit={handleSubmit}
        success={success}
        serverMessage={serverMessage}
        onReset={resetAll}
      />
    </>
  );
}

export default Checkout;
