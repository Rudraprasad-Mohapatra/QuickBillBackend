const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const qrcode = require('qrcode');
const PDFDocument = require('pdfkit');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors({
    origin: 'https://quickbill-rudraprasad-mohapatras-projects.vercel.app',
    // origin: 'http://localhost:5173',
    methods: 'GET,POST',
    credentials: true,
}));
app.use(bodyParser.json());

const receipts = {};

app.post('/api/generate-invoice', async (req, res) => {
    const {
        vendorName,
        address,
        contactNumber,
        receiptNo,
        date,
        time,
        currency,
        items,
        paymentMethod,
        cardLast4Digits,
    } = req.body;

    // Generate a unique identifier for the receipt
    const receiptId = uuidv4();
    // const receiptUrl = `https://quickbillbackend-production.up.railway.app/api/download-receipt/${receiptId}`;
    const receiptUrl = `http://localhost:3000/api/download-receipt/${receiptId}`;
    // Generate QR Code with the receipt URL
    const qrCodeDataURL = await qrcode.toDataURL(receiptUrl);
    const qrCodeBase64 = qrCodeDataURL.split(',')[1];

    // Store the receipt data with the unique identifier
    receipts[receiptId] = {
        vendorName,
        address,
        contactNumber,
        receiptNo,
        date: date || new Date().toLocaleDateString(),
        time: time || new Date().toLocaleTimeString(),
        currency,
        items,
        paymentMethod,
        cardLast4Digits,
    };

    res.json({
        qrCode: qrCodeBase64,
        receiptUrl: receiptUrl,
    });
});

// app.get('/api/download-receipt/:id', (req, res) => {
//     const receiptId = req.params.id;
//     const invoiceData = receipts[receiptId];

//     if (!invoiceData) {
//         return res.status(404).send('Receipt not found');
//     }

//     // Generate PDF
//     const doc = new PDFDocument({ margin: 50 });
//     let buffers = [];
//     doc.on('data', buffers.push.bind(buffers));
//     doc.on('end', () => {
//         const pdfData = Buffer.concat(buffers);
//         res.setHeader('Content-Disposition', 'attachment; filename="receipt.pdf"');
//         res.setHeader('Content-Type', 'application/pdf');
//         res.send(pdfData);
//     });

//     // Header
//     doc.fontSize(20).text('OFFICIAL RECEIPT', { align: 'center', underline: true });
//     doc.moveDown();

//     // Vendor Information
//     doc.fontSize(12).text(`Vendor: ${invoiceData.vendorName}`, { align: 'left' });
//     doc.text(`Address: ${invoiceData.address}`, { align: 'left', width: 400 });
//     doc.text(`Contact: ${invoiceData.contactNumber}`, { align: 'left' });
//     doc.moveDown();

//     // Receipt Details
//     doc.text(`Receipt No: ${invoiceData.receiptNo}`, { align: 'left' });
//     doc.text(`Date: ${invoiceData.date}`, { align: 'left' });
//     doc.text(`Time: ${invoiceData.time}`, { align: 'left' });
//     doc.text(`Currency: ${invoiceData.currency}`, { align: 'left' });
//     doc.moveDown();

//     // Table Headers
//     doc.fontSize(12);
//     const startX = 50;
//     const descWidth = 200;
//     const qtyWidth = 50;
//     const unitPriceWidth = 80;
//     const totalWidth = 80;

//     const curY = doc.y
//     doc.text('Description', startX, curY, { width: descWidth, bold: true });
//     doc.text('Qty', startX + descWidth, curY, { width: qtyWidth, align: 'right', bold: true });
//     doc.text('Unit Price', startX + descWidth + qtyWidth, curY, { width: unitPriceWidth, align: 'right', bold: true });
//     doc.text('Total', startX + descWidth + qtyWidth + unitPriceWidth, curY, { width: totalWidth, align: 'right', bold: true });
//     doc.moveDown();

//     // Line Under Header
//     doc.moveTo(startX, doc.y).lineTo(520, doc.y).stroke();
//     doc.moveDown();

//     // Table Content
//     let subtotal = 0;
//     invoiceData.items.forEach((item) => {
//         const total = item.quantity * parseFloat(item.unitPrice);
//         subtotal += total;

//         const currentY = doc.y; // Keep the y position consistent

