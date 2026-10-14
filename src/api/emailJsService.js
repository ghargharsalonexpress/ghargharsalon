import emailjs from "@emailjs/browser";

/* ------------------ ENV CONSTANTS (UNCHANGED) ------------------ */
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const ADMIN_TEMPLATE = import.meta.env.VITE_EMAILJS_BOOKING_ADMIN_TEMPLATE;
const USER_TEMPLATE = import.meta.env.VITE_EMAILJS_BOOKING_USER_TEMPLATE;
const CONTACT_TEMPLATE = import.meta.env.VITE_EMAILJS_GENERIC;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

/* ------------------ UTILITY ------------------ */
const safe = (v) => (v == null ? "" : v);

/* ------------------ ADMIN BOOKING TEMPLATE ------------------ */
export const bookingAdminHTML = (data) => {
    const {
      order_id,
      timestamp,
      firstName,
      lastName,
      email,
      phone,
      addressType,
      houseNumber,
      street,
      landmark,
      city,
      state,
      pincode,
      specialInstructions,
      orders = [],
      cost = {},
    } = data;

    const items = orders
      .map(
        (o) => `
        <tr>
          <td style="padding:8px 0;">
            <div style="font-weight:600;">${safe(o.name)}</div>
            <div style="color:#777;">Qty: ${o.units}</div>
          </td>
          <td style="white-space:nowrap; font-weight:600; text-align:right; padding-left:12px;">
            ₹${o.price}
          </td>
        </tr>
      `
      )
      .join("");

    return `
    <div style="font-family:Arial, sans-serif; padding:16px; background:#f8f8f8;">
      <div style="max-width:600px; margin:auto; background:#fff; padding:20px; border:1px solid #ddd;">

        <h2 style="margin:0 0 10px; font-size:20px;">📦 New Booking Received</h2>

        <table style="width:100%; font-size:14px; margin-bottom:20px;">
          <tr><td><strong>Booking ID:</strong></td><td style="text-align:right;">${order_id}</td></tr>
          <tr><td><strong>Timestamp:</strong></td><td style="text-align:right;">${timestamp}</td></tr>
        </table>

        <h3 style="margin-top:20px; font-size:16px;">👤 Customer Details</h3>
        <table style="width:100%; font-size:14px; line-height:1.6;">
          <tr><td><strong>Name:</strong></td><td>${firstName} ${lastName}</td></tr>
          <tr><td><strong>Email:</strong></td><td>${email}</td></tr>
          <tr><td><strong>Phone:</strong></td><td>${phone}</td></tr>
          <tr><td><strong>Address Type:</strong></td><td>${addressType}</td></tr>
        </table>

        <h3 style="margin-top:20px; font-size:16px;">📍 Address</h3>
        <table style="width:100%; font-size:14px; line-height:1.6;">
          <tr><td><strong>House:</strong></td><td>${houseNumber}</td></tr>
          <tr><td><strong>Street:</strong></td><td>${street}</td></tr>
          <tr><td><strong>Landmark:</strong></td><td>${landmark || "-"}</td></tr>
          <tr><td><strong>City:</strong></td><td>${city}</td></tr>
          <tr><td><strong>State:</strong></td><td>${state}</td></tr>
          <tr><td><strong>Pincode:</strong></td><td>${pincode}</td></tr>
        </table>

        ${
          specialInstructions
            ? `
        <h3 style="margin-top:20px; font-size:16px;">📝 Special Instructions</h3>
        <p style="margin-bottom:20px;">${specialInstructions}</p>
        `
            : ""
        }

        <h3 style="margin-top:20px; font-size:16px;">🛒 Services Booked</h3>

        <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
          ${items}
        </table>

        <hr style="border:0; border-top:1px solid #ddd; margin:20px 0;">

        <h3 style="margin-top:20px; font-size:16px;">💰 Payment Summary</h3>

        <table style="width:100%; font-size:14px; line-height:1.6;">
          <tr><td>Subtotal</td><td style="text-align:right;">₹${cost.subtotal}</td></tr>
          <tr><td>GST (5%)</td><td style="text-align:right;">₹${cost.tax}</td></tr>
          <tr><td>Platform Fee</td><td style="text-align:right;">₹${cost.platform_fee}</td></tr>
          <tr>
            <td style="padding-top:6px; border-top:1px solid #000;"><strong>Total</strong></td>
            <td style="padding-top:6px; border-top:1px solid:#000; text-align:right;"><strong>₹${cost.total}</strong></td>
          </tr>
        </table>

      </div>
    </div>
  `;
  };

