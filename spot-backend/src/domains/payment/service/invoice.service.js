import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import config from '../../../shared/config/env.js';
import { formatTimeInZone } from '../../booking/entity/booking.entity.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INVOICE_DIR = path.resolve(__dirname, '../../../../uploads/invoices');

function ensureInvoiceDir() {
  fs.mkdirSync(INVOICE_DIR, { recursive: true });
}

/**
 * @param {{
 *   invoiceNumber: string,
 *   bookingCode: string,
 *   venueName: string,
 *   fieldName: string,
 *   bookingDate: string,
 *   startsAt: Date | string,
 *   endsAt: Date | string,
 *   amountVnd: number,
 *   provider: string,
 *   paidAt: Date,
 *   playerEmail?: string,
 * }} input
 */
export async function generateInvoicePdf(input) {
  ensureInvoiceDir();
  const fileName = `${input.invoiceNumber.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
  const pdfPath = path.join(INVOICE_DIR, fileName);
  const publicPath = `/uploads/invoices/${fileName}`;

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    doc.fontSize(20).text('SPOT — Payment Receipt', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Invoice: ${input.invoiceNumber}`);
    doc.text(`Booking code: ${input.bookingCode}`);
    doc.text(`Date issued: ${input.paidAt.toISOString()}`);
    doc.moveDown();
    doc.text(`Venue: ${input.venueName}`);
    doc.text(`Field: ${input.fieldName}`);
    doc.text(`Slot: ${input.bookingDate} ${formatTimeInZone(input.startsAt)} – ${formatTimeInZone(input.endsAt)}`);
    doc.moveDown();
    doc.text(`Payment method: ${input.provider}`);
    doc.text(`Amount paid: ${input.amountVnd.toLocaleString('vi-VN')} VND`);
    if (input.playerEmail) {
      doc.text(`Customer: ${input.playerEmail}`);
    }
    doc.moveDown();
    doc.fontSize(10).fillColor('#666').text('Thank you for booking with SPOT.', { align: 'center' });

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return {
    pdfPath,
    publicUrl: `${config.publicBaseUrl.replace(/\/$/, '')}${publicPath}`,
  };
}

export { INVOICE_DIR };