//         doc.fontSize(10).text(item.description, startX, currentY, { width: descWidth, lineGap: 2 });
//         doc.text(item.quantity.toString(), startX + descWidth, currentY, { width: qtyWidth, align: 'right' });
//         doc.text(`$${item.unitPrice}`, startX + descWidth + qtyWidth, currentY, { width: unitPriceWidth, align: 'right' });
//         doc.text(`$${total.toFixed(2)}`, startX + descWidth + qtyWidth + unitPriceWidth, currentY, { width: totalWidth, align: 'right' });

//         doc.moveDown();
//     });

//     // Line Under Items
//     doc.moveTo(startX, doc.y).lineTo(520, doc.y).stroke();
//     doc.moveDown();

//     // Calculations Section (aligned properly)
//     const calcX = startX + descWidth + qtyWidth + unitPriceWidth;
//     doc.fontSize(12);
//     doc.text(`Subtotal: $${subtotal.toFixed(2)}`, calcX, doc.y, { width: totalWidth, align: 'right' });
//     doc.text(`Tax (10%): $${(subtotal * 0.1).toFixed(2)}`, calcX, doc.y, { width: totalWidth, align: 'right' });

//     doc.fontSize(14).text(`Total Paid: $${(subtotal * 1.1).toFixed(2)}`, calcX, doc.y, { width: totalWidth, align: 'right', bold: true });
//     doc.moveDown();

//     // Payment Information
//     doc.fontSize(12).text(`Payment Method: ${invoiceData.paymentMethod}`, { align: 'left' });
//     doc.text(`Card Last 4 Digits: **** **** **** ${invoiceData.cardLast4Digits}`, { align: 'left' });
//     doc.moveDown();

//     // Signature Line
//     doc.text('Authorized Signature & Stamp:', { align: 'left' });
//     doc.moveDown();
//     doc.text('--------------------------------------------', { align: 'center' });

//     doc.end();
// });


