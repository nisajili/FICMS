'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button, Card, CardContent, CardHeader, CardTitle, Badge, Spinner, EmptyState, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Input, Label,
} from '@ficms/ui';
import { inventory } from '@/lib/queries';

export default function InventoryPage() {
  const qc = useQueryClient();
  const { data: items, isLoading } = useQuery({ queryKey: ['inventory'], queryFn: () => inventory.items({ pageSize: 100 }) });
  const { data: lowStock } = useQuery({ queryKey: ['inventory', 'low'], queryFn: inventory.lowStock });

  const [name, setName] = React.useState('');
  const [sku, setSku] = React.useState('');
  const [qty, setQty] = React.useState('0');
  const [minStock, setMinStock] = React.useState('0');

  const create = useMutation({
    mutationFn: () => inventory.create({ name, sku, quantityOnHand: Number(qty) || 0, minimumStock: Number(minStock) || 0 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); setName(''); setSku(''); },
  });

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold text-slate-900">Inventory</h1><p className="text-sm text-slate-500">Stock, expiry, and low-stock alerts.</p></div>

      <Card>
        <CardHeader><CardTitle>Add Inventory Item</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-1"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
            <div className="space-y-1"><Label>SKU</Label><Input value={sku} onChange={(e) => setSku(e.target.value)} required /></div>
            <div className="space-y-1"><Label>On hand</Label><Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
            <div className="space-y-1"><Label>Min stock</Label><Input type="number" value={minStock} onChange={(e) => setMinStock(e.target.value)} /></div>
            <div className="self-end col-span-full"><Button type="submit" loading={create.isPending}>Add item</Button></div>
          </form>
        </CardContent>
      </Card>

      {lowStock && lowStock.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent>
            <p className="text-sm font-medium text-amber-800">⚠ Low stock ({lowStock.length} items below minimum)</p>
            <ul className="mt-2 list-inside list-disc text-sm text-amber-800">
              {lowStock.map((i: any) => <li key={i.id}>{i.name} — on hand {i.quantityOnHand} / min {i.minimumStock}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="flex justify-center py-12"><Spinner /></div>
            : !items || items.length === 0 ? <EmptyState title="No inventory items" />
            : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Name</TableHead><TableHead>SKU</TableHead><TableHead>On hand</TableHead><TableHead>Min</TableHead><TableHead>Expiry</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {items.map((i: any) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium text-slate-900">{i.name}</TableCell>
                      <TableCell className="font-mono text-xs">{i.sku}</TableCell>
                      <TableCell>{i.quantityOnHand}</TableCell>
                      <TableCell>{i.minimumStock}</TableCell>
                      <TableCell>{i.expiryDate ? new Date(i.expiryDate).toLocaleDateString() : '—'}</TableCell>
                      <TableCell><Badge tone={i.quantityOnHand <= i.minimumStock ? 'warning' : 'success'}>{i.quantityOnHand <= i.minimumStock ? 'Low' : 'In stock'}</Badge></TableCell>
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
