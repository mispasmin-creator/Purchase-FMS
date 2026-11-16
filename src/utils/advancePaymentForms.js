// Firm-wise Google Form used from the Advance Payement page's Action column.
//
// Every firm has its own form, and every form has its own `entry.XXXX` ids, so
// each firm needs its own `entries` map. To fill in a firm: open its form ->
// ⋮ -> "Get pre-filled link", fill all 5 fields with dummy values, and copy the
// entry ids from the generated link (same field order as the Pmmpl form).
//
// While `entries` is null, the plain (empty) form is opened instead.

const SOURCE_LABEL = "Purchase FMS Po Advance";

const FIRM_FORMS = {
  pmmpl: {
    base: "https://docs.google.com/forms/d/e/1FAIpQLScn8tHEUldlOM_8DKpHUfHHiRImDVjkpkhhfduaZUIxpxlJrA/viewform",
    entries: {
      indentId: "entry.1200639812",
      source: "entry.604194301",
      vendor: "entry.1091308719",
      amount: "entry.1486176123",
      notes: "entry.2102057582",
    },
  },
  rkl: {
    base: "https://docs.google.com/forms/d/e/1FAIpQLScJJFvh6zchRosSzX0mU-u7-oeMaQW6iv1osE70hRDoE-uVrg/viewform",
    entries: null, // TODO: paste entry ids from Rkl pre-filled link
  },
  purab: {
    base: "https://docs.google.com/forms/d/e/1FAIpQLSdLWKfGPNXK62Orndb137GPKadFiRQZS8W_MM0c11HvdR4KkA/viewform",
    entries: null, // TODO: paste entry ids from Purab pre-filled link
  },
};

const firmKey = (firmName) => String(firmName || "").trim().toLowerCase();

/**
 * Returns the Google Form URL (pre-filled when entry ids are known) for an
 * advance-payment row, or "" when the firm has no form configured.
 */
export function getAdvancePaymentFormUrl(entry) {
  const form = FIRM_FORMS[firmKey(entry?.firmName)];
  if (!form) return "";
  if (!form.entries) return form.base;

  const { entries } = form;
  const params = new URLSearchParams({ usp: "pp_url" });
  params.set(entries.indentId, entry.indentId || "");
  params.set(entries.source, SOURCE_LABEL);
  params.set(entries.vendor, entry.vendorName || "");
  params.set(entries.amount, entry.advanceAmount || "");
  params.set(entries.notes, entry.notes || "");
  return `${form.base}?${params.toString()}`;
}
