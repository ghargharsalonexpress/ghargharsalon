import { createSlice } from "@reduxjs/toolkit";

const safeLoad = () => {
  try {
    const data = JSON.parse(localStorage.getItem("cart"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

const safeSave = (items) => {
  try {
    localStorage.setItem("cart", JSON.stringify(items));
  } catch {}
};

const initialState = {
  items: safeLoad(),
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem: (state, { payload }) => {
      const existing = state.items.find((x) => x.id === payload.id);

      if (existing) {
        existing.qty += 1; // increment qty if already present
      } else {
        state.items.push({
          id: payload.id,
          title: payload.title,
          price: payload.price,
          oldPrice: payload.oldPrice,
          image: payload.image,
          duration: payload.duration,
          qty: 1,
        });
      }

      safeSave(state.items);
    },

    removeItem: (state, { payload }) => {
      state.items = state.items.filter((x) => x.id !== payload);
      safeSave(state.items);
    },

    updateQty: (state, { payload }) => {
      const { id, qty } = payload;
      const item = state.items.find((x) => x.id === id);

      if (item) {
        item.qty = Math.max(1, qty);
        safeSave(state.items);
      }
    },

    clearCart: (state) => {
      state.items = [];
      safeSave([]);
    },
  },
});

export const selectCartItems = (state) => state.cart.items;

export const selectCartTotals = (state) => {
  const subtotal = state.cart.items.reduce(
    (sum, i) => sum + i.price * i.qty,
    0
  );

  const totalQty = state.cart.items.reduce((sum, i) => sum + i.qty, 0);

  const savings = state.cart.items.reduce(
    (sum, i) => sum + (i.oldPrice - i.price) * i.qty,
    0
  );

  return { subtotal, totalQty, savings };
};

export const { addItem, removeItem, updateQty, clearCart } =
  cartSlice.actions;

export default cartSlice.reducer;
