import {
  Card,
  Box,
  Typography,
  Stack,
  CardMedia,
  Divider,
  Button,
  IconButton,
  useTheme,
} from "@mui/material";

import AccessTimeIcon from "@mui/icons-material/AccessTime";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";

import { useState } from "react";
import ServiceDetailsModal from "./ServiceDetailsModal";
import { useDispatch, useSelector } from "react-redux";
import { addItem, removeItem, updateQty } from "../store/cartSlice";

/* -------------------------------------------------------
   SUB-COMPONENT: Gender Badge
-------------------------------------------------------- */
const GenderBadge = ({ gender, theme }) => {
  if (!gender) return null;

  const genderBg =
    gender === "M"
      ? theme.palette.primary.main
      : theme.palette.secondary.main;

  return (
    <Box
      sx={{
        position: "absolute",
        top: 10,
        left: 10,
        px: 1,
        py: "2px",
        borderRadius: "12px",
        backgroundColor: genderBg,
        color: theme.palette.common.white,
        fontSize: "0.7rem",
        fontWeight: 700,
        zIndex: 20,
      }}
    >
      {gender}
    </Box>
  );
};

/* -------------------------------------------------------
   SUB-COMPONENT: Price Block
-------------------------------------------------------- */
const PriceBlock = ({ price, oldPrice, discountPercent, theme }) => (
  <Stack direction="row" spacing={1} alignItems="center">
    <Typography variant="h6" fontWeight={700} color={theme.palette.primary.dark}>
      ₹{price}
    </Typography>

    {oldPrice && (
      <Typography
        variant="body2"
        sx={{
          textDecoration: "line-through",
          color: theme.palette.text.disabled,
        }}
      >
        ₹{oldPrice}
      </Typography>
    )}

    {discountPercent && (
      <Typography
        variant="body2"
        sx={{ color: theme.palette.success.main, fontWeight: 600 }}
      >
        {discountPercent}% OFF
      </Typography>
    )}
  </Stack>
);

/* -------------------------------------------------------
   SUB-COMPONENT: Tier Price (Starts From)
-------------------------------------------------------- */
const StartsFromPrice = ({ startsFrom, theme }) => (
  <Typography
    variant="h6"
    fontWeight={700}
    color={theme.palette.primary.dark}
  >
    Starts at ₹{startsFrom}
  </Typography>
);

/* -------------------------------------------------------
   SUB-COMPONENT: Add / Qty Buttons
-------------------------------------------------------- */
const QtyControls = ({ qty, id, dispatch, theme }) => (
  <Box
    sx={{
      flex: 1,
      height: 40,
      borderRadius: 2,
      border: `1px solid ${theme.palette.divider}`,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      px: 1.2,
    }}
  >
    <IconButton
      size="small"
      onClick={() =>
        qty === 1
          ? dispatch(removeItem(id))
          : dispatch(updateQty({ id, qty: qty - 1 }))
      }
      sx={{ color: theme.palette.primary.main }}
    >
      <RemoveIcon fontSize="small" />
    </IconButton>

    <Typography fontWeight={700}>{qty}</Typography>

    <IconButton
      size="small"
      onClick={() => dispatch(updateQty({ id, qty: qty + 1 }))}
      sx={{ color: theme.palette.primary.main }}
    >
      <AddIcon fontSize="small" />
    </IconButton>
  </Box>
);

/* -------------------------------------------------------
   SUB-COMPONENT: Eco Card Layout
-------------------------------------------------------- */
const EcoCard = ({ data, theme }) => (
  <>
    <CardMedia
      component="img"
      src={data.image}
      alt={data.title}
      sx={{
        width: "100%",
        height: 180,
        objectFit: "cover",
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
      }}
    />

    <Box sx={{ p: 2, flex: 1, display: "flex", flexDirection: "column" }}>
      <Typography variant="h6" fontWeight={700}>
        {data.title}
      </Typography>

      <Typography variant="body2" color="text.secondary" mb={1}>
        {data.subtitle}
      </Typography>

      {data.hasTiers ? (
        <StartsFromPrice startsFrom={data.startsFrom} theme={theme} />
      ) : (
        <PriceBlock
          price={data.price}
          oldPrice={data.oldPrice}
          discountPercent={data.discountPercent}
          theme={theme}
        />
      )}

      {data.duration && (
        <Stack direction="row" spacing={0.6} mt={0.3}>
          <AccessTimeIcon sx={{ fontSize: 16, color: "text.secondary" }} />
          <Typography variant="body2" color="text.secondary">
            {data.duration}
          </Typography>
        </Stack>
      )}
    </Box>
  </>
);

