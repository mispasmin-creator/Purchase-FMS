import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

import logo from "../assets/logo.jpeg";

const styles = StyleSheet.create({
  page: {
    padding: 25,
    fontSize: 9,
    fontFamily: "Helvetica",
    lineHeight: 1.3,
    backgroundColor: "#fff",
  },

  // ===== HEADER SECTION =====
  headerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
    borderBottomWidth: 2,
    borderColor: "#333",
    paddingBottom: 6,
  },

  logoSection: {
    width: "15%",
  },

  logo: {
    width: 60,
    height: 60,
    objectFit: "contain",
  },

  companySection: {
    width: "50%",
    paddingLeft: 8,
  },

  companyName: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 2,
    color: "#000",
  },

  companyDetails: {
    fontSize: 7,
    marginBottom: 1,
    color: "#333",
  },

  poSection: {
    width: "35%",
    borderLeft: 1,
    borderColor: "#999",
    paddingLeft: 8,
  },

  poHeaderLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#555",
    marginBottom: 3,
  },

  poNumber: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 3,
  },

  poDetailRow: {
    flexDirection: "row",
    marginBottom: 2,
    fontSize: 7,
  },

  poDetailLabel: {
    width: "45%",
    fontWeight: "bold",
    color: "#555",
  },

  poDetailValue: {
    width: "55%",
    color: "#000",
  },

  // ===== ADDRESS SECTION =====
  addressSection: {
    flexDirection: "row",
    marginBottom: 8,
    gap: 8,
  },

  addressBlock: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 6,
    backgroundColor: "#f9f9f9",
  },

  addressBlockTitle: {
    fontSize: 8,
    fontWeight: "bold",
    marginBottom: 3,
    color: "#333",
    textDecoration: "underline",
  },

  addressBlockLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#555",
    marginTop: 2,
  },

  addressBlockValue: {
    fontSize: 7,
    color: "#000",
    marginBottom: 1,
    lineHeight: 1.2,
  },

  // ===== KEY INFO ROW =====
  keyInfoRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },

  infoBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 5,
    backgroundColor: "#f5f5f5",
  },

  infoBoxLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 2,
  },

  infoBoxValue: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#000",
  },

  // ===== TABLE STYLES - UPDATED WITH SPEC COLUMNS =====
  table: {
    borderWidth: 1,
    borderColor: "#000",
    marginBottom: 6,
  },

  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#000",
    backgroundColor: "#e8e8e8",
    fontWeight: "bold",
  },

  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },

  tableSummaryRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#000",
    fontWeight: "bold",
    backgroundColor: "#f5f5f5",
  },

  // Updated cell widths for spec columns
  cellSl: {
    width: "4%",
    borderRightWidth: 1,
    borderColor: "#ddd",
    padding: 4,
    textAlign: "center",
    fontSize: 7,
  },

  cellDesc: {
    width: "25%",
    borderRightWidth: 1,
    borderColor: "#ddd",
    padding: 4,
    fontSize: 7,
  },

  cellQty: {
    width: "8%",
    borderRightWidth: 1,
    borderColor: "#ddd",
    padding: 4,
    textAlign: "center",
    fontSize: 7,
  },

  cellRate: {
    width: "10%",
    borderRightWidth: 1,
    borderColor: "#ddd",
    padding: 4,
    textAlign: "right",
    fontSize: 7,
  },

  // New spec column styles
  cellSpec: {
    width: "8%",
    borderRightWidth: 1,
    borderColor: "#ddd",
    padding: 4,
    textAlign: "center",
    fontSize: 7,
  },

  cellAmount: {
    width: "13%",
    padding: 4,
    textAlign: "right",
    fontSize: 7,
  },

  // ===== SUMMARY SECTION =====
  summarySection: {
    marginBottom: 8,
  },

  summaryRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#ddd",
    paddingVertical: 4,
    paddingHorizontal: 6,
  },

  summaryLabel: {
    width: "70%",
    fontSize: 8,
    fontWeight: "bold",
    color: "#333",
  },

  summaryValue: {
    width: "30%",
    fontSize: 8,
    fontWeight: "bold",
    textAlign: "right",
    color: "#000",
  },

  totalRow: {
    flexDirection: "row",
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: "#000",
    paddingVertical: 5,
    paddingHorizontal: 6,
    backgroundColor: "#f0f0f0",
  },

  totalLabel: {
    width: "70%",
    fontSize: 10,
    fontWeight: "bold",
    color: "#000",
  },

  totalValue: {
    width: "30%",
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "right",
    color: "#000",
  },

  // ===== ITEM-WISE SPECS SECTION (Alternative/Additional display) =====
  // Replace these styles in your POPdf.js file

  itemSpecsSection: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 4, // Reduced from 6
    marginBottom: 4, // Reduced from 6
    backgroundColor: "#f9f9f9",
  },

  itemSpecsTitle: {
    fontSize: 8,
    fontWeight: "bold",
    marginBottom: 3, // Reduced from 6
    color: "#333",
    textDecoration: "underline",
  },

  itemSpecBlock: {
    marginBottom: 4, // Reduced from 8
    borderBottomWidth: 0, // Changed from 1 to 0 - remove border
    paddingBottom: 2, // Reduced from 6
    flexDirection: "row", // Added - horizontal layout
    alignItems: "flex-start", // Added
    flexWrap: "wrap", // Added
  },

  itemSpecName: {
    fontSize: 8,
    fontWeight: "bold",
    marginBottom: 2, // Reduced from 3
    color: "#000",
    width: "20%", // Added - fixed width for material name
    paddingRight: 4, // Added
  },

  itemSpecGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4, // Reduced from 8
    width: "80%", // Added
  },

  itemSpecItem: {
    flexDirection: "row",
    width: "auto", // Changed from 30% to auto
    minWidth: "23%", // Added - responsive width
    marginBottom: 2, // Added
    marginRight: 4, // Added
  },

  itemSpecLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#555",
    width: "auto", // Changed from 45%
    marginRight: 2, // Added
  },

  itemSpecValue: {
    fontSize: 7,
    color: "#000",
    width: "auto", // Changed from 55%
  },

  // ===== AMOUNT IN WORDS SECTION =====
  amountWordsSection: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 6,
    marginBottom: 6,
    backgroundColor: "#fafafa",
  },

  amountWordsLabel: {
    fontSize: 8,
    fontWeight: "bold",
    marginBottom: 2,
    color: "#333",
  },

  amountWordsText: {
    fontSize: 8,
    color: "#000",
    lineHeight: 1.4,
  },

  notesSection: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 6,
    marginBottom: 6,
    backgroundColor: "#fafafa",
  },

  notesTitle: {
    fontSize: 8,
    fontWeight: "bold",
    marginBottom: 2,
    color: "#333",
  },

  notesText: {
    fontSize: 7,
    color: "#000",
    lineHeight: 1.4,
  },

  // ===== DECLARATION SECTION =====
  declarationSection: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
  },

  declarationLeft: {
    width: "65%",
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 6,
    backgroundColor: "#f9f9f9",
  },

  declarationRight: {
    width: "35%",
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 6,
    backgroundColor: "#f9f9f9",
    textAlign: "center",
  },

  declarationTitle: {
    fontSize: 8,
    fontWeight: "bold",
    marginBottom: 3,
    color: "#333",
    textDecoration: "underline",
  },

  declarationText: {
    fontSize: 6.5,
    marginBottom: 2,
    lineHeight: 1.3,
    color: "#000",
  },

  termsTitle: {
    fontSize: 7,
    fontWeight: "bold",
    marginTop: 4,
    marginBottom: 2,
    color: "#333",
  },

  termItem: {
    fontSize: 6.5,
    marginBottom: 1,
    lineHeight: 1.2,
    color: "#000",
  },

  signatureLabel: {
    fontSize: 7,
    fontWeight: "bold",
    marginTop: 6,
    marginBottom: 1,
    color: "#333",
  },

  signatureLine: {
    borderTopWidth: 1,
    borderColor: "#000",
    marginTop: 20,
    paddingTop: 2,
    fontSize: 6.5,
    color: "#666",
  },

  companyForLabel: {
    fontSize: 7,
    fontWeight: "bold",
    marginBottom: 2,
    color: "#333",
  },

  panText: {
    fontSize: 6,
    color: "#666",
    marginTop: 2,
  },

  // ===== FOOTER =====
  footer: {
    fontSize: 6,
    textAlign: "center",
    color: "#666",
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderColor: "#ddd",
  },

  footerText: {
    marginBottom: 1,
  },
});

