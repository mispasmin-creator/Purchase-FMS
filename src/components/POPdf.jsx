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
    padding: 30,
    fontSize: 9,
    fontFamily: "Helvetica",
    lineHeight: 1.3,
    backgroundColor: "#fff",
  },
  // Compact Title section with logo
  titleSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
    borderWidth: 1,
    borderColor: "#000",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  sectionTitle: {
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 14,
    flex: 1,
  },
  logo: {
    width: 80,
    height: 80,
    objectFit: "contain",
  },
  logoPlaceholder: {
    width: 80,
  },
  // Main header row with two columns - Compact
  headerRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#000",
    borderTopWidth: 0,
  },
  headerColLeft: {
    width: "55%",
    borderRightWidth: 1,
    borderColor: "#000",
    padding: 4,
  },
  headerColRight: {
    width: "45%",
  },
  detailRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#000",
  },
  detailLabel: {
    width: "45%",
    borderRightWidth: 1,
    borderColor: "#000",
    padding: 3,
    fontSize: 7,
    fontWeight: "bold",
  },
  detailValue: {
    width: "55%",
    padding: 3,
    fontSize: 7,
    fontWeight: "normal",
  },
  // Address section (Consignee & Supplier)
  addressSection: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#000",
    borderTopWidth: 0,
  },
  addressBlock: {
    width: "50%",
    padding: 4,
    borderRightWidth: 1,
    borderColor: "#000",
  },
  addressTitle: {
    fontSize: 7,
    fontWeight: "bold",
    marginBottom: 2,
  },
  addressText: {
    fontSize: 6,
    marginBottom: 1,
    lineHeight: 1.2,
  },
  // Table styles
  table: {
    borderWidth: 1,
    borderColor: "#000",
    borderTopWidth: 0,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#000",
    backgroundColor: "#f5f5f5",
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#000",
  },
  // Table cell styles
  cellSl: {
    width: "6%",
    borderRightWidth: 1,
    borderColor: "#000",
    padding: 4,
    textAlign: "center",
    fontSize: 7,
  },
  cellDesc: {
    width: "34%",
    borderRightWidth: 1,
    borderColor: "#000",
    padding: 4,
    fontSize: 7,
  },
  cellHsn: {
    width: "10%",
    borderRightWidth: 1,
    borderColor: "#000",
    padding: 4,
    textAlign: "center",
    fontSize: 7,
  },
  cellDue: {
    width: "10%",
    borderRightWidth: 1,
    borderColor: "#000",
    padding: 4,
    textAlign: "center",
    fontSize: 7,
  },
  cellQty: {
    width: "12%",
    borderRightWidth: 1,
    borderColor: "#000",
    padding: 4,
    textAlign: "center",
    fontSize: 7,
  },
  cellRate: {
    width: "12%",
    borderRightWidth: 1,
    borderColor: "#000",
    padding: 4,
    textAlign: "right",
    fontSize: 7,
  },
  cellAmount: {
    width: "16%",
    padding: 4,
    textAlign: "right",
    fontSize: 7,
  },
  // Tax row
  taxRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#000",
  },
  taxLabel: {
    width: "70%",
    borderRightWidth: 1,
    borderColor: "#000",
    padding: 4,
    textAlign: "right",
    fontWeight: "bold",
    fontSize: 7,
  },
  taxValue: {
    width: "30%",
    padding: 4,
    textAlign: "right",
    fontWeight: "bold",
    fontSize: 7,
  },
  // Total row
  totalRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#000",
    borderTopWidth: 0,
    padding: 4,
    fontWeight: "bold",
  },
  // Amount in words section
  amountWordsSection: {
    borderWidth: 1,
    borderColor: "#000",
    borderTopWidth: 0,
    padding: 4,
  },
  // Declaration section
  declarationSection: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#000",
    borderTopWidth: 0,
    minHeight: 80,
  },
  declarationLeft: {
    width: "60%",
    borderRightWidth: 1,
    borderColor: "#000",
    padding: 4,
  },
  declarationRight: {
    width: "40%",
    padding: 4,
    textAlign: "center",
    justifyContent: "space-between",
  },
  declarationText: {
    fontSize: 6,
    marginTop: 2,
    lineHeight: 1.2,
  },
  termsText: {
    fontSize: 6,
    marginTop: 4,
    lineHeight: 1.2,
  },
  footer: {
    marginTop: 4,
    fontSize: 6,
    textAlign: "center",
    color: "#000",
  },
  companyHeaderText: {
    fontSize: 6,
    marginBottom: 1,
  },
  boldText: {
    fontWeight: "bold",
  },
});

