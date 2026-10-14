import ExpandMoreOutlined from "@mui/icons-material/ExpandMoreOutlined";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Typography from "@mui/material/Typography";
import { useId } from "react";

export interface FaqItem {
  question: string;
  answer: string;
}

/** Questions as an accordion; height animation is one of the allowed motions (plan B7). */
export function FaqList({ items, headingLevel = "h3" }: { items: ReadonlyArray<FaqItem>; headingLevel?: "h2" | "h3" | "h4" }) {
  const id = useId();
  return (
    <div>
      {items.map((item, index) => (
        <Accordion key={item.question} disableGutters slotProps={{ heading: { component: headingLevel } }}>
          <AccordionSummary expandIcon={<ExpandMoreOutlined />} id={`${id}-q${index}`} aria-controls={`${id}-a${index}`}>
            <Typography sx={{ fontWeight: 600 }}>{item.question}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography sx={{ color: "text.secondary" }}>{item.answer}</Typography>
          </AccordionDetails>
        </Accordion>
      ))}
    </div>
  );
}