/* ------------------ USER BOOKING TEMPLATE ------------------ */
export const bookingUserHTML = ({
    order_id,
    firstName,
    email,
    orders = [],
    cost = {},
  }) => {
    const items = orders
      .map(
        (o) => `
        <tr>
          <td style="padding:8px 0;">
            <div style="font-weight:600;">${safe(o.name)}</div>
            <div style="color:#777;">Qty: ${o.units}</div>
          </td>
          <td style="white-space:nowrap; font-weight:600; text-align:right;">₹${o.price}</td>
        </tr>`
      )
      .join("");

    return `
    <div style="font-family:Arial, sans-serif; padding:16px; background:#f5f5f5;">
      <div style="max-width:600px; margin:auto; background:#fff; padding:20px; border:1px solid #ddd;">

        <h2 style="margin:0 0 10px; font-size:20px;">🎉 Booking Confirmed</h2>

        <p>Hello <strong>${firstName}</strong>,<br>Your booking has been received successfully.</p>

        <p><strong>Booking ID:</strong> ${order_id}</p>

        <h3 style="margin-top:20px; font-size:16px;">🛒 Services</h3>
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
          ${items}
        </table>

        <h3 style="margin-top:20px; font-size:16px;">💰 Payment Summary</h3>
        <table style="width:100%; font-size:14px; line-height:1.6;">
          <tr><td>Subtotal</td><td style="text-align:right;">₹${cost.subtotal}</td></tr>
          <tr><td>GST (5%)</td><td style="text-align:right;">₹${cost.tax}</td></tr>
          <tr><td>Platform Fee</td><td style="text-align:right;">₹${cost.platform_fee}</td></tr>
          <tr>
            <td style="padding-top:6px; border-top:1px solid #000;"><strong>Total</strong></td>
            <td style="padding-top:6px; border-top:1px solid:#000; text-align:right;"><strong>₹${cost.total}</strong></td>
          </tr>
        </table>

        <p style="font-size:13px; color:#777; margin-top:20px;">
          A confirmation has been sent to <strong>${email}</strong>.
        </p>

      </div>
    </div>`;
  };

/* ------------------ CONTACT FORM TEMPLATE ------------------ */
export const contactFormHTML = ({ name, email, message }) => `
  <div style="font-family:Arial, sans-serif; padding:16px; background:#f8f8f8;">
    <div style="max-width:600px; margin:auto; background:#fff; padding:20px; border:1px solid #ddd;">

      <h2 style="margin-top:0; font-size:20px;">📩 New Contact Inquiry</h2>

      <table style="width:100%; font-size:14px; line-height:1.6; margin-bottom:20px;">
        <tr><td><strong>Name:</strong></td><td>${safe(name)}</td></tr>
        <tr><td><strong>Email:</strong></td><td>${safe(email)}</td></tr>
      </table>

      <h3 style="font-size:16px;">Message</h3>
      <p style="white-space:pre-line;">${safe(message)}</p>

    </div>
  </div>
`;

/* ------------------ CENTRAL EMAIL SENDER ------------------ */
export const sendEmail = async ({ template, html, to }) => {
    try {
        const TEMPLATE_IDS = {
            admin: ADMIN_TEMPLATE,
            user: USER_TEMPLATE,
            contact: CONTACT_TEMPLATE,
        };

        const templateId = TEMPLATE_IDS[template];
        if (!templateId) throw new Error(`Invalid email template: ${template}`);

        const finalTo = (to || "").trim();

        if (!finalTo) {
            console.error("sendEmail → Missing recipient for template:", template);
            throw new Error("Recipient email missing before calling EmailJS");
        }

        const payload = {
            html,
            to_email: finalTo,
        };

        console.log("DEBUG sendEmail → template:", template, "to:", finalTo);

        const res = await emailjs.send(SERVICE_ID, templateId, payload, PUBLIC_KEY);
        return { success: true, response: res };
    } catch (error) {
        console.error("EmailJS Error:", error);
        return { success: false, error: error.message || "Email send failed" };
    }
};
