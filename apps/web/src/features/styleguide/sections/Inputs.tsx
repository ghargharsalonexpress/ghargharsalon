import { useState } from "react";
import AddOutlined from "@mui/icons-material/AddOutlined";
import ArrowForwardOutlined from "@mui/icons-material/ArrowForwardOutlined";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import FilterListOutlined from "@mui/icons-material/FilterListOutlined";
import MoreVertOutlined from "@mui/icons-material/MoreVertOutlined";
import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";
import {
  Button,
  Checkbox,
  ChoiceChips,
  IconButton,
  PasswordField,
  PhoneField,
  QuantityStepper,
  RadioCards,
  RadioGroupField,
  SegmentedControl,
  SelectField,
  Switch,
  TextField,
} from "@/design-system";
import { formatMoney } from "@/lib/format";
import { Grid, Row, Section, Specimen } from "../parts";

type Preference = "any" | "female" | "male";
type AddressType = "home" | "work" | "other";

/** Specimen content uses product strings (styleguide namespace) so Hindi mode tests real lengths. */
export function Inputs() {
  const { t, i18n } = useTranslation("styleguide");
  const [name, setName] = useState("Priya Sharma");
  const [phone, setPhone] = useState("98765");
  const [landmark, setLandmark] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"" | "HR" | "DL" | "UP">("");
  const [notes, setNotes] = useState("");
  const [save, setSave] = useState(true);
  const [online, setOnline] = useState(false);
  const [terms, setTerms] = useState(false);
  const [addressType, setAddressType] = useState<AddressType>("home");
  const [preference, setPreference] = useState<Preference>("any");
  const [gender, setGender] = useState<"women" | "men">("women");
  const [quantity, setQuantity] = useState(1);
  const [tier, setTier] = useState<"one" | "three">("one");
  const [category, setCategory] = useState<string | null>("salon");
  const [loading, setLoading] = useState(false);

  const pay = t("samples:checkout.pay", { amount: formatMoney(104_900, i18n.language) });
  const labels = { primary: pay, secondary: t("buttons.changeAddress"), tertiary: t("buttons.viewDetails"), danger: t("buttons.cancelBooking") };

  return (
    <>
      <Section
        id="buttons"
        title="Buttons"
        description="One primary action per view. Labels are verbs. Danger is for destructive confirmations only."
        rules={[
          "Heights: sm 32 (dense admin, mouse only), md 40, lg 48 (mobile CTAs). Touch screens get at least 44.",
          "A disabled button always has a visible reason nearby. Loading keeps the width and colour.",
          "Icon-only buttons need a label; it doubles as the tooltip on desktop.",
        ]}
      >
        <Specimen label="Variants × sizes">
          <Box sx={{ display: "grid", gap: 4 }}>
            {(["primary", "secondary", "tertiary", "danger"] as const).map((variant) => (
              <Row key={variant}>
                {(["sm", "md", "lg"] as const).map((size) => (
                  <Button key={size} variant={variant} size={size}>
                    {labels[variant]}
                  </Button>
                ))}
              </Row>
            ))}
          </Box>
        </Specimen>
        <Specimen label="States">
          <Row>
            <Button disabled>{t("buttons.unavailable")}</Button>
            <Button variant="secondary" disabled>
              {t("buttons.unavailable")}
            </Button>
            <Button
              loading={loading}
              onClick={() => {
                setLoading(true);
                window.setTimeout(() => setLoading(false), 1800);
              }}
            >
              {loading ? t("buttons.paying") : t("buttons.tapToLoad")}
            </Button>
            <Button startIcon={<AddOutlined />}>{t("buttons.addService")}</Button>
            <Button variant="tertiary" endIcon={<ArrowForwardOutlined />}>
              {t("buttons.seeAll")}
            </Button>
          </Row>
        </Specimen>
        <Specimen label="Icon buttons">
          <Row>
            <IconButton label={t("common:action.close")}>
              <CloseOutlined />
            </IconButton>
            <IconButton label={t("buttons.filters")}>
              <FilterListOutlined />
            </IconButton>
            <IconButton label={t("buttons.moreActions")}>
              <MoreVertOutlined />
            </IconButton>
            <IconButton label={t("common:action.close")} disabled>
              <CloseOutlined />
            </IconButton>
          </Row>
        </Specimen>
        <Specimen label="Full width (mobile action bars)">
          <Box sx={{ maxWidth: 360 }}>
            <Button size="lg" fullWidth>
              {t("samples:jobAlert.accept")}
            </Button>
          </Box>
        </Specimen>
      </Section>

      <Section
        id="fields"
        title="Form fields"
        description="Label above, hint below, error replaces the hint. Optional fields say '(optional)'; required fields are unmarked."
        rules={[
          "Errors appear on blur or submit and clear as the user types. Never only on submit for long forms.",
          "Use the right keyboard: inputmode tel for phone numbers, numeric for OTP and pincode.",
          "Every field has an autocomplete attribute where the browser can help.",
        ]}
      >
        <Grid min={300}>
          <TextField label={t("fields.fullName")} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
          <PhoneField
            label={t("fields.mobile")}
            value={phone}
            onChange={setPhone}
            hint={t("fields.mobileHint")}
            error={phone.length > 0 && phone.length < 10 ? t("fields.mobileError") : undefined}
          />
          <TextField
            label={t("fields.landmark")}
            optional
            value={landmark}
            onChange={(event) => setLandmark(event.target.value)}
            hint={t("fields.landmarkHint")}
          />
          <PasswordField
            label={t("fields.password")}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            hint={t("fields.passwordHint")}
          />
          <SelectField
            label={t("fields.state")}
            value={state}
            onChange={setState}
            placeholder={t("fields.chooseState")}
            options={(["HR", "DL", "UP"] as const).map((value) => ({ value, label: t(`fields.states.${value}`) }))}
          />
          <TextField label={t("fields.bookingId")} value="BK-26100-0042" disabled />
          <Box sx={{ gridColumn: { md: "1 / -1" } }}>
            <TextField
              label={t("fields.notes")}
              optional
              multiline
              minRows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              hint={t("fields.notesHint")}
            />
          </Box>
        </Grid>
      </Section>

      <Section
        id="selection"
        title="Selection controls"
        description="Checkboxes for independent choices, radios for one of several with descriptions, switches only for settings that apply instantly, segmented controls for 2–4 short options."
      >
        <Grid min={300}>
          <Specimen label="Checkbox and switch">
            <Box sx={{ display: "grid" }}>
              <Checkbox label={t("selection.saveAddress")} description={t("selection.saveAddressHint")} checked={save} onChange={setSave} />
              <Checkbox label={t("selection.agreeTerms")} checked={terms} onChange={setTerms} />
              <Switch label={t("selection.online")} description={t("selection.onlineHint")} checked={online} onChange={setOnline} />
            </Box>
          </Specimen>
          <Specimen label="Radio group">
            <RadioGroupField<AddressType>
              legend={t("selection.saveAs")}
              name="address-type"
              value={addressType}
              onChange={setAddressType}
              options={[
                { value: "home", label: t("selection.home") },
                { value: "work", label: t("selection.work"), description: t("selection.workHint") },
                { value: "other", label: t("selection.other") },
              ]}
            />
          </Specimen>
          <Specimen label="Segmented control">
            <Box sx={{ display: "grid", gap: 6 }}>
              <SegmentedControl<Preference>
                label={t("samples:checkout.whoTitle")}
                showLabel
                name="preference"
                value={preference}
                onChange={setPreference}
                fullWidth
                size="lg"
                options={[
                  { value: "any", label: t("samples:checkout.any") },
                  { value: "female", label: t("samples:checkout.female") },
                  { value: "male", label: t("samples:checkout.male") },
                ]}
              />
              <SegmentedControl<"women" | "men">
                label={t("selection.servicesFor")}
                name="gender"
                value={gender}
                onChange={setGender}
                options={[
                  { value: "women", label: t("selection.women") },
                  { value: "men", label: t("selection.men") },
                ]}
              />
            </Box>
          </Specimen>
          <Specimen label="Option cards">
            <RadioCards<"one" | "three">
              legend={t("selection.chooseOption")}
              name="tier"
              value={tier}
              onChange={setTier}
              options={[
                { value: "one", label: t("selection.tierOne"), description: t("selection.tierOneFacts"), aside: formatMoney(97_000, i18n.language) },
                { value: "three", label: t("selection.tierThree"), description: t("selection.tierThreeFacts"), aside: formatMoney(2_69_900, i18n.language) },
              ]}
            />
          </Specimen>
          <Specimen label="Choice chips (one row that scrolls on phones)">
            <ChoiceChips
              label={t("selection.categories")}
              scrollable
              value={category}
              onChange={setCategory}
              options={(["salon", "makeup", "hair", "spa"] as const).map((id) => ({ id, label: t(`selection.${id}`) }))}
            />
          </Specimen>
          <Specimen label="Quantity stepper">
            <Row>
              <QuantityStepper
                itemLabel={t("samples:checkout.items.facial")}
                value={quantity}
                onChange={setQuantity}
                onRemove={() => setQuantity(1)}
                removeLabel={t("selection.removeFromCart")}
              />
              <QuantityStepper itemLabel={t("selection.threading")} value={3} onChange={() => undefined} />
            </Row>
          </Specimen>
        </Grid>
      </Section>
    </>
  );
}
