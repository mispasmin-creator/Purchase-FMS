export const TECHNICAL_TAGS = ["T1", "T2", "T3"];

const safeString = (value) =>
  value === null || value === undefined ? "" : String(value).trim();

const numericOrNull = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  return value;
};

export function getVendorsFromRow(row) {
  return [1, 2, 3]
    .map((slot) => ({
      slot,
      name: safeString(row[`Vendor Name ${slot}`]),
      rate: safeString(row[`Rate ${slot}`]) || "0",
      paymentTerm: safeString(row[`Payment Term ${slot}`]),
      rateType: safeString(row[`Select Rate Type ${slot}`]) || "With Tax",
      withTaxOrNot: safeString(row[`With Tax or Not ${slot}`]) || "Yes",
      taxValue: safeString(row[`Tax Value ${slot}`]) || "0",
      alumina: safeString(row[`Alumina ${slot}`]),
      iron: safeString(row[`Iron ${slot}`]),
      sio2: safeString(row[`SiO2 ${slot}`]),
      cao: safeString(row[`CaO ${slot}`]),
      ap: safeString(row[`AP ${slot}`]),
      bd: safeString(row[`BD ${slot}`]),
      fineness: safeString(row[`Fineness ${slot}`]),
      packaging: safeString(row[`Packaging ${slot}`]),
      quotationNumber: safeString(row[`Quotation Number ${slot}`]),
      quotationDate: safeString(row[`Quotation Date ${slot}`]),
      advancePercentage: safeString(row[`Advance Percentage ${slot}`]),
      technicalTag: safeString(row[`Technical Tag ${slot}`]),
    }))
    .filter((vendor) => vendor.name);
}

export function getTechnicalAssignments(vendors) {
  const assignments = Object.fromEntries(
    TECHNICAL_TAGS.map((tag) => [tag, null]),
  );

  vendors.forEach((vendor) => {
    if (TECHNICAL_TAGS.includes(vendor.technicalTag)) {
      assignments[vendor.technicalTag] = vendor.slot;
    }
  });

  return assignments;
}

export function buildTechnicalTagUpdate(assignments) {
  const update = {};

  [1, 2, 3].forEach((slot) => {
    const tag =
      TECHNICAL_TAGS.find((technicalTag) => assignments[technicalTag] === slot) ||
      null;
    update[`Technical Tag ${slot}`] = tag;
  });

  return update;
}

export function buildApprovedVendorUpdate(vendor) {
  return {
    Vendor: vendor.name || "",
    "Approved Vendor Name": vendor.name || "",
    "Approved Rate": vendor.rate || "0",
    "Approved Payment Term": vendor.paymentTerm || "",
    "With Tax or Not 4": vendor.withTaxOrNot || "Yes",
    "Tax Value 4": vendor.taxValue || "0",
    "Alumina %": numericOrNull(vendor.alumina),
    "Iron %": numericOrNull(vendor.iron),
    "SiO2 %": numericOrNull(vendor.sio2),
    "CaO %": numericOrNull(vendor.cao),
    "AP Percent Age %": numericOrNull(vendor.ap),
    "BD Percent Age %": numericOrNull(vendor.bd),
    Fineness: numericOrNull(vendor.fineness),
    Packaging: vendor.packaging || "",
  };
}

export function compareTechnicalTags(a, b) {
  return TECHNICAL_TAGS.indexOf(a.technicalTag) - TECHNICAL_TAGS.indexOf(b.technicalTag);
}
