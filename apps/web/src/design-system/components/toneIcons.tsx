import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import ErrorOutlineOutlined from "@mui/icons-material/ErrorOutlineOutlined";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";

/** One icon per tone, shared by InlineAlert and Banner. Keys follow MUI Alert severities. */
export const toneIcons = {
  success: <CheckCircleOutlined fontSize="inherit" />,
  warning: <WarningAmberOutlined fontSize="inherit" />,
  error: <ErrorOutlineOutlined fontSize="inherit" />,
  info: <InfoOutlined fontSize="inherit" />,
};
