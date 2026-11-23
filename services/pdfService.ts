import { jsPDF } from 'jspdf';
import { Tenant, Payment, Property, Expense, PdfConfig } from '../types';
import { DEFAULT_WS_REMINDER_TEMPLATE, DEFAULT_WS_CONFIRMATION_TEMPLATE, DEFAULT_PDF_CONFIG } from '../data/mockData';

// Formateador de número de recibo a 4 dígitos limpios (ej: 0001, 4985)
export const formatReceiptNumber = (paymentId: string | number): string => {
  if (!paymentId) return '0001';
  const str = String(paymentId);
  const digits = str.replace(/\D/g, '');
  if (!digits) return '0001';
  if (digits.length <= 4) {
    return digits.padStart(4, '0');
  }
  return digits.slice(-4);
};

export const generateReceiptPDF = (
  tenant: Tenant, 
  payment: Payment, 
  property?: Property, 
  pdfConfig?: PdfConfig
) => {
  const doc = new jsPDF();
  const cfg = { ...DEFAULT_PDF_CONFIG, ...(pdfConfig || {}) };
  const rate = payment.exchangeRate || 52.50;
  const amountBs = (payment.amountBs !== undefined && payment.amountBs !== null && Number(payment.amountBs) > 0)
    ? Number(payment.amountBs)
    : (payment.amount * rate);
  const receiptNumber = formatReceiptNumber(payment.id);

  // Colores corporativos
  const primaryColor: [number, number, number] = [79, 70, 229]; // Indigo #4f46e5
  const darkColor: [number, number, number] = [30, 41, 59]; // Slate-800
  const grayColor: [number, number, number] = [100, 116, 139]; // Slate-500
  const lightBg: [number, number, number] = [248, 250, 252]; // Slate-50

  // 1. Encabezado / Banner
  doc.setFillColor(...lightBg);
  doc.roundedRect(15, 12, 180, 36, 4, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...primaryColor);
  doc.text(cfg.companyName || 'Rental by Ocor', 22, 24);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayColor);
  doc.text(`RIF / Doc: ${cfg.companyRif || 'J-26866132-4'}  |  Teléfono: ${cfg.companyPhone || ''}`, 22, 31);
  doc.text(`${cfg.companyAddress || ''}`, 22, 37);

  // Etiqueta de Recibo
  doc.setFillColor(...primaryColor);
  doc.roundedRect(145, 18, 44, 22, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('RECIBO DE PAGO', 167, 26, { align: 'center' });
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`N° ${receiptNumber}`, 167, 34, { align: 'center' });

  // 2. Información del Inquilino y Propiedad (Título Centrado)
  let y = 58;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...darkColor);
  doc.text('INFORMACIÓN GENERAL', 105, y, { align: 'center' });

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(15, y + 2, 195, y + 2);

  y += 10;
  const col1X = 18;
  const col2X = 110;

  doc.setFontSize(9);
  
  // Columna Izquierda (Inquilino)
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text('Inquilino:', col1X, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayColor);
  doc.text(tenant.name, col1X + 28, y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text('Cédula / ID:', col1X, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayColor);
  doc.text(tenant.idNumber || 'No especificada', col1X + 28, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text('Teléfono:', col1X, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayColor);
  doc.text(tenant.phone, col1X + 28, y + 14);

  if (tenant.email) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkColor);
    doc.text('Email:', col1X, y + 21);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...grayColor);
    doc.text(tenant.email, col1X + 28, y + 21);
  }

  // Columna Derecha (Propiedad)
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text('Inmueble:', col2X, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayColor);
  doc.text(property?.name || `Propiedad #${tenant.propertyId}`, col2X + 25, y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text('Ubicación:', col2X, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayColor);
  doc.text(property?.address || 'Dirección registrada', col2X + 25, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text('Tipo:', col2X, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayColor);
  const typeMap: Record<string, string> = {
    Apartment: 'Departamento',
    House: 'Casa',
    Warehouse: 'Galpón',
    Annex: 'Anexo'
  };
  doc.text(typeMap[property?.type || ''] || property?.type || 'Residencial', col2X + 25, y + 14);

  // 3. Tabla de Desglose del Pago (Títulos centrados)
  y += 32;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...darkColor);
  doc.text('DETALLE DEL PAGO', 105, y, { align: 'center' });
  doc.line(15, y + 2, 195, y + 2);

  y += 8;
  doc.setFillColor(241, 245, 249);
  doc.rect(15, y, 180, 8, 'F');

  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.text('CONCEPTO', 48, y + 5.5, { align: 'center' });
  doc.text('MES / PERIODO', 98, y + 5.5, { align: 'center' });
  doc.text('ESTADO', 138, y + 5.5, { align: 'center' });
  doc.text('SUBTOTAL (USD)', 175, y + 5.5, { align: 'center' });

  y += 14;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text(`Canon de Arrendamiento`, 20, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayColor);
  doc.text(payment.month, 98, y, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105); // Verde
  doc.text('PAGADO', 138, y, { align: 'center' });

  const baseRent = tenant.includeInternet ? (payment.amount - 10) : payment.amount;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text(`$${baseRent.toLocaleString()}`, 175, y, { align: 'center' });

  if (tenant.includeInternet) {
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...darkColor);
    doc.text(`Servicio de Internet`, 20, y);
    doc.setTextColor(...grayColor);
    doc.text(payment.month, 98, y, { align: 'center' });
    doc.setTextColor(5, 150, 105);
    doc.text('INCLUIDO', 138, y, { align: 'center' });
    doc.setTextColor(...darkColor);
    doc.text(`$10.00`, 175, y, { align: 'center' });
  }

  // Línea divisoria
  y += 8;
  doc.setDrawColor(226, 232, 240);
  doc.line(15, y, 195, y);

  // 4. Totales en USD y Bolívares (monto fijo registrado en el pago)
  y += 10;
  doc.setFillColor(...lightBg);
  doc.roundedRect(105, y, 90, 34, 3, 3, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayColor);
  doc.text('Fecha de Pago:', 112, y + 8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text(payment.date, 188, y + 8, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...darkColor);
  doc.text('TOTAL EN DÓLARES:', 112, y + 17);
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text(`$${payment.amount.toLocaleString()}`, 188, y + 17, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...darkColor);
  doc.text('TOTAL EN BOLÍVARES:', 112, y + 26);
  doc.setFontSize(11);
  doc.setTextColor(5, 150, 105);
  doc.text(`Bs. ${amountBs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 188, y + 26, { align: 'right' });

  // 5. Notas legales y pie de página
  y += 46;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, y, 180, 26, 3, 3, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text('NOTAS Y CONDICIONES:', 20, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayColor);
  const splitNotes = doc.splitTextToSize(cfg.notes || 'Comprobante válido de pago de alquiler.', 170);
  doc.text(splitNotes, 20, y + 13);

  // Sello Digital / Footer
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Rental by Ocor Property Management - Generado digitalmente de forma segura.', 105, 280, { align: 'center' });

  // Descargar PDF (Con número de 4 dígitos)
  const sanitizedName = tenant.name.replace(/\s+/g, '_');
  doc.save(`Recibo_${sanitizedName}_${payment.month}_N${receiptNumber}.pdf`);
};

// Generador de Reporte Mensual de Gastos y Balance de Caja
export const generateMonthlyExpensesReportPDF = (
  month: string,
  year: number | string,
  expenses: Expense[],
  payments: Payment[],
  properties: Property[],
  bcvRate: number = 52.50,
  pdfConfig?: PdfConfig
) => {
  const doc = new jsPDF();
  const cfg = { ...DEFAULT_PDF_CONFIG, ...(pdfConfig || {}) };

  // Colores corporativos
  const primaryColor: [number, number, number] = [79, 70, 229]; // Indigo
  const darkColor: [number, number, number] = [30, 41, 59]; // Slate-800
  const grayColor: [number, number, number] = [100, 116, 139]; // Slate-500
  const lightBg: [number, number, number] = [248, 250, 252]; // Slate-50
  const roseColor: [number, number, number] = [244, 63, 94]; // Rose

  // Cálculos financieros para el mes seleccionado
  const monthPayments = payments.filter(p => {
    const isSameMonth = p.month && p.month.toLowerCase().trim().startsWith(month.toLowerCase().trim().substring(0, 3));
    const isSameYear = !p.date || p.date.startsWith(String(year));
    return isSameMonth && isSameYear;
  });
  const totalIncomeUSD = monthPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalIncomeBs = totalIncomeUSD * bcvRate;

  const monthExpenses = expenses.filter(e => {
    const isSameMonth = e.month && e.month.toLowerCase().trim().startsWith(month.toLowerCase().trim().substring(0, 3));
    const isSameYear = !e.date || e.date.startsWith(String(year));
    return isSameMonth && isSameYear;
  });
  const totalExpensesUSD = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalExpensesBs = monthExpenses.reduce((sum, e) => sum + (Number(e.amountBs) || (Number(e.amount) * (e.exchangeRate || bcvRate))), 0);

  const netBalanceUSD = totalIncomeUSD - totalExpensesUSD;
  const netBalanceBs = totalIncomeBs - totalExpensesBs;
  const retentionRate = totalIncomeUSD > 0 ? Math.round((netBalanceUSD / totalIncomeUSD) * 100) : 0;

  // 1. Banner Header
  doc.setFillColor(...lightBg);
  doc.roundedRect(15, 12, 180, 36, 4, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...primaryColor);
  doc.text(cfg.companyName || 'RentFlow Inversiones Inmobiliarias', 22, 23);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayColor);
  doc.text(`RIF: ${cfg.companyRif || 'J-40582914-8'} | Tel: ${cfg.companyPhone || ''} | ${cfg.companyEmail || ''}`, 22, 30);
  doc.text(`${cfg.companyAddress || 'Control Administrativo de Inmuebles y Rentas'}`, 22, 36);

  // Etiqueta de Reporte
  doc.setFillColor(...primaryColor);
  doc.roundedRect(138, 16, 52, 25, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('REPORTE MENSUAL', 164, 22, { align: 'center' });
  doc.setFontSize(9.5);
  doc.text(`${month.toUpperCase()} ${year}`, 164, 30, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tasa BCV: ${Number(bcvRate).toFixed(2)} Bs/$`, 164, 37, { align: 'center' });

  // 2. Resumen Ejecutivo de Caja
  let y = 56;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...darkColor);
  doc.text('BALANCE GENERAL DE INGRESOS Y GASTOS', 105, y, { align: 'center' });
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(15, y + 2, 195, y + 2);

  y += 8;
  // Caja 1: Ingresos Cobrados
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(15, y, 56, 26, 3, 3, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text('TOTAL ALQUILERES', 20, y + 7);
  doc.setFontSize(12);
  doc.text(`$${totalIncomeUSD.toLocaleString()}`, 20, y + 16);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`≈ Bs. ${totalIncomeBs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 20, y + 22);

  // Caja 2: Gastos Totales
  doc.setFillColor(255, 241, 242);
  doc.roundedRect(77, y, 56, 26, 3, 3, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(159, 18, 57);
  doc.text('GASTOS TOTALES', 82, y + 7);
  doc.setFontSize(12);
  doc.text(`$${totalExpensesUSD.toLocaleString()}`, 82, y + 16);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`≈ Bs. ${totalExpensesBs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 82, y + 22);

  // Caja 3: Balance Neto Restante
  const isPositive = netBalanceUSD >= 0;
  doc.setFillColor(...(isPositive ? [238, 242, 255] as [number, number, number] : [254, 242, 242] as [number, number, number]));
  doc.roundedRect(139, y, 56, 26, 3, 3, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...(isPositive ? primaryColor : roseColor));
  doc.text(isPositive ? 'SALDO RESTANTE (NETO)' : 'DÉFICIT EN CAJA', 144, y + 7);
  doc.setFontSize(12);
  doc.text(`${isPositive ? '+' : ''}$${netBalanceUSD.toLocaleString()}`, 144, y + 16);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Retención neta: ${retentionRate}%`, 144, y + 22);

  // 3. Desglose de Gastos por Categoría
  y += 36;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...darkColor);
  doc.text('DISTRIBUCIÓN DE GASTOS POR CATEGORÍA', 15, y);

  y += 4;
  doc.setFillColor(241, 245, 249);
  doc.rect(15, y, 180, 7, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(...grayColor);
  doc.text('CATEGORÍA', 18, y + 4.8);
  doc.text('N° GASTOS', 80, y + 4.8, { align: 'center' });
  doc.text('MONTO (USD)', 125, y + 4.8, { align: 'right' });
  doc.text('MONTO (BS)', 160, y + 4.8, { align: 'right' });
  doc.text('% TOTAL', 190, y + 4.8, { align: 'right' });

  // Agrupar gastos por categoría
  const categoryMap: Record<string, { count: number; usd: number; bs: number }> = {};
  monthExpenses.forEach(exp => {
    const cat = exp.category || 'Otros';
    if (!categoryMap[cat]) categoryMap[cat] = { count: 0, usd: 0, bs: 0 };
    const usd = Number(exp.amount) || 0;
    const bs = Number(exp.amountBs) || (usd * (exp.exchangeRate || bcvRate));
    categoryMap[cat].count += 1;
    categoryMap[cat].usd += usd;
    categoryMap[cat].bs += bs;
  });

  const catEntries = Object.entries(categoryMap).sort((a, b) => b[1].usd - a[1].usd);
  y += 7;
  doc.setFontSize(8);
  if (catEntries.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...grayColor);
    doc.text('No hay gastos registrados en este período.', 18, y + 5);
    y += 8;
  } else {
    catEntries.forEach(([cat, data], idx) => {
      const rowBg = idx % 2 === 0 ? 255 : 250;
      doc.setFillColor(rowBg, rowBg, rowBg);
      doc.rect(15, y, 180, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkColor);
      doc.text(cat, 18, y + 4.2);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...grayColor);
      doc.text(String(data.count), 80, y + 4.2, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkColor);
      doc.text(`$${data.usd.toLocaleString()}`, 125, y + 4.2, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.text(`Bs. ${data.bs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 160, y + 4.2, { align: 'right' });

      const pct = totalExpensesUSD > 0 ? Math.round((data.usd / totalExpensesUSD) * 100) : 0;
      doc.text(`${pct}%`, 190, y + 4.2, { align: 'right' });
      y += 6;
    });
  }

  // 4. Detalle de Gastos del Mes
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...darkColor);
  doc.text('DETALLE INDIVIDUAL DE GASTOS', 15, y);

  y += 4;
  doc.setFillColor(241, 245, 249);
  doc.rect(15, y, 180, 7, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(...grayColor);
  doc.text('FECHA', 18, y + 4.8);
  doc.text('INMUEBLE / CASA', 45, y + 4.8);
  doc.text('CONCEPTO / DETALLE', 90, y + 4.8);
  doc.text('CATEGORÍA', 140, y + 4.8);
  doc.text('TOTAL USD', 170, y + 4.8, { align: 'right' });
  doc.text('TOTAL BS', 192, y + 4.8, { align: 'right' });

  y += 7;
  doc.setFontSize(7.5);
  if (monthExpenses.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...grayColor);
    doc.text('No hay gastos registrados para este mes.', 18, y + 5);
    y += 10;
  } else {
    monthExpenses.forEach((exp, idx) => {
      // Salto de página si excede el límite
      if (y > 265) {
        doc.addPage();
        y = 20;
        doc.setFillColor(241, 245, 249);
        doc.rect(15, y, 180, 7, 'F');
        doc.setFontSize(7.5);
        doc.setTextColor(...grayColor);
        doc.text('FECHA', 18, y + 4.8);
        doc.text('INMUEBLE / CASA', 45, y + 4.8);
        doc.text('CONCEPTO / DETALLE', 90, y + 4.8);
        doc.text('CATEGORÍA', 140, y + 4.8);
        doc.text('TOTAL USD', 170, y + 4.8, { align: 'right' });
        doc.text('TOTAL BS', 192, y + 4.8, { align: 'right' });
        y += 7;
      }

      const rowBg = idx % 2 === 0 ? 255 : 250;
      doc.setFillColor(rowBg, rowBg, rowBg);
      doc.rect(15, y, 180, 6, 'F');

      const prop = properties.find(p => p.id === exp.propertyId);
      const propName = prop ? prop.name : (exp.propertyId ? 'Inmueble' : 'General');
      const usd = Number(exp.amount) || 0;
      const bs = Number(exp.amountBs) || (usd * (exp.exchangeRate || bcvRate));

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...grayColor);
      doc.text(exp.date || '', 18, y + 4.2);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkColor);
      const shortProp = propName.length > 20 ? propName.substring(0, 18) + '...' : propName;
      doc.text(shortProp, 45, y + 4.2);

      doc.setFont('helvetica', 'normal');
      const shortTitle = exp.title.length > 28 ? exp.title.substring(0, 26) + '...' : exp.title;
      doc.text(shortTitle, 90, y + 4.2);
      doc.text(exp.category || 'Otros', 140, y + 4.2);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(159, 18, 57);
      doc.text(`$${usd.toLocaleString()}`, 170, y + 4.2, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...grayColor);
      doc.text(`Bs. ${bs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 192, y + 4.2, { align: 'right' });

      y += 6;
    });
  }

  // Footer y firmas
  if (y > 250) {
    doc.addPage();
    y = 25;
  } else {
    y = Math.max(y + 12, 240);
  }

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(30, y + 16, 85, y + 16);
  doc.line(125, y + 16, 180, y + 16);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text('Administración / Responsable', 57.5, y + 21, { align: 'center' });
  doc.text('Propietario / Auditor', 152.5, y + 21, { align: 'center' });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`Reporte generado por RentFlow Inmobiliario el ${new Date().toLocaleDateString('es-VE')} a las ${new Date().toLocaleTimeString('es-VE')}`, 105, 282, { align: 'center' });

  const safeMonth = month.replace(/\s+/g, '_');
  doc.save(`Reporte_Gastos_${safeMonth}_${year}.pdf`);
};

// Reparador de emojis dañados en plantillas de WhatsApp (solo cuando existen caracteres '?' o Unicode replacement)
export const repairTemplateEmojis = (template: string): string => {
  if (!template) return template;
  let text = template;
  
  // 1. Plantilla de Recordatorio:
  text = text.replace(/^(\?|\uFFFD|\u25A1|\u2753)+\s*\*Recordatorio/gm, '📅 *Recordatorio');
  text = text.replace(/\*Recordatorio de Pago de Alquiler\*\s*(\?|\uFFFD|\u25A1|\u2753)+/g, '*Recordatorio de Pago de Alquiler* 🏠');
  text = text.replace(/(\?|\uFFFD|\u25A1|\u2753)+\s*\*Canon de Alquiler/g, '💵 *Canon de Alquiler');
  text = text.replace(/(\?|\uFFFD|\u25A1|\u2753)+\s*\*Total en Bol[ií]vares/g, '🇻🇪 *Total en Bolívares');
  text = text.replace(/(\?|\uFFFD|\u25A1|\u2753)+\s*\*Monto en Bol[ií]vares/g, '🇻🇪 *Monto en Bolívares');
  text = text.replace(/¡Muchas gracias por su puntualidad!\s*(\?|\uFFFD|\u25A1|\u2753)+/g, '¡Muchas gracias por su puntualidad! ✨');

  // 2. Plantilla de Confirmación:
  text = text.replace(/^(\?|\uFFFD|\u25A1|\u2753)+\s*\*Confirmaci[oó]n/gm, '✅ *Confirmación');
  text = text.replace(/\*Confirmaci[oó]n de Pago Recibido\*\s*(\?|\uFFFD|\u25A1|\u2753)+/g, '*Confirmación de Pago Recibido* 🎉');
  text = text.replace(/(\?|\uFFFD|\u25A1|\u2753)+\s*\*Mes:/g, '🗓 *Mes:');
  text = text.replace(/(\?|\uFFFD|\u25A1|\u2753)+\s*\*Monto:/g, '💵 *Monto:');
  text = text.replace(/(\?|\uFFFD|\u25A1|\u2753)+\s*\*Equivalente/g, '🇻🇪 *Equivalente');
  text = text.replace(/(\?|\uFFFD|\u25A1|\u2753)+\s*\*Fecha de Pago:/g, '📅 *Fecha de Pago:');
  text = text.replace(/emitido( y archivado)?\.\s*(\?|\uFFFD|\u25A1|\u2753)+/g, 'emitido y archivado. 📄✨');
  
  return text;
};

// Normalizar números de teléfono para WhatsApp (añadir código de país si falta)
export const formatWhatsAppPhone = (phone: string): string => {
  let cleaned = (phone || '').replace(/[^0-9]/g, '');
  if (!cleaned) return '';

  // Caso Venezuela: 0412 / 0414 / 0424 / 0416 / 0426 (11 dígitos comenzando en 0)
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '58' + cleaned.slice(1);
  } else if (!cleaned.startsWith('58') && cleaned.length === 10 && (
    cleaned.startsWith('412') || cleaned.startsWith('414') || 
    cleaned.startsWith('424') || cleaned.startsWith('416') || cleaned.startsWith('426')
  )) {
    cleaned = '58' + cleaned;
  }
  return cleaned;
};

// Constructor de URL oficial de WhatsApp con preservación de UTF-8 de emojis
export const buildWhatsAppApiUrl = (phone: string, rawMessage: string): string => {
  const cleanPhone = formatWhatsAppPhone(phone);
  const cleanMessage = repairTemplateEmojis(rawMessage);
  // Se utiliza api.whatsapp.com/send para evitar la redirección 302 de wa.me,
  // la cual corrompe los emojis UTF-8 en signos '?' o reemplazos unicode.
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(cleanMessage)}`;
};

// Generador de enlace WhatsApp para Recordatorio de Pago (antes del vencimiento / 1ro de mes)
export const getWhatsAppReminderLink = (
  tenant: Tenant, 
  pendingPayment?: Payment, 
  template?: string, 
  bcvRate: number = 52.50
) => {
  let message = repairTemplateEmojis(template || DEFAULT_WS_REMINDER_TEMPLATE);
  const amount = pendingPayment?.amount || tenant.monthlyRent;
  const rate = pendingPayment?.exchangeRate || bcvRate;
  const amountBs = pendingPayment?.amountBs || (amount * rate);
  const month = pendingPayment?.month || 'Mes en Curso';

  message = message
    .replace(/{nombre}/g, tenant.name)
    .replace(/{mes}/g, month)
    .replace(/{monto}/g, amount.toLocaleString())
    .replace(/{montoBs}/g, amountBs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
    .replace(/{tasa}/g, Number(rate || 52.50).toFixed(2))
    .replace(/{dias}/g, '5')
    .replace(/{cedula}/g, tenant.idNumber || '');

  return buildWhatsAppApiUrl(tenant.phone, message);
};

// Generador de enlace WhatsApp para Confirmación de Pago Recibido (comprobante)
export const getWhatsAppConfirmationLink = (
  tenant: Tenant, 
  payment: Payment, 
  template?: string, 
  bcvRate: number = 52.50
) => {
  let message = repairTemplateEmojis(template || DEFAULT_WS_CONFIRMATION_TEMPLATE);
  const rate = payment.exchangeRate || bcvRate;
  const amountBs = payment.amountBs || (payment.amount * rate);

  message = message
    .replace(/{nombre}/g, tenant.name)
    .replace(/{mes}/g, payment.month)
    .replace(/{monto}/g, payment.amount.toLocaleString())
    .replace(/{montoBs}/g, amountBs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
    .replace(/{fecha}/g, payment.date)
    .replace(/{tasa}/g, Number(rate || 52.50).toFixed(2))
    .replace(/{reciboId}/g, formatReceiptNumber(payment.id))
    .replace(/{cedula}/g, tenant.idNumber || '');

  return buildWhatsAppApiUrl(tenant.phone, message);
};

// Compatibilidad retroactiva
export const getWhatsAppLink = (tenant: Tenant, payment: Payment, template?: string, bcvRate?: number) => {
  if (payment.status === 'paid') {
    return getWhatsAppConfirmationLink(tenant, payment, template, bcvRate);
  }
  return getWhatsAppReminderLink(tenant, payment, template, bcvRate);
};
