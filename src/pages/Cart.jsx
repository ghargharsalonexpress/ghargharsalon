import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  TextField,
  Stack,
  Divider,
  Button,
} from "@mui/material";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import { useSelector, useDispatch } from "react-redux";
import {
  selectCartItems,
  selectCartTotals,
  removeItem,
  updateQty,
  clearCart,
} from "../store/cartSlice";
import QtyCounter from "../components/utils/QtyButton";
import { useNavigate } from "react-router-dom";

const fmt = (n) => `₹${n.toLocaleString("en-IN")}`;

export default function Cart({ noButtons }) {
  const items = useSelector(selectCartItems);
  const totals = useSelector(selectCartTotals);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  if (items.length === 0)
    return (
      <Box sx={{ py: 10, textAlign: "center" }}>
        <Typography color="text.secondary" variant="h6">
          Your cart is empty.
        </Typography>
      </Box>
    );

  return (
    <Box sx={{ px: { xs: 2, md: 8 }, py: 6 }}>
      <Typography variant="h4" fontWeight={700} mb={4}>
        My Cart
      </Typography>

      <Stack spacing={3}>
        {items.map((it) => (
          <Card
            key={it.id}
            sx={{
              p: 2,
              border: "1px solid #eee",
              borderRadius: "16px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              {it.image && (
                <CardMedia
                  component="img"
                  src={it.image}
                  alt={it.title}
                  sx={{
                    width: { xs: "100%", sm: 120 },
                    height: 120,
                    borderRadius: 2,
                    objectFit: "cover",
                  }}
                />
              )}

              <CardContent sx={{ flex: 1, position: "relative" }}>
                <Typography variant="h6" fontWeight={700}>
                  {it.title}
                </Typography>
                <Typography color="text.secondary" mb={1}>
                  {it.subtitle}
                </Typography>

                {/* Price + discount row */}
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="h6">{fmt(it.price)}</Typography>
                  {it.oldPrice && (
                    <Typography
                      sx={{
                        textDecoration: "line-through",
                        color: "text.disabled",
                        fontSize: "0.9rem",
                      }}
                    >
                      {fmt(it.oldPrice)}
                    </Typography>
                  )}
                  {it.discountPercent && (
                    <Typography
                      color="green"
                      fontWeight={600}
                      fontSize="0.9rem"
                    >
                      {it.discountPercent}% OFF
                    </Typography>
                  )}
                </Stack>

                {/* Qty + delete */}
                <Stack direction="row" alignItems="center" spacing={1.5} mt={2}>
                  <QtyCounter
                    qty={it.qty}
                    onIncrease={() => dispatch(updateQty({ id: it.id, qty: it.qty + 1 }))}
                    onDecrease={() =>
                      it.qty === 1
                        ? dispatch(removeItem(it.id))
                        : dispatch(updateQty({ id: it.id, qty: it.qty - 1 }))
                    }
                  />
                  <IconButton
                    onClick={() => dispatch(removeItem(it.id))}
                    color="error"
                    sx={{
                      "&:hover": {
                        backgroundColor: "rgba(255,0,0,0.05)",
                      },
                    }}
                  >
                    <DeleteOutline />
                  </IconButton>
                </Stack>

                {/* ✅ Total bottom-right */}
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 8,
                    right: 16,
                    textAlign: "right",
                  }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 0.5 }}
                  >
                    Total
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    color="text.primary"
                  >
                    {fmt(it.price * it.qty)}
                  </Typography>
                </Box>
              </CardContent>
            </Stack>
          </Card>
        ))}
      </Stack>

      <Divider sx={{ my: 4 }} />

      {/* Footer summary - Receipt Style */}
      <Box
        sx={{
          maxWidth: 320,
          ml: "auto",
          mt: 4,
          p: 2,
          borderRadius: 2,
          border: "1px solid #ddd",
          backgroundColor: "#fafafa",
        }}
      >

        <Typography variant="h6" fontWeight={700} mb={1}>
          Order Summary
        </Typography>

        {/* Table Rows */}
        <Stack spacing={1.2}>
          {/* Subtotal */}
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography color="text.secondary">Subtotal</Typography>
            <Typography>{fmt(totals.subtotal)}</Typography>
          </Box>

          {/* GST */}
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography color="text.secondary">GST (5%)</Typography>
            <Typography>{fmt((totals.subtotal * 0.05).toFixed(2))}</Typography>
          </Box>

          {/* Platform Fee */}
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography color="text.secondary">Platform Fee</Typography>
            <Typography>₹11</Typography>
          </Box>

          <Divider sx={{ my: 1 }} />

          {/* Grand Total */}
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography fontWeight={700}>Grand Total</Typography>
            <Typography fontWeight={700}>
              {fmt((totals.subtotal + totals.subtotal * 0.05 + 11).toFixed(2))}
            </Typography>
          </Box>
        </Stack>

        {/* Buttons */}
        {!noButtons && (
          <Stack direction="row" spacing={2} mt={3}>
            <Button
              variant="outlined"
              onClick={() => dispatch(clearCart())}
              sx={{ textTransform: "none", borderRadius: "8px" }}
            >
              Clear Cart
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate("/book-service")}
              sx={{
                textTransform: "none",
                borderRadius: "8px",
                px: 3,
              }}
            >
              Checkout
            </Button>
          </Stack>
        )}
      </Box>
    </Box>
  );
}
