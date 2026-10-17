
import { jsPDF } from 'jspdf';
import { Tenant, Payment } from '../types';

export const generateReceiptPDF = (tenant: Tenant, payment: Payment) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text('RENT RECEIPT', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Receipt ID: ${payment.id.toUpperCase()}`, 105, 28, { align: 'center' });
  
  // Content
  doc.setFontSize(12);
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 35, 190, 35);
  
  let y = 50;
  const labels = [
    { label: 'Date:', value: payment.date },
    { label: 'Tenant:', value: tenant.name },
    { label: 'Property:', value: `Property ID: ${tenant.propertyId}` },
    { label: 'Month:', value: payment.month },
    { label: 'Amount Paid:', value: `$${payment.amount.toLocaleString()}` },
    { label: 'Status:', value: payment.status.toUpperCase() },
  ];
  
  labels.forEach(item => {
    doc.setFont('helvetica', 'bold');
    doc.text(item.label, 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(item.value, 60, y);
    y += 10;
  });
  
  // Footer
  doc.setFontSize(10);
  doc.text('Thank you for your payment!', 105, 150, { align: 'center' });
  doc.text('RentFlow Management Systems', 105, 155, { align: 'center' });
  
  // Save/Download
  doc.save(`Receipt_${tenant.name.replace(' ', '_')}_${payment.month}.pdf`);
};

export const getWhatsAppLink = (tenant: Tenant, payment: Payment, template?: string) => {
  // Use provided template or a fallback
  let message = template || `Hola {nombre}! Te enviamos el comprobante del pago de alquiler del mes de {mes}. Monto: ${payment.amount}. Saludos!`;
  
  // Replace placeholders
  message = message
    .replace(/{nombre}/g, tenant.name)
    .replace(/{mes}/g, payment.month)
    .replace(/{monto}/g, payment.amount.toString());

  // Sanitize phone number (remove everything except digits)
  const cleanPhone = tenant.phone.replace(/[^0-9]/g, '');
  
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};
