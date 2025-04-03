import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import Image from 'next/image';

const ReprintReceipt = ({ 
  transactionData, 
  branchName, 
  cashierName, 
  address, 
  paymentMethod, 
  salesId,
  phone
}) => {
  // State to store receipt styling from localStorage
  const [receiptStyles, setReceiptStyles] = useState({
    width: '58mm',
    fontSizes: {
      header: '14pt',
      subHeader: '12pt',
      body: '10pt',
      footer: '9pt'
    },
    fontFamily: '"OCR-A", "Courier", monospace'
  });

  // Load settings from localStorage when component mounts
  useEffect(() => {
    const loadStoredSettings = () => {
      const storedWidth = localStorage.getItem('receiptWidth');
      const storedHeaderFont = localStorage.getItem('headerFontSize');
      const storedSubHeaderFont = localStorage.getItem('subHeaderFontSize');
      const storedBodyFont = localStorage.getItem('bodyFontSize');
      const storedFooterFont = localStorage.getItem('footerFontSize');
      const storedCustomFonts = localStorage.getItem('customFonts');

      // Parse custom fonts
      let customFonts = [];
      if (storedCustomFonts) {
        try {
          customFonts = JSON.parse(storedCustomFonts);
        } catch (error) {
          console.error('Error parsing custom fonts:', error);
        }
      }

      // Create @font-face rules for custom fonts
      if (customFonts && customFonts.length > 0) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'reprint-receipt-custom-fonts';

        // Remove any existing stylesheet to prevent duplicates
        const existingStyleSheet = document.getElementById('reprint-receipt-custom-fonts');
        if (existingStyleSheet) {
          existingStyleSheet.remove();
        }

        customFonts.forEach(font => {
          styleSheet.textContent += `
            @font-face {
              font-family: "${font.name}";
              src: url("${font.url}") format("truetype");
              font-weight: normal;
              font-style: normal;
            }
          `;
        });

        document.head.appendChild(styleSheet);
      }

      // Set primary font to first custom font if available, otherwise use defaults
      const primaryFont = customFonts && customFonts.length > 0
        ? `"${customFonts[0].name}", "OCR-A", "Courier", monospace`
        : '"OCR-A", "Courier", monospace';

      // Only update if we found stored settings
      setReceiptStyles({
        width: storedWidth ? `${storedWidth}mm` : '58mm',
        fontSizes: {
          header: storedHeaderFont ? `${storedHeaderFont}pt` : '14pt',
          subHeader: storedSubHeaderFont ? `${storedSubHeaderFont}pt` : '12pt',
          body: storedBodyFont ? `${storedBodyFont}pt` : '10pt',
          footer: storedFooterFont ? `${storedFooterFont}pt` : '9pt'
        },
        fontFamily: primaryFont
      });
    };

    // Load settings initially
    loadStoredSettings();

    // Set up a listener for storage changes for real-time updates
    const handleStorageChange = () => {
      loadStoredSettings();
    };

    window.addEventListener('storage', handleStorageChange);

    // Clean up event listener on unmount
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      // Clean up the style element
      const customFontStyle = document.getElementById('reprint-receipt-custom-fonts');
      if (customFontStyle) {
        customFontStyle.remove();
      }
    };
  }, []);

  // Table column styles with consistent widths
  const columnStyles = {
    item: { width: '45%', paddingRight: '2mm' },
    qty: { width: '15%', textAlign: 'center', paddingRight: '2mm' },
    price: { width: '20%', textAlign: 'right', paddingRight: '2mm' },
    total: { width: '20%', textAlign: 'right' }
  };

  return (
    <div style={{
      width: receiptStyles.width,
      maxWidth: receiptStyles.width,
      padding: '2mm',
      backgroundColor: 'white',
      color: 'black',
      fontFamily: receiptStyles.fontFamily,
      fontSize: receiptStyles.fontSizes.body,
      fontWeight: 'bold',
      lineHeight: 1.2,
      textAlign: 'left',
      margin: '0 auto',
      minHeight: 'fit-content'
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '2mm',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <p style={{ 
          fontSize: receiptStyles.fontSizes.subHeader, 
          margin: '0 0 1mm 0',
          fontWeight: 'bold'
        }}>REPRINTED RECEIPT</p>
        <Image 
          src="/WhatsApp Image 2025-01-07 at 9.05.41 AM.png" 
          alt="Vet Need Enterprise" 
          width={100} 
          height={100}
          style={{ marginBottom: '3mm' }}
        />
        <h1 style={{
          fontSize: receiptStyles.fontSizes.header,
          fontWeight: 'bold',
          margin: 0
        }}>
          Vet Needs Enterprise
        </h1>
        <p style={{ 
          fontSize: receiptStyles.fontSizes.subHeader, 
          margin: '1mm 0 1mm 0',
          fontWeight: 'bold'
        }}>Duplicate Sales Receipt</p>
        <p style={{
          fontSize: receiptStyles.fontSizes.body,
          margin: '1mm 0',
          textAlign: 'center'
        }}>
          {address}
        </p>
        <p style={{
          fontSize: receiptStyles.fontSizes.subHeader,
          margin: '0 0 1mm 0'
        }}>
          {phone}
        </p>
        <p style={{
          fontSize: receiptStyles.fontSizes.subHeader,
          margin: '0 0 1mm 0'
        }}>
          {format(new Date(), 'yyyy-MM-dd HH:mm:ss')}
        </p>
      </div>

      <div style={{
        borderTop: '1px dashed #000',
        borderBottom: '1px dashed #000',
        padding: '1mm 0',
        margin: '1mm 0'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Branch:</span>
          <span>{branchName}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Cashier:</span>
          <span>{cashierName}</span>
        </div>
      </div>

      {/* Improved table header with consistent spacing */}
      <div style={{
        display: 'flex',
        fontWeight: 'bold',
        borderBottom: '1px solid #000',
        padding: '1mm 0',
        fontSize: receiptStyles.fontSizes.body
      }}>
        <div style={columnStyles.item}>Item</div>
        <div style={columnStyles.qty}>Qty</div>
        <div style={columnStyles.price}>Price</div>
        <div style={columnStyles.total}>Total</div>
      </div>

      {/* Improved item rows with consistent spacing */}
      {transactionData.items.map((item, index) => {
        // Use quantitySold from the reprint data structure
        const itemTotal = item.stockManagement?.type === 'weight' 
          ? item.quantitySold * item.sellingPrice 
          : item.quantitySold * item.sellingPrice;

        return (
          <div 
            key={index} 
            style={{
              display: 'flex',
              borderBottom: '1px dotted #ccc',
              padding: '1mm 0',
              fontSize: receiptStyles.fontSizes.body
            }}
          >
            <div style={columnStyles.item}>{item.name}</div>
            <div style={columnStyles.qty}>
              {item.stockManagement?.type === 'weight'
                ? `${item.quantitySold}${item.stockManagement.weightUnit}`
                : item.quantitySold}
            </div>
            <div style={columnStyles.price}>
              ₦{item.sellingPrice.toFixed(2)}
            </div>
            <div style={columnStyles.total}>
              ₦{itemTotal.toFixed(2)}
            </div>
          </div>
        );
      })}

      <div style={{
        borderTop: '1px dashed #000',
        margin: '1mm 0',
        padding: '1mm 0'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontWeight: 'bold'
        }}>
          <span>Total:</span>
          <span>₦{transactionData.total.toFixed(2)}</span>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: receiptStyles.fontSizes.body
        }}>
          <span>Payment Method:</span>
          <span>{paymentMethod}</span>
        </div>
      </div>

      <div style={{
        textAlign: 'center',
        margin: '2mm 0',
        fontSize: receiptStyles.fontSizes.footer
      }}>
        <p style={{ 
          fontWeight: 'bold',
          margin: '1mm 0'
        }}>Thank you for choosing Vet Needs Enterprise!</p>
        <p style={{ 
          fontSize: receiptStyles.fontSizes.footer,
          margin: '1mm 0',
          fontStyle: 'italic',
          fontWeight: 'bold'
        }}>
          DUPLICATE RECEIPT - For Reference Only
        </p>
        <p style={{ 
          fontSize: receiptStyles.fontSizes.footer,
          margin: '1mm 0',
          fontStyle: 'italic'
        }}>
          Please verify your purchases, as we are not liable for items delivered in good condition.
        </p>
        <p style={{ 
          fontSize: receiptStyles.fontSizes.footer,
          margin: '1mm 0'
        }}>
          We look forward to serving you again!
        </p>
        <p style={{ 
          fontSize: receiptStyles.fontSizes.footer,
          margin: '1mm 0'
        }}>
          Sales ID: {salesId}
        </p>
      </div>
    </div>
  );
};

export default ReprintReceipt;