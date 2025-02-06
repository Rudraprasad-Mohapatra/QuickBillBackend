const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const qrcode = require('qrcode');
const PDFDocument = require('pdfkit');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors({
    // origin: 'http://localhost:5173',
    origin: 'https://quickbill-rudraprasad-mohapatras-projects.vercel.app',
    methods: 'GET,POST',
    credentials: true,
}));
app.use(bodyParser.json());

const receipts = {};

app.post('/api/generate-invoice', async (req, res) => {
    const { item, quantity, price } = req.body;
    const invoiceData = `Item: ${item}, Quantity: ${quantity}, Price: ${price}`;

    // Generate a unique identifier for the receipt
    const receiptId = uuidv4();
    // const receiptUrl = `http://localhost:3000/api/download-receipt/${receiptId}`;
    const receiptUrl = `https://quickbill-rudraprasad-mohapatras-projects.vercel.app/api/download-receipt/${receiptId}`;

    // Generate QR Code with the receipt URL
    const qrCodeDataURL = await qrcode.toDataURL(receiptUrl);
    const qrCodeBase64 = qrCodeDataURL.split(',')[1];

    // Store the receipt data with the unique identifier
    receipts[receiptId] = invoiceData;

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

    doc.text(invoiceData);
    doc.end();
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
