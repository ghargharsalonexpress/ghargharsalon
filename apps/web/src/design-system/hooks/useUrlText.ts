import { type ChangeEvent, useState } from "react";

/**
 * Props for a text field whose value lives in the URL (plan B8), such as a search box.
 *
 * React Router changes the URL in a transition, so a field fed straight from the URL shows the
 * old value until the navigation lands, and quick typing loses letters. Here the field keeps its
 * own text while it has focus and sends every change on; a URL change made elsewhere (a Clear
 * button, Back) replaces the text.
 */
export function useUrlText(urlValue: string, onValueChange: (value: string) => void) {
  const [text, setText] = useState(urlValue);
  const [seen, setSeen] = useState(urlValue);
  const [focused, setFocused] = useState(false);

  if (urlValue !== seen) {
    setSeen(urlValue);
    if (!focused) setText(urlValue);
  }

  return {
    value: text,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setText(event.target.value);
      onValueChange(event.target.value);
    },
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  };
}
