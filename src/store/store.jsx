// src/store/store.js
import { configureStore } from "@reduxjs/toolkit";
import cartReducer from "../store/cartSlice";

export const store = configureStore({
  reducer: {
    cart: cartReducer,
  },
  devTools: import.meta.env.MODE !== "production",
});
