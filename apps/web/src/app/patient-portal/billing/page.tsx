'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, Badge, Spinner, EmptyState, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Button } from '@ficms/ui';
import { self } from '@/lib/queries';

export default function PatientBilling() {
  const { data: invoices, isLoading } = useQuery({ queryKey: ['me', 'invoices'], queryFn: self.invoices });

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold text-slate-900">My Billing</h1><p className="text-sm text-slate-500">Invoices, installments, and receipts.</p></div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="flex justify-center py-12"><Spinner /></div>
            : !invoices || invoices.length === 0 ? <EmptyState title="No invoices" description="Your invoices and receipts will appear here." />
            : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Invoice #</TableHead><TableHead>Total</TableHead><TableHead>Paid</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead><TableHead>Receipt</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {invoices.map((inv: any) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                      <TableCell>{money(inv.total, inv.currency)}</TableCell>
                      <TableCell>{money(inv.amountPaid, inv.currency)}</TableCell>
                      <TableCell className="font-medium">{money(inv.amountDue, inv.currency)}</TableCell>
                      <TableCell><Badge tone={invTone(inv.status)}>{inv.status.replace('_', ' ')}</Badge></TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => window.print()}>Print</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

function money(n: number, c: string): string { return new Intl.NumberFormat(undefined, { style: 'currency', currency: c || 'USD' }).format(n); }
function invTone(s: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary' {
  if (['PAID'].includes(s)) return 'success';
  if (['ISSUED', 'PARTIALLY_PAID'].includes(s)) return 'info';
  if (['CANCELLED', 'REFUNDED'].includes(s)) return 'danger';
  return 'neutral';
}