/* -------------------------------------------------------
   SUB-COMPONENT: Mini Card Layout
-------------------------------------------------------- */
const MiniCard = ({ data, miniImg, theme }) => (
  <Box sx={{ p: 2, flex: 1 }}>
    <Stack direction="row" spacing={2}>
      {miniImg && (
        <CardMedia
          component="img"
          src={miniImg}
          alt={data.title}
          sx={{
            width: 90,
            height: 90,
            objectFit: "cover",
            borderRadius: 2,
            backgroundColor: theme.palette.background.default,
          }}
        />
      )}

      <Box sx={{ flex: 1 }}>
        <Typography variant="h6" fontWeight={700}>
          {data.title}
        </Typography>

        <Typography variant="body2" color="text.secondary" mb={1}>
          {data.subtitle}
        </Typography>

        {data.hasTiers ? (
          <StartsFromPrice startsFrom={data.startsFrom} theme={theme} />
        ) : (
          <PriceBlock
            price={data.price}
            oldPrice={data.oldPrice}
            discountPercent={data.discountPercent}
            theme={theme}
          />
        )}
      </Box>
    </Stack>
  </Box>
);

/* -------------------------------------------------------
   MAIN COMPONENT
-------------------------------------------------------- */
const ServiceCard = ({ data, noModalImage }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);

  const item = useSelector((state) =>
    state.cart.items.find((i) => i.id === data.id)
  );

  const qty = item?.qty || 0;
  const isEcoCard = Boolean(data.avatar && data.avatar.trim() !== "");
  const miniImg = data.miniAvatar || data.avatar;

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 2,
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: `0 2px 8px ${theme.palette.secondary.main}22`,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        position: "relative",
        transition: "0.25s ease",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: `0 4px 16px ${theme.palette.secondary.main}33`,
        },
      }}
    >
      {/* Gender Badge */}
      <GenderBadge gender={data.gender} theme={theme} />

      {/* Layout */}
      {isEcoCard ? (
        <EcoCard data={data} theme={theme} />
      ) : (
        <MiniCard data={data} miniImg={miniImg} theme={theme} />
      )}

      <Divider sx={{ borderColor: theme.palette.divider }} />

      {/* Footer Buttons */}
      <Box sx={{ width: "75%", ml: "auto" }}>
        <Box
          sx={{
            p: 1.5,
            display: "flex",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Button
            variant="outlined"
            onClick={() => setOpen(true)}
            sx={{
              flex: 1,
              height: 40,
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
              borderColor: theme.palette.primary.main,
              color: theme.palette.primary.main,
            }}
          >
            View Details
          </Button>

          {qty < 1 ? (
            <Button
              variant="contained"
              onClick={() => {
                if (data.hasTiers) {
                  // OPEN MODAL INSTEAD OF ADDING
                  setOpen(true);
                } else {
                  dispatch(addItem(data));
                }
              }}
              sx={{
                flex: 1,
                height: 40,
                textTransform: "none",
                fontWeight: 600,
                borderRadius: 2,
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                "&:hover": {
                  backgroundColor: theme.palette.primary.dark,
                },
              }}
            >
              Add
            </Button>
          ) : (
            <QtyControls qty={qty} id={data.id} dispatch={dispatch} theme={theme} />
          )}
        </Box>
      </Box>

      <ServiceDetailsModal
        open={open}
        onClose={() => setOpen(false)}
        service={data}
        noModalImage={noModalImage}
      />
    </Card>
  );
};

export default ServiceCard;
