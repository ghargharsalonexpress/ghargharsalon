/**
 * Razorpay Checkout (plan C9): UPI intent/QR, cards, netbanking and wallets in Razorpay's own
 * sheet. Loaded only when a customer pays. The result is verified on our server; nothing here
 * decides that a payment succeeded.
 */
interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: "INR";
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  handler: (response: RazorpayResponse) => void;
  modal: { ondismiss: () => void; confirm_close: boolean };
}

type RazorpayConstructor = new (options: RazorpayOptions) => { open: () => void; on: (event: "payment.failed", handler: () => void) => void };

let loading: Promise<RazorpayConstructor> | null = null;

function loadCheckout(): Promise<RazorpayConstructor> {
  const existing = (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay;
  if (existing) return Promise.resolve(existing);
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      const loaded = (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay;
      if (loaded) resolve(loaded);
      else reject(new Error("Razorpay missing"));
    };
    script.onerror = () => {
      loading = null;
      reject(new Error("Razorpay failed to load"));
    };
    document.head.append(script);
  });
  return loading;
}

export type CheckoutResult = { status: "paid"; orderId: string; paymentId: string; signature: string } | { status: "dismissed" };

export async function openRazorpay(input: { keyId: string; orderId: string; amountPaise: number; brandName: string; description: string; customer: { name: string; email: string; phone: string }; color: string }): Promise<CheckoutResult> {
  const Razorpay = await loadCheckout();
  return new Promise((resolve) => {
    const checkout = new Razorpay({
      key: input.keyId,
      order_id: input.orderId,
      amount: input.amountPaise,
      currency: "INR",
      name: input.brandName,
      description: input.description,
      prefill: { name: input.customer.name, email: input.customer.email, contact: `+91${input.customer.phone}` },
      theme: { color: input.color },
      handler: (response) => resolve({ status: "paid", orderId: response.razorpay_order_id, paymentId: response.razorpay_payment_id, signature: response.razorpay_signature }),
      // Closing the sheet keeps the booking unpaid until it expires; the customer can try again.
      modal: { ondismiss: () => resolve({ status: "dismissed" }), confirm_close: true },
    });
    checkout.open();
  });
}
