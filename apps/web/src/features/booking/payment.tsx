import { useState } from "react";
import type { BookingDto, BookingPaymentDto } from "@brand/shared";
import { useTheme } from "@mui/material/styles";
import { useCurrentUser } from "@/app/session";
import { brand } from "@/brand";
import { openRazorpay } from "@/lib/razorpay";
import { localPay, verifyPayment } from "./api";
import { type TestChoice, type TestOrder, TestPaymentSheet } from "./TestPaymentSheet";

export type PaymentOutcome = { status: "paid"; booking: BookingDto } | { status: "dismissed" } | { status: "failed" };

/**
 * Takes a booking's order to a payment sheet and confirms the result with our server (plan C9,
 * W4). Razorpay Checkout when the keys are set; otherwise the local test sheet, so the whole
 * flow runs on a laptop. Only the server's verification moves a booking to "searching".
 */
export function usePaymentSheet() {
  const { tokens } = useTheme();
  const user = useCurrentUser();
  const [testOrder, setTestOrder] = useState<TestOrder | null>(null);

  const pay = async (booking: { id: string; number: string }, payment: BookingPaymentDto): Promise<PaymentOutcome> => {
    if (payment.provider === "razorpay" && payment.keyId) {
      const result = await openRazorpay({
        keyId: payment.keyId,
        orderId: payment.orderId,
        amountPaise: payment.amountPaise,
        brandName: brand.name,
        description: booking.number,
        customer: { name: user?.name ?? "", email: user?.email ?? "", phone: user?.phone ?? "" },
        color: tokens.accent[600],
      });
      if (result.status === "dismissed") return { status: "dismissed" };
      return { status: "paid", booking: await verifyPayment(booking.id, { orderId: result.orderId, paymentId: result.paymentId, signature: result.signature }) };
    }

    const choice = await new Promise<TestChoice>((resolve) => setTestOrder({ number: booking.number, amountPaise: payment.amountPaise, resolve }));
    setTestOrder(null);
    if (choice === "dismissed") return { status: "dismissed" };
    const signed = await localPay(payment.orderId, choice);
    if (choice === "failure") return { status: "failed" };
    return { status: "paid", booking: await verifyPayment(booking.id, { orderId: payment.orderId, ...signed }) };
  };

  const sheet = testOrder ? <TestPaymentSheet order={testOrder} /> : null;
  return { pay, sheet };
}
