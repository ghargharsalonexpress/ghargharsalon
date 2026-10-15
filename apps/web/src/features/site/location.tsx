import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import ExpandMoreOutlined from "@mui/icons-material/ExpandMoreOutlined";
import LocationOffOutlined from "@mui/icons-material/LocationOffOutlined";
import MyLocationOutlined from "@mui/icons-material/MyLocationOutlined";
import PlaceOutlined from "@mui/icons-material/PlaceOutlined";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Container from "@mui/material/Container";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { Button, IconButton, InlineAlert, PhoneField, ResponsiveDialog, TextField } from "@/design-system";
import { currentFix, DeviceError } from "@/lib/device";
import { errorText } from "@/lib/errors";
import { locate, useAreaRequest, useSite } from "./api";
import { initial, LocationContext, type LocationContextValue, store, stored, useVisitorLocation, type VisitorLocation } from "./locationContext";
import { useText } from "./text";

export function LocationProvider({ children }: { children: ReactNode }) {
  const { site } = useSite();
  const [state, setState] = useState<VisitorLocation>(() => stored() ?? initial);
  const [pickerOpen, setPickerOpen] = useState(false);
  const asked = useRef(false);

  const update = useCallback((next: VisitorLocation) => {
    setState(next);
    store(next);
  }, []);

  const detect = useCallback(async () => {
    setState((previous) => ({ ...previous, status: "locating" }));
    try {
      const fix = await currentFix();
      const point = { lat: fix.lat, lng: fix.lng };
      const answer = await locate(point);
      update({ status: answer.served ? "served" : "outside", area: answer.area, point, picked: false });
    } catch (failure) {
      update({ ...initial, status: failure instanceof DeviceError && failure.reason === "denied" ? "denied" : "unavailable" });
    }
  }, [update]);

  // Straight away on arrival, once per visit (Admin → Website → Location can turn it off).
  useEffect(() => {
    if (asked.current || !site.location.askOnArrival || state.status !== "idle") return;
    asked.current = true;
    void detect();
  }, [site.location.askOnArrival, state.status, detect]);

  const value = useMemo<LocationContextValue>(
    () => ({
      ...state,
      detect,
      pick: (area) => {
        update({ status: "served", area, point: null, picked: true });
        setPickerOpen(false);
      },
      openPicker: () => setPickerOpen(true),
    }),
    [state, detect, update],
  );

  return (
    <LocationContext.Provider value={value}>
      {children}
      {pickerOpen && <AreaPicker onClose={() => setPickerOpen(false)} />}
    </LocationContext.Provider>
  );
}

/** The header chip: where we think you are and whether we serve you; opens the picker. */
export function LocationChip({ inverse = false, fullWidth = false, compact = false }: { inverse?: boolean; fullWidth?: boolean; compact?: boolean }) {
  const { t } = useTranslation("public");
  const { tokens } = useTheme();
  const location = useVisitorLocation();
  if (!location) return null;

  const { status, area } = location;
  const label =
    status === "locating"
      ? t("location.finding")
      : status === "served"
        ? (area ?? t("location.yourArea"))
        : status === "outside"
          ? t("location.outsideShort")
          : t("location.select");
  const note = status === "served" ? t("location.available") : status === "outside" ? t("location.notYet") : null;
  const tint = (light: string) => (inverse ? tokens.accent[200] : light);
  const icon =
    status === "served" ? (
      <CheckCircleOutlined sx={{ fontSize: 18, color: inverse ? tokens.semantic.success.border : tokens.semantic.success.fg }} />
    ) : status === "outside" ? (
      <LocationOffOutlined sx={{ fontSize: 18, color: tint(tokens.semantic.warning.strong) }} />
    ) : (
      <PlaceOutlined sx={{ fontSize: 18, color: tint(tokens.accent[600]) }} />
    );

  return (
    <ButtonBase
      onClick={location.openPicker}
      aria-haspopup="dialog"
      aria-label={t("location.chipLabel", { place: note ? `${label}, ${note}` : label })}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1.5,
        width: fullWidth ? "100%" : "auto",
        justifyContent: fullWidth ? "flex-start" : "center",
        minHeight: compact ? 32 : 40,
        px: compact ? 2 : 3,
        borderRadius: 999,
        border: compact ? 0 : `1px solid ${inverse ? "rgba(255,255,255,0.3)" : tokens.neutral[200]}`,
        bgcolor: inverse ? "transparent" : tokens.neutral[0],
        color: inverse ? tokens.neutral[0] : tokens.neutral[900],
        typography: "body2",
        maxWidth: fullWidth ? "none" : 260,
        "&:hover": { borderColor: tokens.accent[500] },
        "&:focus-visible": { outline: `2px solid ${tokens.accent[600]}`, outlineOffset: 2 },
      }}
    >
      {icon}
      <Box component="span" sx={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {label}
      </Box>
      {note && (
        <Box component="span" sx={{ color: inverse ? "rgba(255,255,255,0.75)" : "text.secondary", whiteSpace: "nowrap" }}>
          · {note}
        </Box>
      )}
      <ExpandMoreOutlined sx={{ fontSize: 18, ml: "auto" }} aria-hidden />
    </ButtonBase>
  );
}