const POPdf = ({
  companyName = "Passary Minerals Madhya Pvt Ltd",
  companyGstin = "22AAHCP9274B1ZI",
  companyPan = "AAHCP9274B",
  companyPhone = "771-4001598",
  companyAddress = "Kh No 297/2, Akoli, Block Dharsiwa, Raipur",
  billingAddress = "Kh No 297/2, Akoli, Block Dharsiwa, Raipur",
  destinationAddress = "Destination",
  supplierName = "Supplier Name",
  supplierAddress = "Supplier Address",
  supplierGstin = "Supplier GSTIN",
  orderNumber = "PMMPL/PO/25-26/2555",
  orderDate = "23-03-2026",
  deliveryDate = "23-03-2026",
  items = [
    {
      product: "High Alumina Cement P-14",
      quantity: 10.16,
      unit: "MT",
      rate: 41000.0,
      amount: 416560.0,
      specs: {
        alumina: "",
        iron: "",
        sio2: "",
        cao: "",
        ap: "",
        bd: "",
        fineness: "",
      },
      packaging: "", // Add this
    },
  ],
  totalQuantity = 10.16,
  totalAmount = 416560.0,
  gstAmount = 74980.8,
  grandTotal = 491541.0,
  gstPercent = 18,
  discountPercent = 0,
  terms = [
    "Price is ex factory",
    "Subject to Raipur Jurisdiction",
    "Payment: 1 Day",
  ],
  logoUrl = logo,
  labDetails = null,
  paymentTerms = "1 DAY",
  notes = "",
}) => {
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return "0.00";
    return Number(amount).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const numberToWords = (num) => {
    const ones = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];
    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];

    const convert = (n) => {
      if (n < 20) return ones[n];
      if (n < 100)
        return (
          tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "")
        );
      if (n < 1000)
        return (
          ones[Math.floor(n / 100)] +
          " Hundred" +
          (n % 100 !== 0 ? " and " + convert(n % 100) : "")
        );
      return "";
    };

    const numToWords = (n) => {
      if (n === 0) return "Zero";

      let words = "";
      const cr = Math.floor(n / 10000000);
      n %= 10000000;
      const la = Math.floor(n / 100000);
      n %= 100000;
      const th = Math.floor(n / 1000);
      n %= 1000;
      const hu = n;

      if (cr > 0) words += convert(cr) + " Crore ";
      if (la > 0) words += convert(la) + " Lakh ";
      if (th > 0) words += convert(th) + " Thousand ";
      if (hu > 0) words += (words !== "" ? " " : "") + convert(Math.floor(hu));

      return words.trim();
    };

    const amount = isNaN(num) ? 0 : Math.floor(num);
    const paise = isNaN(num) ? 0 : Math.round((num - amount) * 100);

    let result = numToWords(amount) + " Rupees";
    if (paise > 0) {
      result += " and " + convert(paise) + " Paise";
    }

    return result + " Only";
  };

  // Check if any item has specs to display in the separate section
  const hasAnySpecs = items.some(
    (item) =>
      (item.specs &&
        Object.values(item.specs).some(
          (v) => v && String(v).trim() !== "" && v !== "null" && v !== "0",
        )) ||
      (item.packaging &&
        item.packaging.trim() !== "" &&
        item.packaging !== "null"),
  );

  // Check if we should use the legacy labDetails section (for backward compatibility)
  const hasLegacyLabDetails =
    labDetails &&
    Object.values(labDetails).some(
      (v) => v && String(v).trim() !== "" && v !== "null",
    );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ===== HEADER SECTION ===== */}
        <View style={styles.headerSection}>
          {/* Logo */}
          <View style={styles.logoSection}>
            {logoUrl ? <Image src={logoUrl} style={styles.logo} /> : null}
          </View>

          {/* Company Details */}
          <View style={styles.companySection}>
            <Text style={styles.companyName}>{companyName}</Text>
            <Text style={styles.companyDetails}>{companyAddress}</Text>
            <Text style={styles.companyDetails}>Phone: {companyPhone}</Text>
            <Text style={styles.companyDetails}>
              GSTIN: {companyGstin} | PAN: {companyPan}
            </Text>
            <Text style={styles.companyDetails}>Email: pmmpl@pasmin.com</Text>
          </View>

          {/* PO Details */}
          <View style={styles.poSection}>
            <Text style={styles.poHeaderLabel}>PURCHASE ORDER</Text>
            <Text style={styles.poNumber}>{orderNumber}</Text>
            <View style={styles.poDetailRow}>
              <Text style={styles.poDetailLabel}>Date:</Text>
              <Text style={styles.poDetailValue}>{orderDate}</Text>
            </View>
            <View style={styles.poDetailRow}>
              <Text style={styles.poDetailLabel}>Delivery Date:</Text>
              <Text style={styles.poDetailValue}>{deliveryDate}</Text>
            </View>
            <View style={styles.poDetailRow}>
              <Text style={styles.poDetailLabel}>Payment Terms:</Text>
              <Text style={styles.poDetailValue}>{paymentTerms}</Text>
            </View>
          </View>
        </View>

        {/* ===== ADDRESS SECTION ===== */}
        <View style={styles.addressSection}>
          {/* Bill To / Consignee */}
          <View style={styles.addressBlock}>
            <Text style={styles.addressBlockTitle}>BILL TO / CONSIGNEE</Text>
            <Text style={styles.addressBlockValue}>{companyName}</Text>
            <Text style={styles.addressBlockValue}>{billingAddress}</Text>
            <Text style={styles.addressBlockLabel}>Destination:</Text>
            <Text style={styles.addressBlockValue}>{destinationAddress}</Text>
          </View>

          {/* Supplier */}
          <View style={styles.addressBlock}>
            <Text style={styles.addressBlockTitle}>SUPPLIER / VENDOR</Text>
            <Text style={styles.addressBlockValue}>{supplierName}</Text>
            <Text style={styles.addressBlockValue}>{supplierAddress}</Text>
            <Text style={styles.addressBlockLabel}>GSTIN:</Text>
            <Text style={styles.addressBlockValue}>{supplierGstin}</Text>
          </View>
        </View>

        {/* ===== KEY INFO ROW ===== */}
        <View style={styles.keyInfoRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxLabel}>GST Rate</Text>
            <Text style={styles.infoBoxValue}>{gstPercent}%</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxLabel}>Discount</Text>
            <Text style={styles.infoBoxValue}>{discountPercent}%</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxLabel}>Total Items</Text>
            <Text style={styles.infoBoxValue}>{items.length}</Text>
          </View>
        </View>

        {/* ===== ITEMS TABLE WITH SPEC COLUMNS ===== */}
        <View style={styles.table}>
          {/* Header - Updated with spec columns */}
          <View style={styles.tableHeader}>
            <Text style={styles.cellSl}>Sl.</Text>
            <Text style={styles.cellDesc}>Description</Text>
            <Text style={styles.cellQty}>Qty</Text>
            <Text style={styles.cellRate}>Rate</Text>
            <Text style={styles.cellSpec}>Al₂O₃%</Text>
            <Text style={styles.cellSpec}>Fe%</Text>
            <Text style={styles.cellSpec}>SiO₂%</Text>
            <Text style={styles.cellSpec}>CaO%</Text>
            <Text style={styles.cellAmount}>Amount</Text>
          </View>

          {/* Rows - Updated to display per-item specs */}
          {items.map((item, idx) => {
            const qty = parseFloat(item.quantity || 0);
            const rate = parseFloat(item.rate || 0);
            const amt = parseFloat(item.amount || qty * rate);
            const specs = item.specs || {};

            return (
              <View key={idx} style={styles.tableRow}>
                <Text style={styles.cellSl}>{idx + 1}</Text>
                <Text style={styles.cellDesc}>{item.product || "Product"}</Text>
                <Text style={styles.cellQty}>
                  {qty.toFixed(2)} {item.unit || "MT"}
                </Text>
                <Text style={styles.cellRate}>{formatCurrency(rate)}</Text>
                <Text style={styles.cellSpec}>
                  {specs.alumina && specs.alumina !== "0"
                    ? `${specs.alumina}%`
                    : "-"}
                </Text>
                <Text style={styles.cellSpec}>
                  {specs.iron && specs.iron !== "0" ? `${specs.iron}%` : "-"}
                </Text>
                <Text style={styles.cellSpec}>
                  {specs.sio2 && specs.sio2 !== "0" ? `${specs.sio2}%` : "-"}
                </Text>
                <Text style={styles.cellSpec}>
                  {specs.cao && specs.cao !== "0" ? `${specs.cao}%` : "-"}
                </Text>
                <Text style={styles.cellAmount}>{formatCurrency(amt)}</Text>
              </View>
            );
          })}

          {/* Summary Rows */}
          <View style={styles.tableSummaryRow}>
            <Text style={styles.cellSl}></Text>
            <Text style={styles.cellDesc}>Subtotal</Text>
            <Text style={styles.cellQty}>{totalQuantity.toFixed(2)}</Text>
            <Text style={styles.cellRate}></Text>
            <Text style={styles.cellSpec}></Text>
            <Text style={styles.cellSpec}></Text>
            <Text style={styles.cellSpec}></Text>
            <Text style={styles.cellSpec}></Text>
            <Text style={styles.cellAmount}>{formatCurrency(totalAmount)}</Text>
          </View>

          {discountPercent > 0 && (
            <View style={styles.tableSummaryRow}>
              <Text style={styles.cellSl}></Text>
              <Text style={styles.cellDesc}>Discount ({discountPercent}%)</Text>
              <Text style={styles.cellQty}></Text>
              <Text style={styles.cellRate}></Text>
              <Text style={styles.cellSpec}></Text>
              <Text style={styles.cellSpec}></Text>
              <Text style={styles.cellSpec}></Text>
              <Text style={styles.cellSpec}></Text>
              <Text style={styles.cellAmount}>
                {formatCurrency((totalAmount * discountPercent) / 100)}
              </Text>
            </View>
          )}

          <View style={styles.tableSummaryRow}>
            <Text style={styles.cellSl}></Text>
            <Text style={styles.cellDesc}>GST ({gstPercent}%)</Text>
            <Text style={styles.cellQty}></Text>
            <Text style={styles.cellRate}></Text>
            <Text style={styles.cellSpec}></Text>
            <Text style={styles.cellSpec}></Text>
            <Text style={styles.cellSpec}></Text>
            <Text style={styles.cellSpec}></Text>
            <Text style={styles.cellAmount}>{formatCurrency(gstAmount)}</Text>
          </View>
        </View>

        {/* ===== GRAND TOTAL ===== */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>GRAND TOTAL</Text>
          <Text style={styles.totalValue}>{formatCurrency(grandTotal)}</Text>
        </View>

        {/* ===== ITEM-WISE SPECIFICATIONS SECTION (Detailed View) ===== */}
        {/* This provides a cleaner, more detailed view of specs per material */}
        {/* ===== ITEM-WISE SPECIFICATIONS SECTION (Compact Layout) ===== */}
        {hasAnySpecs && (
          <View style={styles.itemSpecsSection}>
            <Text style={styles.itemSpecsTitle}>Material Specifications</Text>
            {items.map((item, idx) => {
              const specs = item.specs || {};
              const packaging = item.packaging || labDetails?.packaging || "";

              // Build specs array for display
              const specItems = [];
              if (
                specs.alumina &&
                specs.alumina !== "0" &&
                specs.alumina !== ""
              ) {
                specItems.push({ label: "Al₂O₃", value: `${specs.alumina}%` });
              }
              if (specs.iron && specs.iron !== "0" && specs.iron !== "") {
                specItems.push({ label: "Fe", value: `${specs.iron}%` });
              }
              if (specs.sio2 && specs.sio2 !== "0" && specs.sio2 !== "") {
                specItems.push({ label: "SiO₂", value: `${specs.sio2}%` });
              }
              if (specs.cao && specs.cao !== "0" && specs.cao !== "") {
                specItems.push({ label: "CaO", value: `${specs.cao}%` });
              }
              if (specs.ap && specs.ap !== "0" && specs.ap !== "") {
                specItems.push({ label: "AP", value: `${specs.ap}%` });
              }
              if (specs.bd && specs.bd !== "0" && specs.bd !== "") {
                specItems.push({ label: "BD", value: `${specs.bd}%` });
              }
              if (
                specs.fineness &&
                specs.fineness !== "0" &&
                specs.fineness !== ""
              ) {
                specItems.push({ label: "Fineness", value: specs.fineness });
              }

              // Add packaging if available
              if (packaging && packaging !== "" && packaging !== "null") {
                specItems.push({ label: "Pkg", value: packaging });
              }

              if (specItems.length === 0) return null;

              return (
                <View key={idx} style={styles.itemSpecBlock} wrap={false}>
                  <Text style={styles.itemSpecName}>
                    {idx + 1}. {item.product || "Product"}
                  </Text>
                  <View style={styles.itemSpecGrid}>
                    {specItems.map((spec, specIdx) => (
                      <View key={specIdx} style={styles.itemSpecItem}>
                        <Text style={styles.itemSpecLabel}>{spec.label}:</Text>
                        <Text style={styles.itemSpecValue}>{spec.value}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ===== LEGACY LAB SPECIFICATIONS SECTION (Backward Compatible) ===== */}
        {/* This section is kept for backward compatibility with older PO formats */}
        {hasLegacyLabDetails && !hasAnySpecs && (
          <View style={styles.specsSection}>
            <Text style={styles.specsTitle}>Lab Specifications</Text>
            <View style={styles.specsGrid}>
              {[
                { label: "Alumina", value: labDetails.alumina, suffix: "%" },
                { label: "Iron", value: labDetails.iron, suffix: "%" },
                { label: "SiO2", value: labDetails.sio2, suffix: "%" },
                { label: "CaO", value: labDetails.cao, suffix: "%" },
                { label: "AP", value: labDetails.ap, suffix: "%" },
                { label: "BD", value: labDetails.bd, suffix: "%" },
                { label: "Fineness", value: labDetails.fineness, suffix: "" },
                { label: "Packaging", value: labDetails.packaging, suffix: "" },
              ].map((spec, idx) => {
                const val = String(spec.value || "").trim();
                if (!val || val.toLowerCase() === "null" || val === "0")
                  return null;
                return (
                  <View key={idx} style={styles.specItem}>
                    <Text style={styles.specLabel}>{spec.label}:</Text>
                    <Text style={styles.specValue}>
                      {val}
                      {spec.suffix}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ===== AMOUNT IN WORDS ===== */}
        <View style={styles.amountWordsSection}>
          <Text style={styles.amountWordsLabel}>Amount in Words:</Text>
          <Text style={styles.amountWordsText}>
            {numberToWords(grandTotal)}
          </Text>
        </View>

        {String(notes || "").trim() && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{String(notes).trim()}</Text>
          </View>
        )}

        {/* ===== DECLARATION & SIGNATURE ===== */}
        <View style={styles.declarationSection}>
          {/* Declaration */}
          <View style={styles.declarationLeft}>
            <Text style={styles.declarationTitle}>Declaration</Text>
            <Text style={styles.declarationText}>
              We declare that this purchase order is issued in accordance with
              our requirements and that all particulars are true and correct.
            </Text>

            <Text style={styles.termsTitle}>Terms & Conditions:</Text>
            {terms.map((term, idx) => (
              <Text key={idx} style={styles.termItem}>
                • {term}
              </Text>
            ))}
          </View>

          {/* Signature */}
          <View style={styles.declarationRight}>
            <Text style={styles.companyForLabel}>For {companyName}</Text>
            <Text style={styles.panText}>PAN: {companyPan}</Text>

            <View style={styles.signatureLine}>
              <Text>Authorized Signatory</Text>
            </View>

            <Text style={styles.panText}>Name & Designation</Text>
          </View>
        </View>

        {/* ===== FOOTER ===== */}
        <Text style={styles.footer}>
          <Text style={styles.footerText}>Subject to Raipur Jurisdiction</Text>
        </Text>
        <Text style={styles.footer}>
          <Text style={styles.footerText}>
            This is a Computer Generated Document - No Signature Required
          </Text>
        </Text>
      </Page>
    </Document>
  );
};

export default POPdf;
