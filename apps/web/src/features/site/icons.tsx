import type { FeatureIcon } from "@brand/shared";
import AccessTimeOutlined from "@mui/icons-material/AccessTimeOutlined";
import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import AutoAwesomeOutlined from "@mui/icons-material/AutoAwesomeOutlined";
import BoltOutlined from "@mui/icons-material/BoltOutlined";
import BrushOutlined from "@mui/icons-material/BrushOutlined";
import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined";
import CleanHandsOutlined from "@mui/icons-material/CleanHandsOutlined";
import CurrencyRupeeOutlined from "@mui/icons-material/CurrencyRupeeOutlined";
import FavoriteBorderOutlined from "@mui/icons-material/FavoriteBorderOutlined";
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import LocalFloristOutlined from "@mui/icons-material/LocalFloristOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import PhoneIphoneOutlined from "@mui/icons-material/PhoneIphoneOutlined";
import PlaceOutlined from "@mui/icons-material/PlaceOutlined";
import ShieldOutlined from "@mui/icons-material/ShieldOutlined";
import SpaOutlined from "@mui/icons-material/SpaOutlined";
import StarOutlineRounded from "@mui/icons-material/StarOutlineRounded";
import SupportAgentOutlined from "@mui/icons-material/SupportAgentOutlined";
import ThumbUpOutlined from "@mui/icons-material/ThumbUpOutlined";
import VerifiedOutlined from "@mui/icons-material/VerifiedOutlined";
import type { SvgIconComponent } from "@mui/icons-material";

/** The icons admins can pick for features and numbers (ADR-0021). */
export const FEATURE_ICON_COMPONENTS: Record<FeatureIcon, SvgIconComponent> = {
  verified: VerifiedOutlined,
  shield: ShieldOutlined,
  clock: AccessTimeOutlined,
  price: CurrencyRupeeOutlined,
  star: StarOutlineRounded,
  home: HomeOutlined,
  spa: SpaOutlined,
  sparkle: AutoAwesomeOutlined,
  heart: FavoriteBorderOutlined,
  leaf: LocalFloristOutlined,
  location: PlaceOutlined,
  phone: PhoneIphoneOutlined,
  calendar: CalendarMonthOutlined,
  wallet: AccountBalanceWalletOutlined,
  support: SupportAgentOutlined,
  hygiene: CleanHandsOutlined,
  lock: LockOutlined,
  thumb: ThumbUpOutlined,
  brush: BrushOutlined,
  bolt: BoltOutlined,
};

export function FeatureIconView({ icon, fontSize = "medium" }: { icon: FeatureIcon; fontSize?: "small" | "medium" | "large" }) {
  const Icon = FEATURE_ICON_COMPONENTS[icon];
  return <Icon fontSize={fontSize} aria-hidden />;
}
