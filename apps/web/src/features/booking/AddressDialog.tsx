import { useState } from "react";
import { type AddressData, type AddressDto, type AddressInput, addressInputSchema } from "@brand/shared";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import MyLocationOutlined from "@mui/icons-material/MyLocationOutlined";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Button, Checkbox, InlineAlert, ResponsiveDialog, SegmentedControl, TextField } from "@/design-system";
import { currentFix, DeviceError } from "@/lib/device";
import { errorText, fieldText } from "@/lib/errors";
import { fieldProps } from "@/lib/fieldProps";
import { applyServerErrors } from "@/lib/forms";
import { useSaveAddress } from "./api";

const blank = (isDefault: boolean): AddressInput => ({
  label: "home",
  house: "",
  building: "",
  street: "",
  landmark: "",
  city: "",
  pincode: "",
  // Set by "Use my current location"; validation asks for it until then.
  location: undefined as unknown as AddressInput["location"],
  placeId: null,
  isDefault,
});

/**
 * Add or edit an address (plan W3). The pin comes from the phone's location, so the
 * professional navigates to the right door; the typed lines tell them which flat.
 */
export function AddressDialog({ address, first, onClose, onSaved }: { address: AddressDto | null; first: boolean; onClose: () => void; onSaved: (address: AddressDto) => void }) {
  const { t } = useTranslation("booking");
  const { tokens } = useTheme();
  const save = useSaveAddress();
  const [formError, setFormError] = useState<unknown>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const { register, control, handleSubmit, setValue, setError, formState } = useForm<AddressInput, unknown, AddressData>({
    resolver: standardSchemaResolver(addressInputSchema),
    mode: "onTouched",
    defaultValues: address ? { ...address } : blank(first),
  });
  const location = useWatch({ control, name: "location" });
  const errors = formState.errors;

  const locate = async () => {
    setLocationError(null);
    setLocating(true);
    try {
      const fix = await currentFix();
      setValue("location", { lat: fix.lat, lng: fix.lng }, { shouldDirty: true, shouldValidate: true });
      setAccuracy(fix.accuracy);
    } catch (failure) {
      setLocationError(t(`address.locationError.${failure instanceof DeviceError ? failure.reason : "failed"}`));
    } finally {
      setLocating(false);
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const saved = await save.mutateAsync({ id: address?.id ?? null, address: values });
      onSaved(saved);
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ["house", "building", "street", "landmark", "city", "pincode", "location"]));
    }
  });

  return (
    <ResponsiveDialog
      open
      onClose={onClose}
      form
      title={address ? t("address.editTitle") : t("address.newTitle")}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("address.cancel")}
          </Button>
          <Button type="submit" form="address-form" loading={save.isPending}>
            {t("address.save")}
          </Button>
        </>
      }
    >
      <Box component="form" id="address-form" noValidate onSubmit={onSubmit} sx={{ display: "grid", gap: 5, pt: 1 }}>
        {formError ? <InlineAlert tone="danger">{errorText(t, formError)}</InlineAlert> : null}

        <Box sx={{ p: 4, border: `1px solid ${errors.location ? tokens.semantic.danger.fg : tokens.neutral[200]}`, borderRadius: `${tokens.radius.md}px`, display: "grid", gap: 3 }}>
          <Typography sx={{ fontWeight: 600 }}>{t("address.pinTitle")}</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {location ? t("address.pinSet", { accuracy: accuracy ?? "—" }) : t("address.pinHelp")}
          </Typography>
          <Box>
            <Button variant={location ? "secondary" : "primary"} startIcon={<MyLocationOutlined />} onClick={() => void locate()} loading={locating}>
              {location ? t("address.pinAgain") : t("address.pinUse")}
            </Button>
          </Box>
          {locationError && <InlineAlert tone="danger">{locationError}</InlineAlert>}
          {errors.location && !locationError && (
            <Typography variant="body2" role="alert" sx={{ color: "error.main" }}>
              {t("address.pinRequired")}
            </Typography>
          )}
        </Box>

        <Controller
          control={control}
          name="label"
          render={({ field }) => (
            <SegmentedControl
              label={t("address.label")}
              showLabel
              name="address-label"
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: "home", label: t("address.labels.home") },
                { value: "work", label: t("address.labels.work") },
                { value: "other", label: t("address.labels.other") },
              ]}
            />
          )}
        />
        <TextField label={t("address.house")} autoComplete="address-line1" {...fieldProps(register("house"))} error={fieldText(t, errors.house?.message)} />
        <TextField label={t("address.building")} optional autoComplete="address-line2" {...fieldProps(register("building"))} error={fieldText(t, errors.building?.message)} />
        <TextField label={t("address.street")} hint={t("address.streetHint")} autoComplete="address-level3" {...fieldProps(register("street"))} error={fieldText(t, errors.street?.message)} />
        <TextField label={t("address.landmark")} optional hint={t("address.landmarkHint")} {...fieldProps(register("landmark"))} error={fieldText(t, errors.landmark?.message)} />
        <Box sx={{ display: "grid", gap: 5, gridTemplateColumns: { xs: "1fr", sm: "2fr 1fr" } }}>
          <TextField label={t("address.city")} autoComplete="address-level2" {...fieldProps(register("city"))} error={fieldText(t, errors.city?.message)} />
          <TextField label={t("address.pincode")} inputMode="numeric" autoComplete="postal-code" {...fieldProps(register("pincode"))} error={fieldText(t, errors.pincode?.message)} />
        </Box>
        <Controller
          control={control}
          name="isDefault"
          render={({ field }) => <Checkbox label={t("address.makeDefault")} checked={field.value} onChange={field.onChange} name={field.name} />}
        />
      </Box>
    </ResponsiveDialog>
  );
}
