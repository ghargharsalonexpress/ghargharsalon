import React, { useState } from "react";
import { Box, Typography, Container, Stack, Snackbar, Alert } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { motion } from "framer-motion";
import DynamicForm from "../components/DynamicForm";
import { contactFormHTML, sendEmail } from "../api/emailJsService";

const ContactUs = () => {
  const theme = useTheme();

  // UI STATES
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  /* -----------------------------
        SUBMIT HANDLER
  ------------------------------ */
  const handleContactSubmit = async (formData) => {
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const payload = {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        message: formData.message,
      };

      const html = contactFormHTML(payload);

      const result = await sendEmail({
        template: "contact",
        html,
        to: import.meta.env.VITE_ADMIN_EMAIL,
      });

      if (result.success) {
        setSuccessMsg("Message sent successfully! Our team will contact you shortly.");
        setLoading(false);
        return { success: true };
      } else {
        setErrorMsg(result.error || "Unable to send your message.");
        setLoading(false);
        return { success: false };
      }
    } catch (err) {
      console.error("CONTACT FORM ERROR:", err);
      setErrorMsg("Unexpected error occurred. Please try again.");
      setLoading(false);
      return { success: false };
    }
  };

  /* -----------------------------
        FORM LAYOUT
  ------------------------------ */
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
      cols: 1,
      fields: [
        {
          name: "message",
          label: "How can we help you?",
          type: "textarea",
          required: true,
          isTextArea: true,
        },
      ],
    },
  ];

  /* -----------------------------
        RENDER
  ------------------------------ */
  return (
    <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: theme.palette.background.default }}>
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={8}
          alignItems="flex-start"
        >
          {/* LEFT SIDE — INFO */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            style={{ flex: 1 }}
          >
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: theme.palette.primary.dark,
                mb: 1,
                letterSpacing: "0.5px",
              }}
            >
              / Contact Us
            </Typography>

            <Typography variant="h3" fontWeight={800} lineHeight={1.2} sx={{ mb: 3 }}>
              Get in Touch With
              <br /> Nivas Beauty Enhancement
            </Typography>

            <Typography variant="body1" color="text.secondary" mb={4} maxWidth={420}>
              We're here to help with bookings, inquiries, partnerships, or support.
              Reach out anytime — our team responds quickly.
            </Typography>

            <Stack spacing={4}>
              <Box>
                <Typography variant="h6" fontWeight={700}>Phone</Typography>
                <Typography variant="body1" color="text.secondary">+91 9***6</Typography>
              </Box>

              <Box>
                <Typography variant="h6" fontWeight={700}>Email</Typography>
                <Typography variant="body1" color="text.secondary">
                  support@niwassalonexpress.com
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" fontWeight={700}>Location</Typography>
                <Typography variant="body1" color="text.secondary">
                  Faridabad, Delhi NCR, India
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" fontWeight={700}>Working Hours</Typography>
                <Typography variant="body1" color="text.secondary">
                  Mon – Sun: 8:00 AM – 9:00 PM
                </Typography>
              </Box>
            </Stack>
          </motion.div>

          {/* RIGHT SIDE — FORM */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            style={{ flex: 1, width: "100%" }}
          >
            <DynamicForm
              title="Send Us a Message"
              subtitle="Our team will get back to you as soon as possible."
              layout={layout}
              buttonLabel={loading ? "Sending..." : "Submit"}
              loading={loading}
              onSubmit={handleContactSubmit}
            />
          </motion.div>
        </Stack>
      </Container>

      {/* SUCCESS SNACKBAR */}
      <Snackbar
        open={!!successMsg}
        autoHideDuration={4000}
        onClose={() => setSuccessMsg("")}
      >
        <Alert severity="success" variant="filled">
          {successMsg}
        </Alert>
      </Snackbar>

      {/* ERROR SNACKBAR */}
      <Snackbar
        open={!!errorMsg}
        autoHideDuration={4000}
        onClose={() => setErrorMsg("")}
      >
        <Alert severity="error" variant="filled">
          {errorMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ContactUs;
