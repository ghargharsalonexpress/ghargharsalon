import { type ReactNode, useEffect, useState } from "react";
import type { ProSelfDto } from "@brand/shared";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button, InlineAlert, ResponsiveDialog, SelectField } from "@/design-system";
import { errorText } from "@/lib/errors";
import { iosVersion, platform, pushSupported, useInstallPrompt } from "@/lib/pwa";
import { currentFix, DeviceError, proMeQuery, sendTestAlert, subscribeToAlerts } from "./api";
import { locationPermission, type Readiness, setDeviceFlag, useLocationPermission, useNotificationPermission } from "./readiness";

/** One row: status, what and why, and the single action that moves it forward. */
function Step({ index, done, title, body, action, children }: { index: number; done: boolean; title: string; body: ReactNode; action?: ReactNode; children?: ReactNode }) {
  const { tokens } = useTheme();
  return (
    <Box component="li" sx={{ display: "grid", gridTemplateColumns: "32px minmax(0, 1fr)", gap: 3, py: 4, "& + &": { borderTop: `1px solid ${tokens.neutral[200]}` } }}>
      <Box
        aria-hidden
        sx={{
          width: 32,
          height: 32,
          borderRadius: `${tokens.radius.full}px`,
          display: "grid",
          placeItems: "center",
          typography: "label",
          fontWeight: 600,
          bgcolor: done ? tokens.semantic.success.bg : tokens.neutral[100],
          color: done ? tokens.semantic.success.fg : tokens.neutral[700],
        }}
      >
        {done ? <CheckCircleOutlined fontSize="small" /> : index}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography component="h3" sx={{ typography: "body1", fontWeight: 600 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5, color: "text.secondary" }}>
          {body}
        </Typography>
        {children}
        {action && <Box sx={{ mt: 3 }}>{action}</Box>}
      </Box>
    </Box>
  );
}

export function ReadinessChecklist({ me, readiness }: { me: ProSelfDto; readiness: Readiness }) {
  const { t } = useTranslation("pro");
  const { tokens } = useTheme();
  const steps = [readiness.install, readiness.alerts, readiness.location, readiness.battery];
  const done = steps.filter(Boolean).length;

  return (
    <Box component="section" aria-labelledby="readiness-title" sx={{ bgcolor: tokens.neutral[0], border: `1px solid ${tokens.neutral[200]}`, borderRadius: `${tokens.radius.md}px`, px: { xs: 4, sm: 5 }, pt: 5 }}>
      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 3 }}>
        <Typography id="readiness-title" variant="h2" sx={{ typography: "h3" }}>
          {t("readiness.title")}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
          {t("readiness.progress", { done, total: steps.length })}
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
        {t("readiness.lead")}
      </Typography>
      <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, mt: 2 }}>
        <InstallStep done={readiness.install} />
        <AlertsStep me={me} done={readiness.alerts} />
        <LocationStep done={readiness.location} />
        <BatteryStep done={readiness.battery} />
      </Box>
    </Box>
  );
}

function InstallStep({ done }: { done: boolean }) {
  const { t } = useTranslation("pro");
  const install = useInstallPrompt();
  const device = platform();
  const [iosHelp, setIosHelp] = useState(false);

  if (done) {
    return <Step index={1} done title={t("readiness.install.title")} body={device === "desktop" && !window.matchMedia("(display-mode: standalone)").matches ? t("readiness.install.desktop") : t("readiness.install.done")} />;
  }
  if (device === "ios") {
    return (
      <Step
        index={1}
        done={false}
        title={t("readiness.install.title")}
        body={t("readiness.install.iosBody")}
        action={
          <Button variant="secondary" onClick={() => setIosHelp(true)}>
            {t("readiness.install.iosHow")}
          </Button>
        }
      >
        <ResponsiveDialog open={iosHelp} onClose={() => setIosHelp(false)} title={t("readiness.install.iosHow")} actions={<Button onClick={() => setIosHelp(false)}>{t("readiness.gotIt")}</Button>}>
          <Box component="ol" sx={{ m: 0, pl: 5, display: "grid", gap: 2 }}>
            {(["one", "two", "three"] as const).map((key) => (
              <Typography component="li" key={key}>
                {t(`readiness.install.ios.${key}`)}
              </Typography>
            ))}
          </Box>
          {(iosVersion() ?? 99) < 16.4 && (
            <Box sx={{ mt: 4 }}>
              <InlineAlert tone="warning">{t("readiness.install.iosOld")}</InlineAlert>
            </Box>
          )}
        </ResponsiveDialog>
      </Step>
    );
  }
  return (
    <Step
      index={1}
      done={false}
      title={t("readiness.install.title")}
      body={install.available ? t("readiness.install.androidBody") : t("readiness.install.androidMenu")}
      action={install.available ? <Button onClick={() => void install.prompt()}>{t("readiness.install.action")}</Button> : undefined}
    />
  );
}

