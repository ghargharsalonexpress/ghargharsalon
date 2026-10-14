import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { Button, InlineAlert, ResponsiveDialog } from "@/design-system";
import { formatMoney } from "@/lib/format";

export type TestChoice = "success" | "failure" | "dismissed";
export interface TestOrder {
  number: string;
  amountPaise: number;
  resolve: (choice: TestChoice) => void;
}

/** Development stand-in for Razorpay Checkout. No real money moves. */
export function TestPaymentSheet({ order }: { order: TestOrder }) {
  const { t, i18n } = useTranslation("booking");
  const { tokens } = useTheme();
  const amount = formatMoney(order.amountPaise, i18n.language);

  return (
    <ResponsiveDialog
      open
      onClose={() => order.resolve("dismissed")}
      title={t("testPay.title")}
      description={t("testPay.description")}
      actions={
        <>
          <Button variant="secondary" onClick={() => order.resolve("failure")}>
            {t("testPay.fail")}
          </Button>
          <Button onClick={() => order.resolve("success")}>{t("testPay.pay", { amount })}</Button>
        </>
      }
    >
      <Box sx={{ display: "grid", gap: 4 }}>
        <Box sx={{ p: 5, border: `1px solid ${tokens.neutral[200]}`, borderRadius: `${tokens.radius.md}px`, display: "grid", gap: 1 }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("testPay.booking", { number: order.number })}
          </Typography>
          <Typography variant="numericXl" component="p" sx={{ m: 0 }}>
            {amount}
          </Typography>
        </Box>
        <InlineAlert tone="info">{t("testPay.note")}</InlineAlert>
      </Box>
    </ResponsiveDialog>
  );
}