app.get('/api/download-receipt/:id', (req, res) => {
    const receiptId = req.params.id;
    const invoiceData = receipts[receiptId];

    if (!invoiceData) {
        return res.status(404).send('Receipt not found');
    }

    // Create PDF with better margins and layout
    const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
        bufferPages: true
    });

    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        res.setHeader('Content-Disposition', `attachment; filename="receipt-${receiptId}.pdf"`);
        res.setHeader('Content-Type', 'application/pdf');
        res.send(pdfData);
    });

    // Add decorative header background
    doc.rect(0, 0, doc.page.width, 150)
        .fill('#f8f9fa');

    // Header section with improved styling
    doc.font('Helvetica-Bold')
        .fontSize(28)
        .fillColor('#2c3e50')
        .text('OFFICIAL RECEIPT', 50, 50, { align: 'center' });

    // Receipt number with styled box
    doc.rect(doc.page.width - 250, 100, 200, 30)
        .fill('#ffffff')
        .stroke('#e9ecef');

    doc.fontSize(12)
        .fillColor('#2c3e50')
        .text(`Receipt #: ${invoiceData.receiptNo}`,
            doc.page.width - 240,
            108);

    // Vendor and Customer Information with better styling
    const startY = 180;

    // From section with background
    doc.rect(50, startY - 10, 250, 100)
        .fill('#f8f9fa')
        .stroke('#e9ecef');

    doc.font('Helvetica-Bold')
        .fontSize(14)
        .fillColor('#2c3e50')
        .text('From:', 70, startY);

    doc.font('Helvetica')
        .fontSize(11)
        .text(invoiceData.vendorName, 70, startY + 20)
        .text(invoiceData.address)
        .text(`Contact: ${invoiceData.contactNumber}`);

    // Bill To section with background
    doc.rect(320, startY - 10, 250, 100)
        .fill('#f8f9fa')
        .stroke('#e9ecef');

    doc.font('Helvetica-Bold')
        .fontSize(14)
        .text('Bill To:', 340, startY);

    doc.font('Helvetica')
        .fontSize(11)
        .text(invoiceData.customerName || 'Valued Customer', 340, startY + 20)
        .text(invoiceData.customerAddress || '');

    // Receipt Details with improved formatting and icons
    doc.moveDown(4);
    const detailsY = doc.y;
    doc.rect(50, detailsY - 10, doc.page.width - 100, 40)
        .fill('#ffffff')
        .stroke('#e9ecef');

    doc.font('Helvetica-Bold')
        .fontSize(11)
        .text('Date:', 70, detailsY)
        .font('Helvetica')
        .text(moment(invoiceData.date).format('MMMM DD, YYYY'), 120, detailsY)
        .font('Helvetica-Bold')
        .text('Time:', 270, detailsY)
        .font('Helvetica')
        .text(invoiceData.time, 320, detailsY)
        .font('Helvetica-Bold')
        .text('Currency:', 470, detailsY)
        .font('Helvetica')
        .text(invoiceData.currency, 530, detailsY);

    // Items Table with enhanced styling
    doc.moveDown(2);
    const tableTop = doc.y;
    const tableHeaders = ['Description', 'Qty', 'Unit Price', 'Total'];
    const columnWidths = [250, 70, 100, 100];

    // Table Header with gradient background
    doc.rect(50, tableTop - 5, doc.page.width - 100, 30)
        .fill('#f8f9fa');

    doc.fillColor('#2c3e50')
        .font('Helvetica-Bold')
        .fontSize(12);

    let xOffset = 70;
    tableHeaders.forEach((header, i) => {
        const align = i === 0 ? 'left' : 'right';
        doc.text(header, xOffset, tableTop + 5, {
            width: columnWidths[i],
            align: align
        });
        xOffset += columnWidths[i];
    });

    // Table Content with improved styling
    doc.font('Helvetica')
        .fontSize(11);
    let yPosition = tableTop + 35;
    let subtotal = 0;

    invoiceData.items.forEach((item, index) => {
        const total = item.quantity * parseFloat(item.unitPrice);
        subtotal += total;

        // Zebra striping for rows
        if (index % 2 === 0) {
            doc.rect(50, yPosition - 5, doc.page.width - 100, 25)
                .fill('#f8f9fa');
        }

        doc.fillColor('#2c3e50');
        xOffset = 70;

        doc.text(item.description, xOffset, yPosition, {
            width: columnWidths[0],
            align: 'left'
        });
        xOffset += columnWidths[0];

        doc.text(item.quantity.toString(), xOffset, yPosition, {
            width: columnWidths[1],
            align: 'right'
        });
        xOffset += columnWidths[1];

        doc.text(`$${parseFloat(item.unitPrice).toFixed(2)}`, xOffset, yPosition, {
            width: columnWidths[2],
            align: 'right'
        });
        xOffset += columnWidths[2];

        doc.text(`$${total.toFixed(2)}`, xOffset, yPosition, {
            width: columnWidths[3],
            align: 'right'
        });

        yPosition += 25;
    });

    // Totals section with enhanced styling
    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    // Create a styled box for totals
    doc.rect(350, yPosition + 10, doc.page.width - 400, 100)
        .fill('#f8f9fa')
        .stroke('#e9ecef');

    yPosition += 25;
    const totalsX = 370;
    const totalsValueX = 520;

    doc.font('Helvetica')
        .text('Subtotal:', totalsX, yPosition)
        .text(`$${subtotal.toFixed(2)}`, totalsValueX, yPosition, { align: 'right' });

    yPosition += 25;
    doc.text('Tax (10%):', totalsX, yPosition)
        .text(`$${tax.toFixed(2)}`, totalsValueX, yPosition, { align: 'right' });

    yPosition += 25;
    doc.font('Helvetica-Bold')
        .fontSize(12)
        .text('Total:', totalsX, yPosition)
        .text(`$${total.toFixed(2)}`, totalsValueX, yPosition, { align: 'right' });

    // Payment Information with styled box
    doc.moveDown(4);
    const paymentY = doc.y;
    doc.rect(50, paymentY - 10, 300, 80)
        .fill('#f8f9fa')
        .stroke('#e9ecef');

    doc.font('Helvetica-Bold')
        .fontSize(12)
        .text('Payment Information', 70, paymentY);

    doc.font('Helvetica')
        .fontSize(11)
        .moveDown(0.5)
        .text(`Method: ${invoiceData.paymentMethod}`, 70)
        .text(`Card: **** **** **** ${invoiceData.cardLast4Digits}`);

    // Footer with styling
    const footerY = doc.page.height - 100;
    doc.rect(0, footerY - 20, doc.page.width, 120)
        .fill('#f8f9fa');

    doc.font('Helvetica-Bold')
        .fontSize(12)
        .fillColor('#2c3e50')
        .text('Thank you for your business!', 0, footerY, { align: 'center' });

    doc.font('Helvetica')
        .fontSize(10)
        .fillColor('#6c757d')
        .moveDown(0.5)
        .text('This is a computer-generated document. No signature required.', { align: 'center' });

    doc.end();
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});