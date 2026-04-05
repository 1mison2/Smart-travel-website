const nodemailer = require("nodemailer");

const hasGmailCredentials = () =>
  Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const createTestTransporter = async () => {
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
};

const getMailer = async () => {
  if (hasGmailCredentials()) {
    return {
      transporter: createTransporter(),
      usingTestTransport: false,
    };
  }

  return {
    transporter: await createTestTransporter(),
    usingTestTransport: true,
  };
};

const resolveFromAddress = () =>
  process.env.EMAIL_USER
    ? `"Smart Travel" <${process.env.EMAIL_USER}>`
    : '"Smart Travel" <noreply@smarttravel.com>';

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCurrency = (amount, currency = "NPR") => {
  const value = Number(amount || 0);
  return `${currency} ${value.toFixed(2)}`;
};

const joinList = (items = []) => items.filter(Boolean).join(", ") || "N/A";

const normalizeBoolean = (value, fallback = true) =>
  value === undefined || value === null ? fallback : Boolean(value);

const canSendEmail = (user, category = "general") => {
  if (!user?.email) return false;

  const settings = user.notifications || {};
  if (!normalizeBoolean(settings.emailNotifications, true)) return false;

  if (category === "tripReminder") {
    return normalizeBoolean(settings.tripReminders, true);
  }

  if (category === "newsletter") {
    return normalizeBoolean(settings.newsletter, true);
  }

  if (category === "priceAlert") {
    return normalizeBoolean(settings.priceAlerts, false);
  }

  return true;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildSimpleHtmlEmail = ({ heading, preheader = "", intro, bodyLines = [], footer = "" }) => `
  <div style="max-width: 680px; margin: 0 auto; padding: 24px; font-family: Arial, sans-serif; color: #1f2937;">
    <div style="background: #0f766e; color: #ffffff; padding: 24px; border-radius: 16px 16px 0 0;">
      <h1 style="margin: 0; font-size: 28px;">${escapeHtml(heading)}</h1>
      ${preheader ? `<p style="margin: 8px 0 0;">${escapeHtml(preheader)}</p>` : ""}
    </div>
    <div style="border: 1px solid #d1d5db; border-top: 0; border-radius: 0 0 16px 16px; overflow: hidden;">
      <div style="padding: 24px;">
        ${intro ? `<p style="margin-top: 0;">${escapeHtml(intro)}</p>` : ""}
        ${bodyLines
          .filter(Boolean)
          .map(
            (line) =>
              `<p style="margin: 0 0 14px; line-height: 1.6; color: #334155;">${escapeHtml(line)}</p>`
          )
          .join("")}
        ${footer ? `<p style="margin-bottom: 0;">${escapeHtml(footer)}</p>` : ""}
      </div>
    </div>
  </div>
`;

const sendMailWithTemplate = async ({
  to,
  subject,
  text,
  html,
  from = resolveFromAddress(),
}) => {
  const { transporter, usingTestTransport } = await getMailer();
  const info = await transporter.sendMail({ from, to, subject, text, html });

  return {
    success: true,
    messageId: info.messageId,
    previewURL: usingTestTransport ? nodemailer.getTestMessageUrl(info) : null,
  };
};

const buildPackageDetailsText = (packageSnapshot = {}) => {
  if (!packageSnapshot || typeof packageSnapshot !== "object") return "";
  const lines = [];
  if (packageSnapshot.location) lines.push(`Destination: ${packageSnapshot.location}`);
  if (packageSnapshot.region) lines.push(`Region: ${packageSnapshot.region}`);
  if (packageSnapshot.tripType) lines.push(`Trip type: ${packageSnapshot.tripType}`);
  if (packageSnapshot.difficulty) lines.push(`Difficulty: ${packageSnapshot.difficulty}`);
  if (packageSnapshot.bestSeason) lines.push(`Best season: ${packageSnapshot.bestSeason}`);
  if (Array.isArray(packageSnapshot.highlights) && packageSnapshot.highlights.length) {
    lines.push(`Highlights: ${packageSnapshot.highlights.join(", ")}`);
  }
  if (Array.isArray(packageSnapshot.selectedAddOns) && packageSnapshot.selectedAddOns.length) {
    lines.push(
      `Selected add-ons: ${packageSnapshot.selectedAddOns
        .map((item) => `${item.title} (${formatCurrency(item.price)})`)
        .join(", ")}`
    );
  }
  if (Array.isArray(packageSnapshot.itineraryDays) && packageSnapshot.itineraryDays.length) {
    lines.push("");
    lines.push("Day-wise itinerary:");
    packageSnapshot.itineraryDays.forEach((day) => {
      const hotel = day?.hotelName ? ` | Hotel: ${day.hotelName}` : "";
      const meals = Array.isArray(day?.meals) && day.meals.length ? ` | Meals: ${day.meals.join(", ")}` : "";
      const activities =
        Array.isArray(day?.activities) && day.activities.length
          ? ` | Activities: ${day.activities.map((item) => item.title).filter(Boolean).join(", ")}`
          : "";
      lines.push(
        `Day ${day?.dayNumber || "-"}: ${day?.title || "Plan"}${hotel}${meals}${activities}`
      );
    });
  }
  return lines.join("\n");
};

const buildPackageDetailsHtml = (packageSnapshot = {}) => {
  if (!packageSnapshot || typeof packageSnapshot !== "object") return "";

  const summaryRows = [
    packageSnapshot.location ? ["Destination", packageSnapshot.location] : null,
    packageSnapshot.region ? ["Region", packageSnapshot.region] : null,
    packageSnapshot.tripType ? ["Trip type", packageSnapshot.tripType] : null,
    packageSnapshot.difficulty ? ["Difficulty", packageSnapshot.difficulty] : null,
    packageSnapshot.bestSeason ? ["Best season", packageSnapshot.bestSeason] : null,
  ].filter(Boolean);

  const summaryHtml = summaryRows.length
    ? `
      <div style="margin-top: 18px;">
        <h3 style="margin: 0 0 10px; font-size: 18px;">Package details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${summaryRows
            .map(
              ([label, value]) => `
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">${label}</td>
                  <td style="padding: 6px 0; text-align: right;">${value}</td>
                </tr>
              `
            )
            .join("")}
        </table>
      </div>
    `
    : "";

  const highlightsHtml =
    Array.isArray(packageSnapshot.highlights) && packageSnapshot.highlights.length
      ? `
        <div style="margin-top: 18px;">
          <h3 style="margin: 0 0 10px; font-size: 18px;">Highlights</h3>
          <p style="margin: 0; color: #334155; line-height: 1.6;">${packageSnapshot.highlights.join(", ")}</p>
        </div>
      `
      : "";

  const addOnsHtml =
    Array.isArray(packageSnapshot.selectedAddOns) && packageSnapshot.selectedAddOns.length
      ? `
        <div style="margin-top: 18px;">
          <h3 style="margin: 0 0 10px; font-size: 18px;">Selected add-ons</h3>
          <ul style="margin: 0; padding-left: 18px; color: #334155;">
            ${packageSnapshot.selectedAddOns
              .map((item) => `<li style="margin: 0 0 6px;">${item.title} - ${formatCurrency(item.price)}</li>`)
              .join("")}
          </ul>
        </div>
      `
      : "";

  const itineraryHtml =
    Array.isArray(packageSnapshot.itineraryDays) && packageSnapshot.itineraryDays.length
      ? `
        <div style="margin-top: 18px;">
          <h3 style="margin: 0 0 10px; font-size: 18px;">Day-wise itinerary</h3>
          <div style="display: grid; gap: 10px;">
            ${packageSnapshot.itineraryDays
              .map((day) => {
                const activityNames = Array.isArray(day?.activities)
                  ? day.activities.map((item) => item.title).filter(Boolean)
                  : [];
                return `
                  <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px 14px; background: #ffffff;">
                    <p style="margin: 0 0 6px; font-weight: 700;">Day ${day?.dayNumber || "-"}: ${day?.title || "Plan"}</p>
                    ${day?.summary ? `<p style="margin: 0 0 8px; color: #475569; line-height: 1.55;">${day.summary}</p>` : ""}
                    <p style="margin: 0; color: #334155; line-height: 1.6;">
                      Hotel: ${day?.hotelName || "TBD"}<br>
                      Meals: ${joinList(day?.meals || [])}<br>
                      Transport: ${day?.transport || "TBD"}<br>
                      Activities: ${joinList(activityNames)}
                    </p>
                  </div>
                `;
              })
              .join("")}
          </div>
        </div>
      `
      : "";

  return `${summaryHtml}${highlightsHtml}${addOnsHtml}${itineraryHtml}`;
};

const sendWelcomeEmail = async ({ email, customerName }) => {
  const safeCustomerName = customerName || "Traveler";
  return sendMailWithTemplate({
    to: email,
    subject: "Welcome to Smart Travel",
    text:
      `Hello ${safeCustomerName},\n\n` +
      "Welcome to Smart Travel. Your account is ready, and you can now explore destinations, create bookings, and manage your trips in one place.\n\n" +
      "We are glad to have you with us.",
    html: buildSimpleHtmlEmail({
      heading: "Welcome to Smart Travel",
      preheader: "Your account is ready to go.",
      intro: `Hello ${safeCustomerName},`,
      bodyLines: [
        "Welcome to Smart Travel. Your account is ready, and you can now explore destinations, create bookings, and manage your trips in one place.",
        "We are glad to have you with us.",
      ],
    }),
  });
};

const sendBookingCreatedEmail = async ({
  email,
  customerName,
  bookingName,
  bookingId,
  amount,
  currency = "NPR",
  checkIn,
  checkOut,
}) => {
  const safeCustomerName = customerName || "Traveler";
  const safeBookingName = bookingName || "Smart Travel Booking";
  return sendMailWithTemplate({
    to: email,
    subject: `Booking created - ${safeBookingName}`,
    text:
      `Hello ${safeCustomerName},\n\n` +
      `Your booking for ${safeBookingName} has been created.\n` +
      `Booking ID: ${bookingId}\n` +
      `Check-in: ${formatDateTime(checkIn)}\n` +
      `Check-out: ${formatDateTime(checkOut)}\n` +
      `Amount due: ${formatCurrency(amount, currency)}\n\n` +
      "Please complete payment to confirm your booking.",
    html: buildSimpleHtmlEmail({
      heading: "Booking Created",
      preheader: "Your reservation has been created.",
      intro: `Hello ${safeCustomerName},`,
      bodyLines: [
        `Your booking for ${safeBookingName} has been created.`,
        `Booking ID: ${bookingId}`,
        `Check-in: ${formatDateTime(checkIn)}`,
        `Check-out: ${formatDateTime(checkOut)}`,
        `Amount due: ${formatCurrency(amount, currency)}`,
        "Please complete payment to confirm your booking.",
      ],
    }),
  });
};

const sendBookingCancelledEmail = async ({
  email,
  customerName,
  bookingName,
  bookingId,
  cancelledAt,
}) => {
  const safeCustomerName = customerName || "Traveler";
  const safeBookingName = bookingName || "your booking";
  return sendMailWithTemplate({
    to: email,
    subject: `Booking cancelled - ${safeBookingName}`,
    text:
      `Hello ${safeCustomerName},\n\n` +
      `Your booking for ${safeBookingName} has been cancelled.\n` +
      `Booking ID: ${bookingId}\n` +
      `Cancelled at: ${formatDateTime(cancelledAt)}\n\n` +
      "If this was unexpected, please contact support.",
    html: buildSimpleHtmlEmail({
      heading: "Booking Cancelled",
      preheader: "Your reservation has been cancelled.",
      intro: `Hello ${safeCustomerName},`,
      bodyLines: [
        `Your booking for ${safeBookingName} has been cancelled.`,
        `Booking ID: ${bookingId}`,
        `Cancelled at: ${formatDateTime(cancelledAt)}`,
        "If this was unexpected, please contact support.",
      ],
    }),
  });
};

const sendTripBookingCreatedEmail = async ({
  email,
  customerName,
  bookingName,
  bookingId,
  amount,
  currency = "NPR",
  bookingDate,
  packageSnapshot,
}) => {
  const safeCustomerName = customerName || "Traveler";
  const safeBookingName = bookingName || "Smart Travel Package";
  const packageDetailsText = buildPackageDetailsText(packageSnapshot);
  const packageDetailsHtml = buildPackageDetailsHtml(packageSnapshot);

  return sendMailWithTemplate({
    to: email,
    subject: `Trip reserved - ${safeBookingName}`,
    text:
      `Hello ${safeCustomerName},\n\n` +
      `Your trip package ${safeBookingName} has been reserved.\n` +
      `Booking ID: ${bookingId}\n` +
      `Travel date: ${formatDateTime(bookingDate)}\n` +
      `Amount due: ${formatCurrency(amount, currency)}\n` +
      (packageDetailsText ? `\n${packageDetailsText}\n` : "\n") +
      "Please complete payment to confirm your trip.",
    html: `
      ${buildSimpleHtmlEmail({
        heading: "Trip Reserved",
        preheader: "Your package booking is waiting for payment.",
        intro: `Hello ${safeCustomerName},`,
        bodyLines: [
          `Your trip package ${safeBookingName} has been reserved.`,
          `Booking ID: ${bookingId}`,
          `Travel date: ${formatDateTime(bookingDate)}`,
          `Amount due: ${formatCurrency(amount, currency)}`,
          "Please complete payment to confirm your trip.",
        ],
      }).replace("</div>\n  </div>\n", `${packageDetailsHtml}</div>\n  </div>\n`)}
    `,
  });
};

const sendTripReminderEmail = async ({
  email,
  customerName,
  bookingName,
  bookingId,
  checkIn,
  packageSnapshot,
}) => {
  const safeCustomerName = customerName || "Traveler";
  const safeBookingName = bookingName || "your upcoming trip";
  const packageDetailsText = buildPackageDetailsText(packageSnapshot);

  return sendMailWithTemplate({
    to: email,
    subject: `Trip reminder - ${safeBookingName}`,
    text:
      `Hello ${safeCustomerName},\n\n` +
      `This is a reminder for your upcoming trip: ${safeBookingName}.\n` +
      `Booking ID: ${bookingId}\n` +
      `Starts on: ${formatDateTime(checkIn)}\n` +
      (packageDetailsText ? `\n${packageDetailsText}\n` : "\n") +
      "We hope you have a great journey.",
    html: buildSimpleHtmlEmail({
      heading: "Trip Reminder",
      preheader: "Your upcoming trip is coming soon.",
      intro: `Hello ${safeCustomerName},`,
      bodyLines: [
        `This is a reminder for your upcoming trip: ${safeBookingName}.`,
        `Booking ID: ${bookingId}`,
        `Starts on: ${formatDateTime(checkIn)}`,
        "We hope you have a great journey.",
      ],
    }),
  });
};

const sendAnnouncementEmail = async ({
  email,
  customerName,
  subject,
  message,
}) => {
  const safeCustomerName = customerName || "Traveler";
  const bodyLines = String(message || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return sendMailWithTemplate({
    to: email,
    subject,
    text: `Hello ${safeCustomerName},\n\n${bodyLines.join("\n\n")}\n\nSmart Travel Team`,
    html: buildSimpleHtmlEmail({
      heading: subject,
      preheader: "A message from Smart Travel.",
      intro: `Hello ${safeCustomerName},`,
      bodyLines,
      footer: "Smart Travel Team",
    }),
  });
};

const sendPasswordResetEmail = async (email, resetCode) => {
  try {
    const result = await sendMailWithTemplate({
      to: email,
      subject: "Password Reset Code - Smart Travel",
      text:
        "Hello,\n\n" +
        "We received a request to reset your password for your Smart Travel account.\n\n" +
        `Your password reset code is: ${resetCode}\n\n` +
        "This code will expire in 10 minutes. If you did not request this, you can ignore this email.",
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 2rem;">Smart Travel</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Password Reset Code</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Use this code to reset your password</h2>
            <p style="color: #666; line-height: 1.6;">
              Hello,<br><br>
              We received a request to reset your password for your Smart Travel account. 
              Enter the code below on the reset password screen:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="display: inline-block; background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 18px 26px;">
                <div style="font-size: 32px; letter-spacing: 0.3em; font-weight: 800; color: #1e293b;">${resetCode}</div>
              </div>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <p style="color: #856404; margin: 0;">
                <strong>Important:</strong> This code will expire in 10 minutes for security reasons. 
                If you didn't request this password reset, please ignore this email.
              </p>
            </div>
          </div>
          
          <div style="text-align: center; color: #999; font-size: 0.9rem;">
            <p style="margin: 0;">
              © 2024 Smart Travel. All rights reserved.<br>
              This is an automated message, please do not reply to this email.
            </p>
          </div>
        </div>
      `
    });

    console.log("Password reset email sent: ", result.messageId);
    return result;
    
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
};

const sendPaymentSuccessEmail = async ({
  email,
  customerName,
  bookingName,
  bookingId,
  paymentId,
  transactionId,
  amount,
  currency = "NPR",
  paymentProvider = "Khalti",
  bookingDate,
  paidAt,
  packageSnapshot,
}) => {
  try {
    const safeCustomerName = customerName || "Traveler";
    const safeBookingName = bookingName || "Smart Travel Booking";
    const safeBookingDate = formatDateTime(bookingDate);
    const safePaidAt = formatDateTime(paidAt);
    const safeAmount = formatCurrency(amount, currency);
    const packageDetailsText = buildPackageDetailsText(packageSnapshot);
    const packageDetailsHtml = buildPackageDetailsHtml(packageSnapshot);

    const result = await sendMailWithTemplate({
      to: email,
      subject: `Payment successful - ${safeBookingName}`,
      text:
        `Hello ${safeCustomerName},\n\n` +
        `Your payment was successful and your booking is confirmed.\n\n` +
        `Booking: ${safeBookingName}\n` +
        `Booking ID: ${bookingId}\n` +
        `Payment ID: ${paymentId}\n` +
        `Transaction ID: ${transactionId || "N/A"}\n` +
        `Payment provider: ${paymentProvider}\n` +
        `Travel date: ${safeBookingDate}\n` +
        `Paid at: ${safePaidAt}\n` +
        `Amount paid: ${safeAmount}\n` +
        (packageDetailsText ? `\n${packageDetailsText}\n` : "\n") +
        `Thank you for choosing Smart Travel.`,
      html: `
        <div style="max-width: 680px; margin: 0 auto; padding: 24px; font-family: Arial, sans-serif; color: #1f2937;">
          <div style="background: #0f766e; color: #ffffff; padding: 24px; border-radius: 16px 16px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Payment Successful</h1>
            <p style="margin: 8px 0 0;">Your booking is confirmed and your bill is below.</p>
          </div>
          <div style="border: 1px solid #d1d5db; border-top: 0; border-radius: 0 0 16px 16px; overflow: hidden;">
            <div style="padding: 24px;">
              <p style="margin-top: 0;">Hello ${safeCustomerName},</p>
              <p>Your payment for <strong>${safeBookingName}</strong> has been received successfully.</p>
              <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px; margin: 24px 0;">
                <h2 style="margin-top: 0; font-size: 20px;">Bill / Receipt</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Booking</td>
                    <td style="padding: 8px 0; text-align: right;">${safeBookingName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Booking ID</td>
                    <td style="padding: 8px 0; text-align: right;">${bookingId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Payment ID</td>
                    <td style="padding: 8px 0; text-align: right;">${paymentId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Transaction ID</td>
                    <td style="padding: 8px 0; text-align: right;">${transactionId || "N/A"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Provider</td>
                    <td style="padding: 8px 0; text-align: right;">${paymentProvider}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Travel date</td>
                    <td style="padding: 8px 0; text-align: right;">${safeBookingDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Paid at</td>
                    <td style="padding: 8px 0; text-align: right;">${safePaidAt}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0 0; font-weight: bold;">Amount paid</td>
                    <td style="padding: 12px 0 0; text-align: right; font-weight: bold; font-size: 18px;">${safeAmount}</td>
                  </tr>
                </table>
              </div>
              ${packageDetailsHtml}
              <p style="margin-bottom: 0;">Thank you for choosing Smart Travel.</p>
            </div>
          </div>
        </div>
      `,
    });

    console.log("Payment success email sent:", result.messageId);
    return result;
  } catch (error) {
    console.error("Error sending payment success email:", error);
    throw error;
  }
};

module.exports = {
  canSendEmail,
  sendAnnouncementEmail,
  sendBookingCancelledEmail,
  sendBookingCreatedEmail,
  sendPasswordResetEmail,
  sendPaymentSuccessEmail,
  sendTripBookingCreatedEmail,
  sendTripReminderEmail,
  sendWelcomeEmail,
};