/** Under the header when we don't serve the visitor's location: the admin's message and "Notify me". */
export function NotServedBanner() {
  const { t } = useTranslation("public");
  const { tokens } = useTheme();
  const text = useText();
  const { site } = useSite();
  const location = useVisitorLocation();
  const [dismissed, setDismissed] = useState(false);
  if (!location || location.status !== "outside" || dismissed) return null;

  return (
    <Box role="status" sx={{ bgcolor: tokens.semantic.warning.bg, borderBottom: `1px solid ${tokens.semantic.warning.border}`, color: tokens.neutral[900] }}>
      <Container maxWidth={false} sx={{ maxWidth: tokens.container.marketing, py: 3, display: "flex", gap: 3, alignItems: "flex-start" }}>
        <LocationOffOutlined aria-hidden sx={{ mt: 0.5, color: tokens.semantic.warning.strong }} />
        <Box sx={{ flex: 1, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 3 }}>
          <Typography variant="body2" sx={{ flex: "1 1 280px" }}>
            {text(site.location.notServedMessage)}
          </Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Button size="sm" onClick={location.openPicker}>
              {t("location.notifyMe")}
            </Button>
          </Box>
        </Box>
        <IconButton label={t("common:action.close")} size="sm" onClick={() => setDismissed(true)} tooltip={false}>
          <CloseOutlined fontSize="small" />
        </IconButton>
      </Container>
    </Box>
  );
}

/** Choose a served area, try the location again, or leave a number for an area we don't serve yet. */
function AreaPicker({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation("public");
  const { tokens } = useTheme();
  const { areas } = useSite();
  const location = useVisitorLocation();
  const [requesting, setRequesting] = useState(location?.status === "outside");
  if (!location) return null;

  return (
    <ResponsiveDialog open onClose={onClose} title={requesting ? t("location.requestTitle") : t("location.pickTitle")}>
      {requesting ? (
        <AreaRequestForm point={location.point} onDone={onClose} onBack={() => setRequesting(false)} />
      ) : (
        <Box sx={{ display: "grid", gap: 5, pt: 1 }}>
          <Button variant="secondary" startIcon={<MyLocationOutlined />} loading={location.status === "locating"} onClick={() => void location.detect().then(onClose)}>
            {t("location.useMine")}
          </Button>
          {(location.status === "denied" || location.status === "unavailable") && <InlineAlert tone="info">{t(location.status === "denied" ? "location.deniedHelp" : "location.unavailableHelp")}</InlineAlert>}
          {areas.length > 0 && (
            <Box>
              <Typography variant="label" component="h3" sx={{ m: 0, mb: 3 }}>
                {t("location.servedAreas")}
              </Typography>
              <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 2 }}>
                {areas.map((area) => (
                  <li key={area}>
                    <ButtonBase
                      onClick={() => location.pick(area)}
                      sx={{
                        width: "100%",
                        justifyContent: "flex-start",
                        gap: 2,
                        px: 4,
                        minHeight: 48,
                        borderRadius: `${tokens.radius.md}px`,
                        border: `1px solid ${location.area === area ? tokens.accent[600] : tokens.neutral[200]}`,
                        bgcolor: location.area === area ? tokens.accent[50] : tokens.neutral[0],
                        typography: "body1",
                        fontWeight: 500,
                        "&:hover": { borderColor: tokens.accent[500] },
                        "&:focus-visible": { outline: `2px solid ${tokens.accent[600]}`, outlineOffset: 2 },
                      }}
                    >
                      <PlaceOutlined sx={{ color: tokens.accent[600] }} aria-hidden />
                      {area}
                    </ButtonBase>
                  </li>
                ))}
              </Box>
            </Box>
          )}
          <Button variant="tertiary" onClick={() => setRequesting(true)} sx={{ justifySelf: "start" }}>
            {t("location.notListed")}
          </Button>
        </Box>
      )}
    </ResponsiveDialog>
  );
}

function AreaRequestForm({ point, onDone, onBack }: { point: { lat: number; lng: number } | null; onDone: () => void; onBack: () => void }) {
  const { t } = useTranslation("public");
  const request = useAreaRequest();
  const [phone, setPhone] = useState("");
  const [place, setPlace] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (request.isSuccess) {
    return (
      <Box role="status" sx={{ display: "grid", gap: 4, pt: 1 }}>
        <InlineAlert tone="success">{t("location.requestDone")}</InlineAlert>
        <Button onClick={onDone} sx={{ justifySelf: "start" }}>
          {t("common:action.close")}
        </Button>
      </Box>
    );
  }

  const submit = async () => {
    setError(null);
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError(t("common:validation.phone"));
      return;
    }
    try {
      await request.mutateAsync({ phone, place: place.trim(), lat: point?.lat ?? null, lng: point?.lng ?? null });
    } catch (failure) {
      setError(errorText(t, failure));
    }
  };

  return (
    <Box
      component="form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      sx={{ display: "grid", gap: 5, pt: 1 }}
    >
      <Typography sx={{ color: "text.secondary" }}>{t("location.requestBody")}</Typography>
      <PhoneField label={t("location.phone")} name="phone" value={phone} onChange={setPhone} error={error ?? undefined} />
      <TextField label={t("location.place")} hint={t("location.placeHint")} optional value={place} onChange={(event) => setPlace(event.target.value)} name="place" autoComplete="address-level2" />
      <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        <Button type="submit" loading={request.isPending}>
          {t("location.notifyMe")}
        </Button>
        <Button variant="tertiary" onClick={onBack}>
          {t("location.back")}
        </Button>
      </Box>
    </Box>
  );
}