function AlertsStep({ me, done }: { me: ProSelfDto; done: boolean }) {
  const { t } = useTranslation("pro");
  const queryClient = useQueryClient();
  const permission = useNotificationPermission();
  const device = platform();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [asking, setAsking] = useState(false);

  // When the panel is open, the worker tells us the test alert arrived: no need to ask.
  useEffect(() => {
    if (!asking || !("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent<{ type?: string; payload?: { kind?: string } }>) => {
      if (event.data?.type === "push" && event.data.payload?.kind === "test") {
        setDeviceFlag("pro:alertTested", true);
        setAsking(false);
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [asking]);

  const title = t("readiness.alerts.title");
  if (done) return <Step index={2} done title={title} body={t("readiness.alerts.done")} />;
  if (me.vapidPublicKey === null) return <Step index={2} done={false} title={title} body={t("readiness.alerts.serverOff")} />;
  if (!pushSupported()) return <Step index={2} done={false} title={title} body={device === "ios" ? t("readiness.alerts.iosInstallFirst") : t("readiness.alerts.unsupported")} />;
  if (permission === "denied") return <Step index={2} done={false} title={title} body={device === "ios" ? t("readiness.alerts.deniedIos") : t("readiness.alerts.denied")} />;

  const deviceMessage = (failure: unknown) =>
    failure instanceof DeviceError ? t(`readiness.alerts.error.${failure.reason}`) : errorText(t, failure);

  const testNow = async () => {
    setError(null);
    setBusy(true);
    try {
      const vapidKey = me.vapidPublicKey ?? "";
      await subscribeToAlerts(vapidKey);
      await queryClient.invalidateQueries({ queryKey: proMeQuery.queryKey });
      const result = await sendTestAlert();
      if (result.sent === 0) throw new DeviceError("failed");
      setAsking(true);
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Step
      index={2}
      done={false}
      title={title}
      body={permission === "granted" ? t("readiness.alerts.testBody") : t("readiness.alerts.allowBody")}
      action={
        asking ? undefined : (
          <Button onClick={() => void testNow()} loading={busy}>
            {permission === "granted" ? t("readiness.alerts.test") : t("readiness.alerts.allow")}
          </Button>
        )
      }
    >
      {error ? (
        <Box sx={{ mt: 3 }}>
          <InlineAlert tone="danger">{deviceMessage(error)}</InlineAlert>
        </Box>
      ) : null}
      {asking && (
        <Box role="status" sx={{ mt: 3, display: "grid", gap: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {t("readiness.alerts.didArrive")}
          </Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Button
              onClick={() => {
                setDeviceFlag("pro:alertTested", true);
                setAsking(false);
              }}
            >
              {t("readiness.alerts.yes")}
            </Button>
            <Button variant="secondary" onClick={() => setAsking(false)}>
              {t("readiness.alerts.no")}
            </Button>
          </Box>
        </Box>
      )}
    </Step>
  );
}

function LocationStep({ done }: { done: boolean }) {
  const { t } = useTranslation("pro");
  const permission = useLocationPermission();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<DeviceError | null>(null);
  const title = t("readiness.location.title");

  if (done) return <Step index={3} done title={title} body={t("readiness.location.done")} />;
  if (permission === "unsupported") return <Step index={3} done={false} title={title} body={t("readiness.location.unsupported")} />;
  if (permission === "denied") return <Step index={3} done={false} title={title} body={t("readiness.location.denied")} />;

  const allow = async () => {
    setError(null);
    setBusy(true);
    try {
      await currentFix();
      locationPermission.set("granted");
    } catch (failure) {
      if (failure instanceof DeviceError && failure.reason === "denied") locationPermission.set("denied");
      setError(failure instanceof DeviceError ? failure : new DeviceError("failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Step
      index={3}
      done={false}
      title={title}
      body={t("readiness.location.body")}
      action={
        <Button onClick={() => void allow()} loading={busy}>
          {t("readiness.location.allow")}
        </Button>
      }
    >
      {error && error.reason !== "denied" && (
        <Box sx={{ mt: 3 }}>
          <InlineAlert tone="danger">{t(`readiness.location.error.${error.reason}`)}</InlineAlert>
        </Box>
      )}
    </Step>
  );
}

const PHONE_BRANDS = ["xiaomi", "samsung", "oppo", "vivo", "other", "iphone"] as const;
type PhoneBrand = (typeof PHONE_BRANDS)[number];

/** Best guess from the phone model; Chrome hides the model in the UA, so ask Client Hints. */
async function guessBrand(): Promise<PhoneBrand> {
  if (platform() === "ios") return "iphone";
  let model = navigator.userAgent;
  const hints = (navigator as Navigator & { userAgentData?: { getHighEntropyValues: (keys: string[]) => Promise<{ model?: string }> } }).userAgentData;
  if (hints) model = `${model} ${(await hints.getHighEntropyValues(["model"]).catch(() => ({ model: "" }))).model ?? ""}`;
  if (/redmi|xiaomi|poco|\bmi \d|\b2\d{3}[a-z0-9]{3,}\b/i.test(model)) return "xiaomi";
  if (/\bSM-|samsung|galaxy/i.test(model)) return "samsung";
  if (/oppo|cph\d|realme|rmx\d|oneplus/i.test(model)) return "oppo";
  if (/vivo|\bV2\d{3}/i.test(model)) return "vivo";
  return "other";
}

function BatteryStep({ done }: { done: boolean }) {
  const { t } = useTranslation("pro");
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState<PhoneBrand>("other");
  const title = t("readiness.battery.title");

  if (done) return <Step index={4} done title={title} body={t("readiness.battery.done")} />;

  return (
    <Step
      index={4}
      done={false}
      title={title}
      body={t("readiness.battery.body")}
      action={
        <Button
          variant="secondary"
          onClick={() => {
            void guessBrand().then(setBrand);
            setOpen(true);
          }}
        >
          {t("readiness.battery.show")}
        </Button>
      }
    >
      <ResponsiveDialog
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        description={t("readiness.battery.why")}
        actions={
          <Button
            onClick={() => {
              setDeviceFlag("pro:batteryDone", true);
              setOpen(false);
            }}
          >
            {t("readiness.battery.doneAction")}
          </Button>
        }
      >
        <Box sx={{ display: "grid", gap: 4 }}>
          <SelectField<PhoneBrand>
            label={t("readiness.battery.phone")}
            value={brand}
            onChange={setBrand}
            name="phone-brand"
            options={PHONE_BRANDS.map((value) => ({ value, label: t(`readiness.battery.brands.${value}`) }))}
          />
          <Box component="ol" sx={{ m: 0, pl: 5, display: "grid", gap: 2 }}>
            {(t(`readiness.battery.steps.${brand}`, { returnObjects: true }) as string[]).map((step) => (
              <Typography component="li" key={step}>
                {step}
              </Typography>
            ))}
          </Box>
        </Box>
      </ResponsiveDialog>
    </Step>
  );
}
