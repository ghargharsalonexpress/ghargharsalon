import React, { useMemo } from "react";
import {
  Box,
  Typography,
  CardMedia,
  Dialog,
  DialogContent,
  Button,
  Stack,
  Grid,
  useTheme,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
} from "@mui/material";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";

import { useDispatch, useSelector } from "react-redux";
import { addItem, removeItem, updateQty } from "../store/cartSlice";

import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";

const SafeArray = (arr) => (Array.isArray(arr) ? arr : []);

/* ------------------------------------------------------------------
    REUSABLE SECTION RENDERER (Benefits, Things to Know, Aftercare...)
------------------------------------------------------------------- */
const RenderBulletSection = ({ title, data, theme }) => {
  if (!data || data.length === 0) return null;

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" fontWeight={700} mb={1.5}>
        {title}
      </Typography>

      <Box
        sx={{
          p: 2.5,
          borderRadius: 3,
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: `0 2px 10px ${theme.palette.secondary.main}12`,
        }}
      >
        {data.map((point, i) => (
          <Typography
            key={i}
            variant="body2"
            sx={{
              mb: 0.8,
              display: "flex",
              alignItems: "center",
              color: theme.palette.text.secondary,
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: theme.palette.primary.main,
                mr: 1,
              }}
            />
            {point}
          </Typography>
        ))}
      </Box>
    </Box>
  );
};

/* ------------------------------------------------------------------
    TIER CARD UI (Extracted for cleaner code)
------------------------------------------------------------------- */
const TierCard = ({ tier, theme, dispatch }) => {
  const tierItem = useSelector((state) =>
    state.cart.items.find((i) => i.id === tier.id)
  );
  const tierQty = tierItem?.qty || 0;

  return (
    <Box
      key={tier.id}
      sx={{
        p: 2,
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      {/* LEFT */}
      <Box>
        <Typography variant="subtitle1" fontWeight={700}>
          {tier.label}
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center">
          <Typography fontWeight={700} color="text.primary">
            ₹{tier.price}
          </Typography>

          <Typography
            sx={{
              textDecoration: "line-through",
              color: theme.palette.text.disabled,
            }}
          >
            ₹{tier.oldPrice}
          </Typography>

          <Typography sx={{ color: theme.palette.success.main, fontWeight: 600 }}>
            {tier.discount}% OFF
          </Typography>
        </Stack>

        {tier.duration && (
          <Stack direction="row" spacing={0.5} mt={0.3}>
            <AccessTimeIcon sx={{ fontSize: 16 }} />
            <Typography variant="body2" color="text.secondary">
              {tier.duration}
            </Typography>
          </Stack>
        )}
      </Box>

      {/* RIGHT (Add / Qty Control) */}
      {tierQty < 1 ? (
        <Button
          variant="contained"
          sx={{
            textTransform: "none",
            borderRadius: 2,
            px: 3,
            backgroundColor: theme.palette.primary.main,
          }}
          onClick={() =>
            dispatch(
              addItem({
                id: tier.id,
                title: tier.label,
                price: tier.price,
              })
            )
          }
        >
          Add
        </Button>
      ) : (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
            px: 1,
          }}
        >
          <IconButton
            size="small"
            onClick={() =>
              tierQty === 1
                ? dispatch(removeItem(tier.id))
                : dispatch(updateQty({ id: tier.id, qty: tierQty - 1 }))
            }
          >
            <RemoveIcon />
          </IconButton>

          <Typography fontWeight={700} px={1}>
            {tierQty}
          </Typography>

          <IconButton
            size="small"
            onClick={() =>
              dispatch(updateQty({ id: tier.id, qty: tierQty + 1 }))
            }
          >
            <AddIcon />
          </IconButton>
        </Box>
      )}
    </Box>
  );
};

