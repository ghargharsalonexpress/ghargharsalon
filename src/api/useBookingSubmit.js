import { useState } from "react";
import { useDispatch } from "react-redux";
import * as Yup from "yup";
import { store } from "../store/store";
import { clearCart } from "../store/cartSlice";

import {
  sendEmail,
  bookingAdminHTML,
  bookingUserHTML,
} from "./emailJsService";

/* ------------------ VALIDATION ------------------ */
const bookingSchema = Yup.object().shape({
  firstName: Yup.string().trim().required(),
  lastName: Yup.string().trim().required(),
  email: Yup.string().trim().email().required(),
  phone: Yup.string()
    .required()
    .test("is-valid-phone", "Invalid mobile", (v) => /^[6-9]\d{9}$/.test(v || "")),
  houseNumber: Yup.string().trim().required(),
  street: Yup.string().trim().required(),
  landmark: Yup.string().nullable(),
  city: Yup.string().trim().required(),
  state: Yup.string().trim().required(),
  pincode: Yup.string().required().test("is-valid-pin", "Invalid pin", (v) => /^\d{6}$/.test(v || "")),
  addressType: Yup.string().trim().required(),
  specialInstructions: Yup.string().nullable(),
});

export const useBookingSubmit = () => {
  const [loading, setLoading] = useState(false);
  const [hookErrors, setHookErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [serverMessage, setServerMessage] = useState("");
  const dispatch = useDispatch();

  const validateYup = async (formData) => {
    try {
      await bookingSchema.validate(formData, { abortEarly: false });
      return {};
    } catch (err) {
      const errs = {};
      err.inner.forEach((e) => (errs[e.path] = e.message));
      return errs;
    }
  };

  /* ------------------ SUBMIT ------------------ */
  const submit = async (formData) => {
    setLoading(true);
    setHookErrors({});
    setServerMessage("");

    /* 1️⃣ Validate Form */
    const yupErrors = await validateYup(formData);
    if (Object.keys(yupErrors).length) {
      setHookErrors(yupErrors);
      setLoading(false);
      return { success: false, errors: yupErrors };
    }

    /* 2️⃣ Validate Cart */
    const cart = store.getState().cart.items;
    if (cart.length === 0) {
      setServerMessage("Your cart is empty.");
      setLoading(false);
      return { success: false };
    }

    /* 3️⃣ Build Cart Items */
    const orders = cart.map((item) => ({
      name: item.title,
      units: item.qty,
      price: item.price * item.qty,
    }));

    const subtotal = orders.reduce((s, o) => s + o.price, 0);
    const gst = subtotal * 0.05;
    const platform_fee = 11;
    const total = subtotal + gst + platform_fee;

    /* 4️⃣ Build payloads */
    const adminPayload = {
      order_id: `YM-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      ...formData,
      orders,
      cost: {
        subtotal: subtotal.toFixed(2),
        tax: gst.toFixed(2),
        platform_fee,
        total: total.toFixed(2),
      },
    };

    const userPayload = {
      order_id: adminPayload.order_id,
      firstName: formData.firstName,
      email: formData.email,
      orders: orders.map((o) => ({
        name: o.name,
        units: o.units,
        price: o.price.toFixed(2),
      })),
      cost: adminPayload.cost,
    };

    /* 5️⃣ SEND EMAILS */
    console.log(import.meta.env.VITE_ADMIN_EMAIL);
    try {
      const adminEmail = await sendEmail({
        template: "admin",
        to: import.meta.env.VITE_ADMIN_EMAIL,
        html: bookingAdminHTML(adminPayload),
      });

      if (!adminEmail.success) throw new Error("Admin email failed");

      const userEmail = await sendEmail({
        template: "user",
        to: formData.email,
        html: bookingUserHTML(userPayload),
      });

      if (!userEmail.success) throw new Error("User email failed");

      /* 6️⃣ SUCCESS */
      dispatch(clearCart());
      setSuccess(true);
      setServerMessage("🎉 Booking submitted successfully!");
      setLoading(false);

      return { success: true };
    } catch (err) {
      console.error(err);
      setSuccess(false);
      setServerMessage("We could not send an email right now. Try again later.");
      setLoading(false);
      return { success: false };
    }
  };

  return { submit, validateYup, loading, hookErrors, serverMessage, success };
};
