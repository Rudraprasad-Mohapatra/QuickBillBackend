const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const qrcode = require('qrcode');
const PDFDocument = require('pdfkit');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors({
    // origin: 'https://quickbill-rudraprasad-mohapatras-projects.vercel.app',
    origin: 'http://localhost:5173',
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

app.get('/api/download-receipt/:id', (req, res) => {
    const receiptId = req.params.id;
    const invoiceData = receipts[receiptId];

    if (!invoiceData) {
        return res.status(404).send('Receipt not found');
    }

    // Generate PDF Receipt
    const doc = new PDFDocument();
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
        let pdfData = Buffer.concat(buffers);
        res.setHeader('Content-Disposition', 'attachment; filename="receipt.pdf"');
        res.setHeader('Content-Type', 'application/pdf');
        res.send(pdfData);
    });

    doc.fontSize(16).text('OFFICIAL RECEIPT', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`${invoiceData.vendorName}`, { align: 'center' });
    doc.fontSize(10).text(`${invoiceData.address} | ${invoiceData.contactNumber}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Receipt No: ${invoiceData.receiptNo}`);
    doc.fontSize(10).text(`Date: ${invoiceData.date}`);
    doc.fontSize(10).text(`Time: ${invoiceData.time}`);
    doc.fontSize(10).text(`Currency: ${invoiceData.currency}`);
    doc.moveDown();

    doc.fontSize(12).text('Description          Qty   Unit Price   Total', { align: 'center' });
    let subtotal = 0;
    invoiceData.items.forEach((item) => {
        const total = item.quantity * parseFloat(item.unitPrice);
        subtotal += total;
        doc.fontSize(10).text(`${item.description.padEnd(20)} ${item.quantity.toString().padEnd(5)} ${item.unitPrice.padEnd(10)} ${total.toFixed(2)}`);
    });
    doc.moveDown();

    const tax = subtotal * 0.1;
    const totalPaid = subtotal + tax;
    doc.fontSize(10).text(`Subtotal: ${subtotal.toFixed(2)}`);
    doc.fontSize(10).text(`Tax (10%): ${tax.toFixed(2)}`);
    doc.fontSize(12).text(`Total Paid: ${totalPaid.toFixed(2)}`, { align: 'right' });
    doc.moveDown();

    doc.fontSize(10).text(`Payment Method: ${invoiceData.paymentMethod}`);
    doc.fontSize(10).text(`Card Last 4 Digits: ${invoiceData.cardLast4Digits}`);
    doc.moveDown();

    doc.fontSize(10).text('Authorized Signature & Stamp:');
    doc.moveDown();
    doc.fontSize(10).text('--------------------------------------------', { align: 'center' });

    doc.end();
});

app.get('/', (req, res) => {
    res.send('<h1>Hi</h1>');
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
