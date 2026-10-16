import { describe, expect, it } from "vitest";
import { CloudWhatsappTransport, MemoryWhatsappTransport, WHATSAPP_TEMPLATES } from "../src/modules/whatsapp/transport";

/** A fake fetch that records the one request it was given. */
function recorder(response: Partial<Response> & { json?: () => Promise<unknown> } = {}) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const impl = async (url: string, init?: RequestInit) => {
    calls.push({ url, init: init ?? {} });
    return { ok: true, status: 200, json: async () => ({}), ...response } as Response;
  };
  return { calls, impl };
}

interface TemplatePart {
  type: string;
  sub_type?: string;
  index?: string;
  parameters?: Array<{ type: string; text: string }>;
}
interface SentBody {
  to: string;
  type: string;
  template: { name: string; language: { code: string }; components: TemplatePart[] };
}
const body = (init: RequestInit) => JSON.parse(String(init.body)) as SentBody;

describe("WhatsApp Cloud transport", () => {
  it("sends a utility template to the number in international form", async () => {
    const { calls, impl } = recorder();
    const transport = new CloudWhatsappTransport("123456", "a-long-enough-token", impl);

    await transport.send({ phone: "9373503119", template: WHATSAPP_TEMPLATES.onTheWay, variables: ["Meera", "12-18"], buttonParam: "bookings/abc" });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://graph.facebook.com/v22.0/123456/messages");
    expect(calls[0]?.init.headers).toMatchObject({ Authorization: "Bearer a-long-enough-token" });

    const sent = body(calls[0]!.init);
    // Meta wants the country code, and the customer's number is stored without it.
    expect(sent.to).toBe("919373503119");
    expect(sent.type).toBe("template");
    expect(sent.template.name).toBe("pro_on_the_way");
    expect(sent.template.language.code).toBe("en");
  });

  it("puts the variables in the body and the link in the button", async () => {
    const { calls, impl } = recorder();
    await new CloudWhatsappTransport("1", "a-long-enough-token", impl).send({
      phone: "9000000000",
      template: WHATSAPP_TEMPLATES.completed,
      variables: ["BK-1001"],
      buttonParam: "bookings/abc/invoice",
    });

    const components = body(calls[0]!.init).template.components;
    const text = components.find((part) => part.type === "body");
    const button = components.find((part) => part.type === "button");

    expect(text?.parameters).toEqual([{ type: "text", text: "BK-1001" }]);
    // The button is what makes this better than an SMS: the customer taps instead of copying.
    expect(button).toMatchObject({ sub_type: "url", index: "0", parameters: [{ type: "text", text: "bookings/abc/invoice" }] });
  });

  it("asks for the Hindi template when that is the customer's language", async () => {
    const { calls, impl } = recorder();
    await new CloudWhatsappTransport("1", "a-long-enough-token", impl).send({ phone: "9000000000", template: WHATSAPP_TEMPLATES.noProfessional, variables: ["₹660"], language: "hi" });
    expect(body(calls[0]!.init).template.language.code).toBe("hi");
  });

  it("leaves out the button when there is no link to put in it", async () => {
    const { calls, impl } = recorder();
    await new CloudWhatsappTransport("1", "a-long-enough-token", impl).send({ phone: "9000000000", template: WHATSAPP_TEMPLATES.noProfessional, variables: ["₹660"] });
    const components = body(calls[0]!.init).template.components;
    expect(components.some((part) => part.type === "button")).toBe(false);
  });

  it("throws on a refusal, so the outbox retries instead of losing the message", async () => {
    const { impl } = recorder({ ok: false, status: 400, json: async () => ({ error: { message: "Template not found" } }) });
    await expect(new CloudWhatsappTransport("1", "a-long-enough-token", impl).send({ phone: "9000000000", template: WHATSAPP_TEMPLATES.completed, variables: ["BK-1"] })).rejects.toThrow(/Template not found/);
  });
});

describe("the memory transport", () => {
  it("keeps what was sent, so tests and the E2E server can read it back", async () => {
    const transport = new MemoryWhatsappTransport();
    await transport.send({ phone: "9000000000", template: WHATSAPP_TEMPLATES.onTheWay, variables: ["Meera", "12-18"] });
    expect(transport.latestTo("9000000000")).toMatchObject({ template: "pro_on_the_way" });
    expect(transport.latestTo("9111111111")).toBeUndefined();
  });
});