/* ------------------------------------------------------------------
    MAIN MODAL COMPONENT
------------------------------------------------------------------- */
const ServiceDetailsModal = ({ open, onClose, service, noModalImage }) => {
  const theme = useTheme();
  const dispatch = useDispatch();

  if (!service) return null; // safety fallback

  // Extract values safely
  const {
    bannerIMage,
    title = "",
    subtitle = "",
    price,
    oldPrice,
    discountPercent,
    duration,
    overview = [],
    benefits = [],
    things_to_know = [],
    after_care = [],
    recommendedFor = [],
    faq = [],
    tiers = [],
    image,
    startsFrom
  } = service;

  const item = useSelector((state) =>
    state.cart.items.find((i) => i.id === service.id)
  );
  const qty = item?.qty || 0;
  const hasTiers = Array.isArray(tiers) && tiers.length > 0;

  const safeOverview = SafeArray(overview);
  const safeFAQ = SafeArray(faq);

  /* ------------------------------------------------------------------
      RENDER START
  ------------------------------------------------------------------- */
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      scroll="paper"
      sx={{
        "& .MuiPaper-root": {
          borderRadius: "16px",
          overflow: "hidden",
          backgroundColor: theme.palette.background.paper,
          boxShadow: `0 8px 32px ${theme.palette.primary.main}22`,
          position: "relative",
        },
      }}
    >
      {/* ❌ TOP RIGHT CLOSE BUTTON */}
      <IconButton
        onClick={onClose}
        sx={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 20,
          backgroundColor: theme.palette.background.paper,
          boxShadow: `0 2px 6px ${theme.palette.primary.main}30`,
          "&:hover": {
            backgroundColor: theme.palette.action.hover,
          },
        }}
      >
        <CloseIcon />
      </IconButton>

      <DialogContent sx={{ p: 0, backgroundColor: theme.palette.background.default }}>
        {/* Banner Image */}
        {image && !noModalImage && (
          <CardMedia
            component="img"
            src={bannerIMage}
            alt={title}
            sx={{
              width: "100%",
              height: 260,
              objectFit: "cover",
              borderBottom: `4px solid ${theme.palette.primary.main}`,
            }}
          />
        )}

        {/* Top Section */}
        <Box
          sx={{
            p: { xs: 2.5, sm: 3.5 },
            backgroundColor: theme.palette.background.paper,
            borderBottom: `1px solid ${theme.palette.divider}`,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          {/* Title + Price */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight={700}>
              {title}
            </Typography>

            {subtitle && (
              <Typography variant="body2" color="text.secondary" mb={1}>
                {subtitle}
              </Typography>
            )}

            {/* Price */}
            <Stack direction="row" spacing={1} alignItems="center" mb={1}>
              <Typography variant="h6" fontWeight={700}>
                ₹{price ? price : startsFrom}
              </Typography>

              {oldPrice && (
                <Typography
                  variant="body2"
                  sx={{ textDecoration: "line-through", color: theme.palette.text.disabled }}
                >
                  ₹{oldPrice}
                </Typography>
              )}

              {discountPercent && (
                <Typography variant="body2" sx={{ color: theme.palette.success.main }}>
                  {discountPercent}% OFF
                </Typography>
              )}
            </Stack>

            {/* Duration */}
            {duration && (
              <Stack direction="row" alignItems="center" spacing={1}>
                <AccessTimeIcon sx={{ fontSize: 18, color: theme.palette.text.secondary }} />
                <Typography variant="body2">{duration}</Typography>
              </Stack>
            )}
          </Box>

          {/* CTA */}
          {!hasTiers ? (
            qty < 1 ? (
              <Button
                variant="contained"
                onClick={() => dispatch(addItem(service))}
                sx={{
                  borderRadius: "40px",
                  px: 3,
                  py: 1,
                  fontWeight: 600,
                  textTransform: "none",
                  height: '1%'
                }}
              >
                Add to Cart
              </Button>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  borderRadius: "40px",
                  border: `1px solid ${theme.palette.divider}`,
                  px: 2.5,
                  py: 0.8,
                  height: '1%'
                }}
              >
                <IconButton
                  size="small"
                  onClick={() =>
                    qty === 1
                      ? dispatch(removeItem(service.id))
                      : dispatch(updateQty({ id: service.id, qty: qty - 1 }))
                  }
                >
                  <RemoveIcon fontSize="small" />
                </IconButton>

                <Typography fontWeight={700}>{qty}</Typography>

                <IconButton
                  size="small"
                  onClick={() => dispatch(updateQty({ id: service.id, qty: qty + 1 }))}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Box>
            )
          ) : null}
        </Box>

        {/* Tiers */}
        {hasTiers && (
          <Box sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            <Typography variant="h6" fontWeight={700} mb={1}>
              Choose a Package
            </Typography>

            <Stack spacing={2}>
              {tiers.map((tier) => (
                <TierCard key={tier.id} tier={tier} theme={theme} dispatch={dispatch} />
              ))}
            </Stack>
          </Box>
        )}

        {/* Body Sections */}
        <Box sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          {/* Overview */}
          {safeOverview.length > 0 && (
            <>
              <Typography variant="h6" fontWeight={700} mb={2}>
                Overview
              </Typography>

              <Grid container spacing={2}>
                {safeOverview.map((item, i) => {
                  const isObject = typeof item === "object" && item !== null;
                  const title = isObject ? item.title : "";
                  const desc = isObject ? item.desc : item;

                  return (
                    <Grid item key={i} sx={{ flex: "0 0 260px", maxWidth: "260px" }}>
                      <Box
                        sx={{
                          p: 2.5,
                          borderRadius: 3,
                          textAlign: "center",
                          border: `1px solid ${theme.palette.divider}`,
                          backgroundColor: theme.palette.background.paper,
                          boxShadow: `0 4px 12px ${theme.palette.secondary.main}15`,
                        }}
                      >
                        <CheckCircleIcon sx={{ mb: 1, fontSize: 28, color: theme.palette.primary.main }} />

                        <Typography variant="subtitle2" fontWeight={700}>
                          {title}
                        </Typography>

                        <Typography variant="body2" color="text.secondary">
                          {desc}
                        </Typography>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </>
          )}

          {/* Reusable Sections */}
          <RenderBulletSection title="Benefits" data={benefits} theme={theme} />
          <RenderBulletSection title="Things to Know" data={things_to_know} theme={theme} />
          <RenderBulletSection title="After Care" data={after_care} theme={theme} />
          <RenderBulletSection title="Recommended For" data={recommendedFor} theme={theme} />

          {/* FAQ */}
          {safeFAQ.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" fontWeight={700} mb={1.5}>
                FAQs
              </Typography>

              <Stack gap={1.5}>
                {safeFAQ.map((item, i) => (
                  <Accordion
                    key={i}
                    disableGutters
                    elevation={0}
                    sx={{
                      borderRadius: "12px !important",
                      border: `1px solid ${theme.palette.divider}`,
                      backgroundColor: theme.palette.background.paper,
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography fontWeight={600}>{item.question}</Typography>
                    </AccordionSummary>

                    <AccordionDetails>
                      <Typography variant="body2" color="text.secondary">
                        {item.answer}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Stack>
            </Box>
          )}
        </Box>

        <Divider sx={{ mt: 3 }} />

        {/* Footer */}
        <Box textAlign="center" p={2}>
          <Button variant="text" onClick={onClose} sx={{ textTransform: "none" }}>
            Close
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceDetailsModal;
