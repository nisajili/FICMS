'use client';

import * as React from 'react';

export interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate?: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  clinicName?: string;
  patient?: { givenName?: string; familyName?: string; medicalRecordNumber?: string };
  currency?: string;
  issuedAt?: string;
  dueDate?: string | null;
  lines?: InvoiceLine[];
  subtotal?: number;
  taxTotal?: number;
  total?: number;
  amountPaid?: number;
  amountDue?: number;
  status?: string;
  notes?: string;
}

/** Print-friendly invoice/receipt (white-label; clinic name from branding). */
export function InvoiceDocument({ invoice, onClose }: { invoice: InvoiceData; onClose?: () => void }) {
  const lines = invoice.lines ?? [];
  const subtotal = invoice.subtotal ?? lines.reduce((s, l) => s + l.totalPrice, 0);
  const taxTotal = invoice.taxTotal ?? 0;
  const total = invoice.total ?? subtotal + taxTotal;
  const amountPaid = invoice.amountPaid ?? 0;
  const amountDue = invoice.amountDue ?? total - amountPaid;

  return (
    <div className="mx-auto max-w-2xl rounded-lg border border-slate-200 bg-white p-8 shadow-sm print:shadow-none print:border-0">
      <div className="no-print mb-4 flex justify-end">
        {onClose && <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700">Close</button>}
      </div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{invoice.clinicName || '{CLINIC_NAME}'}</h1>
          <p className="text-xs text-slate-500">Fertility &amp; IVF Clinic Management System</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-900">Invoice</p>
          <p className="font-mono text-xs text-slate-500">{invoice.invoiceNumber}</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Billed to</p>
          <p className="font-medium text-slate-900">
            {invoice.patient ? `${invoice.patient.givenName ?? ''} ${invoice.patient.familyName ?? ''}` : ''}
          </p>
          {invoice.patient?.medicalRecordNumber && (
            <p className="text-xs text-slate-500">MRN {invoice.patient.medicalRecordNumber}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-slate-400">Issued</p>
          <p className="text-slate-900">{invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString() : '—'}</p>
          {invoice.dueDate && <p className="text-xs text-slate-500">Due {new Date(invoice.dueDate).toLocaleDateString()}</p>}
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="py-2">Description</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Unit</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 && (
            <tr><td colSpan={4} className="py-3 text-slate-400">No line items.</td></tr>
          )}
          {lines.map((l, i) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="py-2 text-slate-900">{l.description}</td>
              <td className="py-2 text-right text-slate-600">{l.quantity}</td>
              <td className="py-2 text-right text-slate-600">{money(l.unitPrice, invoice.currency)}</td>
              <td className="py-2 text-right font-medium text-slate-900">{money(l.totalPrice, invoice.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-end">
        <div className="w-56 space-y-1 text-sm">
          <Row label="Subtotal" value={money(subtotal, invoice.currency)} />
          <Row label="Tax" value={money(taxTotal, invoice.currency)} />
          <Row label="Total" value={money(total, invoice.currency)} bold />
          <Row label="Paid" value={money(amountPaid, invoice.currency)} />
          <Row label="Balance due" value={money(amountDue, invoice.currency)} bold />
        </div>
      </div>

      <div className="mt-8 border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
        <p>Thank you for choosing {invoice.clinicName || '{CLINIC_NAME}'}.</p>
        <p>This is a system-generated document.</p>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={bold ? 'font-semibold text-slate-900' : 'text-slate-500'}>{label}</span>
      <span className={bold ? 'font-semibold text-slate-900' : 'text-slate-900'}>{value}</span>
    </div>
  );
}

function money(n: number, c?: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: c || 'USD' }).format(n);
}
