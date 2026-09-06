'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState,
} from '@ficms/ui';
import { reports } from '@/lib/queries';
import { ApiClientError } from '@/lib/api';

export default function ReportsPage() {
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [error, setError] = React.useState('');

  const clinical = useQuery({
    queryKey: ['reports', 'clinical', from, to],
    queryFn: () => reports.cycleOutcomes(from || undefined, to || undefined),
  });
  const financial = useQuery({
    queryKey: ['reports', 'financial', from, to],
    queryFn: () => reports.financial(from || undefined, to || undefined),
  });
  const operational = useQuery({
    queryKey: ['reports', 'operational', from, to],
    queryFn: () => reports.operational(from || undefined, to || undefined),
  });

  const exportCsv = async () => {
    try {
      const rows = (await reports.exportClinical()) as any[];
      if (!rows.length) {
        setError('No data to export.');
        return;
      }
      const cols = Object.keys(rows[0]);
      const esc = (v: unknown) => {
        const s = String(v ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'clinical-cycle-export.csv';
      a.click();
      URL.revokeObjectURL(url);
      setError('');
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : 'Export failed.');
    }
  };

  const clinicalData = clinical.data as any;
  const financialData = financial.data as any;
  const operationalData = operational.data as any;

  const outcomeEntries = clinicalData ? Object.entries(clinicalData.outcomes ?? {}) : [];
  const statusEntries = clinicalData ? Object.entries(clinicalData.byStatus ?? {}) : [];
  const methodEntries = financialData ? Object.entries(financialData.byMethod ?? {}) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500">
          Clinical cycle outcomes, financial summary and operational metrics. No patient-identifiable data.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Date range</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <label className="text-sm text-slate-600">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-slate-600">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm" />
          </div>
          <Button variant="outline" onClick={exportCsv}>
            Export clinical CSV
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Clinical — cycle outcomes</CardTitle>
          </CardHeader>
          <CardContent>
            {clinical.isLoading ? (
              <Spinner />
            ) : !clinicalData ? (
              <EmptyState title="No data" description="No cycle data for this period." />
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-500">{clinicalData.denominatorNote}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border p-3">
                    <p className="text-xs font-medium uppercase text-slate-500">Total cycles</p>
                    <p className="text-2xl font-semibold">{clinicalData.total}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs font-medium uppercase text-slate-500">Embryos</p>
                    <p className="text-2xl font-semibold">{clinicalData.embryoTotals}</p>
                  </div>
                </div>
                {outcomeEntries.length > 0 && (
                  <div>
                    <p className="mb-1 text-sm font-medium text-slate-700">Outcomes</p>
                    {outcomeEntries.map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between border-b py-1 text-sm">
                        <span className="text-slate-600">{k}</span>
                        <span className="font-medium">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {statusEntries.length > 0 && (
                  <div>
                    <p className="mb-1 text-sm font-medium text-slate-700">By status</p>
                    {statusEntries.map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between border-b py-1 text-sm">
                        <span className="text-slate-600">{k}</span>
                        <span className="font-medium">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial summary</CardTitle>
          </CardHeader>
          <CardContent>
            {financial.isLoading ? (
              <Spinner />
            ) : !financialData ? (
              <EmptyState title="No data" description="No financial data for this period." />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-md border p-3">
                    <p className="text-xs font-medium uppercase text-slate-500">Invoiced</p>
                    <p className="text-lg font-semibold">{financialData.invoiced}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs font-medium uppercase text-slate-500">Revenue</p>
                    <p className="text-lg font-semibold">{financialData.revenue}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs font-medium uppercase text-slate-500">Outstanding</p>
                    <p className="text-lg font-semibold">{financialData.outstanding}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">{financialData.currencyNote}</p>
                {methodEntries.length > 0 && (
                  <div>
                    <p className="mb-1 text-sm font-medium text-slate-700">By method</p>
                    {methodEntries.map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between border-b py-1 text-sm">
                        <span className="text-slate-600">{k}</span>
                        <span className="font-medium">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Operational summary</CardTitle>
        </CardHeader>
        <CardContent>
          {operational.isLoading ? (
            <Spinner />
          ) : !operationalData ? (
            <EmptyState title="No data" description="No operational data." />
          ) : (
            <div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-md border p-3">
                  <p className="text-xs font-medium uppercase text-slate-500">Appointments</p>
                  <p className="text-2xl font-semibold">{operationalData.appointments}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs font-medium uppercase text-slate-500">Patients</p>
                  <p className="text-2xl font-semibold">{operationalData.patients}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs font-medium uppercase text-slate-500">Low stock items</p>
                  <p className="text-2xl font-semibold">{operationalData.lowStockCount}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-400">{operationalData.note}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