const POPdf = ({
  companyName = "Passary Minerals Madhya Pvt Ltd - (25-26)",
  companyGstin = "22AAHCP9274B1ZI",
  companyPan = "AAHCP9274B",
  companyAddress = "Kh No 297/2, Akoli, Block Dharsiwa, Raipur",
  billingAddress = "Kh No 297/2, Akoli, Block Dharsiwa, Raipur",
  supplierName = "Passary Minerals Pvt Ltd.(Purchase)",
  supplierAddress = "Vill. Bijabahal, P.O. Kumjharia, Dist. Sundergarh, Odisha 770039",
  supplierGstin = "21AABCP0611Q1ZO",
  orderNumber = "PMMPL/PO/25-26/2555",
  orderDate = "23-Mar-26",
  deliveryDate = "23-Mar-26",
  items = [
    {
      product: "High Alumina Cement P-14",
      hsn: "2523",
      quantity: 10.16,
      rate: 41000.0,
      amount: 416560.0,
    },
  ],
  totalQuantity = 10.16,
  totalAmount = 416560.0,
  gstAmount = 74980.8,
  grandTotal = 491541.0,
  terms = ["Payment within 1 day from invoice date", "E. & O.E."],
  logoUrl = logo,
}) => {
  const formatCurrency = (amount) => {
    return amount.toLocaleString("en-IN", {
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

    const amount = Math.floor(num);
    const paise = Math.round((num - amount) * 100);

    let result = numToWords(amount) + " Rupees";
    if (paise > 0) {
      result += " and " + convert(paise) + " Paise";
    }

    return result + " Only";
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Compact Title Section with Logo */}
        <View style={styles.titleSection}>
          {logoUrl ? (
            <Image src={logoUrl} style={styles.logo} />
          ) : (
            <View style={styles.logoPlaceholder} />
          )}
          <Text style={styles.sectionTitle}>PURCHASE ORDER</Text>
          <View style={styles.logoPlaceholder} />
        </View>

        {/* Compact Header Row with Invoice To and Voucher Details */}
        <View style={styles.headerRow}>
          <View style={styles.headerColLeft}>
            <Text style={styles.companyHeaderText}>Invoice To</Text>
            <Text style={[styles.companyHeaderText, styles.boldText]}>
              {companyName}
            </Text>
            <Text style={styles.companyHeaderText}>{companyAddress}</Text>
            <Text style={styles.companyHeaderText}>MSME No. CG14A0000157</Text>
            <Text style={styles.companyHeaderText}>
              GSTIN/UIN: {companyGstin}
            </Text>
            <Text style={styles.companyHeaderText}>
              State Name: Chhattisgarh, Code: 22
            </Text>
            <Text style={styles.companyHeaderText}>
              CIN: U14100CT2014PTC001598
            </Text>
            <Text style={styles.companyHeaderText}>
              E-Mail: pmmpl@pasmin.com
            </Text>
          </View>

          <View style={styles.headerColRight}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Voucher No.</Text>
              <Text style={styles.detailValue}>{orderNumber}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Dated</Text>
              <Text style={styles.detailValue}>{orderDate}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Mode/Terms of Payment</Text>
              <Text style={styles.detailValue}>1 DAY</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Other References</Text>
              <Text style={styles.detailValue}>Destination</Text>
            </View>
          </View>
        </View>

        {/* Consignee and Supplier Addresses - Compact */}
        <View style={styles.addressSection}>
          <View style={styles.addressBlock}>
            <Text style={styles.addressTitle}>Consignee (Ship to)</Text>
            <Text style={styles.boldText}>{companyName}</Text>
            <Text style={styles.addressText}>{billingAddress}</Text>
            <Text style={styles.addressText}>MSME No. CG14A0000157</Text>
            <Text style={styles.addressText}>e-mail: pmmpl@pasmin.com</Text>
            <Text style={styles.addressText}>GSTIN/UIN : {companyGstin}</Text>
            <Text style={styles.addressText}>
              State Name : Chhattisgarh, Code: 22
            </Text>
          </View>
          <View style={[styles.addressBlock, { borderRightWidth: 0 }]}>
            <Text style={styles.addressTitle}>Supplier (Bill from)</Text>
            <Text style={styles.boldText}>{supplierName}</Text>
            <Text style={styles.addressText}>{supplierAddress}</Text>
            <Text style={styles.addressText}>GSTIN/UIN : {supplierGstin}</Text>
            <Text style={styles.addressText}>
              State Name : Odisha, Code: 21
            </Text>
          </View>
        </View>

        {/* Additional Reference Row - Compact */}
        <View style={[styles.headerRow, { borderTopWidth: 1 }]}>
          <View style={[styles.headerColLeft, { borderRightWidth: 1 }]}>
            <Text style={styles.companyHeaderText}>
              Reference No. &amp; Date.
            </Text>
            <Text style={styles.boldText}>{orderNumber}</Text>
          </View>
          <View style={styles.headerColRight}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Dispatched through</Text>
              <Text style={styles.detailValue}>-</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Mode/Terms of Payment</Text>
              <Text style={styles.detailValue}>1 DAY</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Other References</Text>
              <Text style={styles.detailValue}>Destination</Text>
            </View>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.cellSl}>Sl No.</Text>
            <Text style={styles.cellDesc}>Description of Goods</Text>
            <Text style={styles.cellHsn}>HSN/SAC</Text>
            <Text style={styles.cellDue}>Due on</Text>
            <Text style={styles.cellQty}>Quantity</Text>
            <Text style={styles.cellRate}>Rate per</Text>
            <Text style={styles.cellAmount}>Amount</Text>
          </View>

          {items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.cellSl}>{i + 1}</Text>
              <Text style={styles.cellDesc}>{item.product}</Text>
              <Text style={styles.cellHsn}>{item.hsn || "2523"}</Text>
              <Text style={styles.cellDue}>{deliveryDate}</Text>
              <Text style={styles.cellQty}>{item.quantity.toFixed(4)} MT</Text>
              <Text style={styles.cellRate}>{formatCurrency(item.rate)}</Text>
              <Text style={styles.cellAmount}>
                {formatCurrency(item.amount)}
              </Text>
            </View>
          ))}

          {/* Tax Row */}
          <View style={styles.taxRow}>
            <Text style={styles.taxLabel}>Input IGST</Text>
            <Text style={styles.taxValue}>{formatCurrency(gstAmount)}</Text>
          </View>
          <View style={styles.taxRow}>
            <Text style={styles.taxLabel}>Round Off</Text>
            <Text style={styles.taxValue}>0.20</Text>
          </View>
        </View>

        {/* Total Row */}
        <View style={styles.totalRow}>
          <Text style={{ width: "40%" }}>Total</Text>
          <Text style={{ width: "30%", textAlign: "center" }}>
            {totalQuantity.toFixed(4)} MT
          </Text>
          <Text style={{ width: "30%", textAlign: "right" }}>
            {formatCurrency(grandTotal)}
          </Text>
        </View>

        {/* Amount in Words */}
        <View style={styles.amountWordsSection}>
          <Text style={[styles.companyHeaderText, styles.boldText]}>
            Amount Chargeable (in words)
          </Text>
          <Text style={[styles.companyHeaderText, { marginTop: 1 }]}>
            {numberToWords(grandTotal)} E. &amp; O.E
          </Text>
        </View>

        {/* Declaration and Signature */}
        <View style={styles.declarationSection}>
          <View style={styles.declarationLeft}>
            <Text style={[styles.companyHeaderText, styles.boldText]}>
              Declaration
            </Text>
            <Text style={styles.declarationText}>
              We declare that this invoice shows the actual price of the goods
              described and that all particulars are true and correct.
            </Text>
            <View style={styles.termsText}>
              <Text style={styles.boldText}>Terms and Conditions:</Text>
              {terms.map((term, i) => (
                <Text key={i} style={styles.declarationText}>
                  {i + 1}. {term}
                </Text>
              ))}
            </View>
          </View>
          <View style={styles.declarationRight}>
            <Text style={[styles.companyHeaderText, styles.boldText]}>
              for {companyName}
            </Text>
            <Text style={[styles.companyHeaderText, { marginTop: 20 }]}>
              Company's PAN: {companyPan}
            </Text>
            <View style={{ marginTop: 10 }}>
              <Text style={styles.boldText}>Authorised Signatory</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>SUBJECT TO RAIPUR JURISDICTION</Text>
        <Text style={[styles.footer, { marginTop: 1 }]}>
          This is a Computer Generated Document
        </Text>
      </Page>
    </Document>
  );
};

export default POPdf;
