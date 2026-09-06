'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Spinner,
  EmptyState,
  Button,
} from '@ficms/ui';
import { cryo, patients, hr } from '@/lib/queries';
import { ApiClientError } from '@/lib/api';

const ITEM_TYPES = ['EMBRYO', 'OOCYTE', 'SPERM', 'TISSUE'];
const statusTone = (s: string): any =>
  s === 'RELEASED' ? 'danger' : s === 'STORED' ? 'success' : 'warning';

export default function CryostoragePage() {
  const qc = useQueryClient();
  const [selectedTank, setSelectedTank] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState('');
  const [releaseFor, setReleaseFor] = React.useState<string | null>(null);

  const tanks = useQuery({ queryKey: ['cryo', 'tanks'], queryFn: cryo.tanks });
  const items = useQuery({ queryKey: ['cryo', 'items'], queryFn: () => cryo.items() });
  const patientsQ = useQuery({ queryKey: ['cryoPatients'], queryFn: () => patients.list({ pageSize: 200 }) });
  const staffQ = useQuery({ queryKey: ['cryoStaff'], queryFn: () => hr.staff() });
  const map = useQuery({
    queryKey: ['cryo', 'map', selectedTank],
    queryFn: () => cryo.map(selectedTank!),
    enabled: !!selectedTank,
  });

  const tankRows = (tanks.data ?? []) as any[];
  const itemRows = (items.data ?? []) as any[];
  const patientRows = (patientsQ.data ?? []) as any[];
  const staffRows = (staffQ.data ?? []) as any[];
  const mapData = map.data as any;
  const activeTank = tankRows.find((t) => t.id === selectedTank) ?? null;

  // Auto-select the first tank once loaded.
  React.useEffect(() => {
    if (!selectedTank && tankRows.length > 0) setSelectedTank(tankRows[0].id);
  }, [tankRows, selectedTank]);

  const createTank = useMutation({
    mutationFn: (body: Record<string, unknown>) => cryo.createTank(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cryo', 'tanks'] }),
    onError: (e: unknown) => setMsg(e instanceof ApiClientError ? e.message : 'Create tank failed.'),
  });
  const createPosition = useMutation({
    mutationFn: (body: Record<string, unknown>) => cryo.createPosition(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cryo', 'map', selectedTank] }),
    onError: (e: unknown) => setMsg(e instanceof ApiClientError ? e.message : 'Create position failed.'),
  });
  const store = useMutation({
    mutationFn: (body: Record<string, unknown>) => cryo.store(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cryo', 'items'] });
      qc.invalidateQueries({ queryKey: ['cryo', 'map', selectedTank] });
      setMsg('Item stored.');
    },
    onError: (e: unknown) => setMsg(e instanceof ApiClientError ? e.message : 'Store failed.'),
  });
  const release = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => cryo.release(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cryo', 'items'] });
      qc.invalidateQueries({ queryKey: ['cryo', 'map', selectedTank] });
      setReleaseFor(null);
      setMsg('Item released (witnessed).');
    },
    onError: (e: unknown) => setMsg(e instanceof ApiClientError ? e.message : 'Release failed.'),
  });
  const logTemp = useMutation({
    mutationFn: (body: Record<string, unknown>) => cryo.logTemperature(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cryo', 'tanks'] });
      qc.invalidateQueries({ queryKey: ['cryo', 'map', selectedTank] });
      setMsg('Temperature logged.');
    },
    onError: (e: unknown) => setMsg(e instanceof ApiClientError ? e.message : 'Log temperature failed.'),
  });

  if (tanks.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const positions = mapData?.positions ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Cryostorage</h1>
        <p className="text-sm text-slate-500">Tanks, positions, stored items, and temperature monitoring.</p>
      </div>

      {msg && <p className="text-sm text-slate-600">{msg}</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tanks */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Tanks</CardTitle></CardHeader>
          <CardContent>
            {tankRows.length === 0 ? (
              <EmptyState title="No cryostorage tanks yet" />
            ) : (
              <div className="space-y-2">
                {tankRows.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-700">{t.name}</span>
                        <Badge tone={t.status === 'active' ? 'success' : 'warning'}>{t.status}</Badge>
                      </div>
                      <div className="text-xs text-slate-500">
                        {t.label || 'No label'} · {t.capacity ?? 0} positions · {t.currentTempC != null ? `${t.currentTempC}°C` : 'no temp'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant={selectedTank === t.id ? 'secondary' : 'outline'} onClick={() => setSelectedTank(t.id)}>
                        {selectedTank === t.id ? 'Selected' : 'View map'}
                      </Button>
                      <form
                        className="flex items-center gap-1"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const fd = new FormData(e.currentTarget);
                          logTemp.mutate({ tankId: t.id, tempC: Number(fd.get('tempC')), source: 'manual' });
                          (e.currentTarget.querySelector('input[name="tempC"]') as HTMLInputElement).value = '';
                        }}
                      >
                        <input
                          name="tempC"
                          type="number"
                          step="0.1"
                          placeholder="Temp °C"
                          className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm"
                        />
                        <Button type="submit" size="sm" variant="ghost" loading={logTemp.isPending}>Log</Button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <form
              className="mt-3 flex flex-wrap items-end gap-2 rounded-md border border-slate-200 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                createTank.mutate({
                  name: String(fd.get('name')),
                  label: String(fd.get('label') ?? '') || undefined,
                  capacity: Number(fd.get('capacity') ?? 0),
                  alarmLowC: fd.get('alarmLowC') ? Number(fd.get('alarmLowC')) : undefined,
                  alarmHighC: fd.get('alarmHighC') ? Number(fd.get('alarmHighC')) : undefined,
                });
                (e.currentTarget as HTMLFormElement).reset();
              }}
            >
              <label className="flex flex-col text-xs font-medium text-slate-600">Name<input name="name" required className="mt-1 rounded-md border border-slate-300 px-2 py-1 text-sm" /></label>
              <label className="flex flex-col text-xs font-medium text-slate-600">Label<input name="label" className="mt-1 rounded-md border border-slate-300 px-2 py-1 text-sm" /></label>
              <label className="flex flex-col text-xs font-medium text-slate-600">Capacity<input name="capacity" type="number" defaultValue={0} className="mt-1 w-24 rounded-md border border-slate-300 px-2 py-1 text-sm" /></label>
              <label className="flex flex-col text-xs font-medium text-slate-600">Alarm Low<input name="alarmLowC" type="number" step="0.1" className="mt-1 w-24 rounded-md border border-slate-300 px-2 py-1 text-sm" /></label>
              <label className="flex flex-col text-xs font-medium text-slate-600">Alarm High<input name="alarmHighC" type="number" step="0.1" className="mt-1 w-24 rounded-md border border-slate-300 px-2 py-1 text-sm" /></label>
              <Button type="submit" size="sm" variant="outline" loading={createTank.isPending}>Add tank</Button>
            </form>
          </CardContent>
        </Card>

        {/* Selected tank details */}
        <Card>
          <CardHeader><CardTitle>{activeTank ? activeTank.name : 'Tank'} map</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {map.isLoading ? <Spinner /> : !mapData ? (
              <p className="text-sm text-slate-500">Select a tank to view its map.</p>
            ) : (
              <>
                <div className="rounded-md border border-slate-200 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Positions</span>
                    <Badge tone="info">{positions.length}</Badge>
                  </div>
                  {positions.length === 0 ? (
                    <p className="text-sm text-slate-500">No positions registered.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                      {positions.map((p: any) => (
                        <div
                          key={p.id}
                          className={`rounded-md border px-2 py-1 text-xs ${p.storageItem ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-600'}`}
                          title={p.storageItem ? `Occupied by ${p.storageItem.label}` : 'Available'}
                        >
                          <div className="truncate">{p.label || p.position || p.id.slice(0, 8)}</div>
                          <div className="truncate text-[10px] opacity-70">{p.storageItem ? p.storageItem.label : 'Empty'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {mapData.temperatureLogs?.length ? (
                  <div className="rounded-md border border-slate-200 p-3">
                    <div className="text-sm font-medium text-slate-700">Recent readings</div>
                    <ul className="mt-1 space-y-1 text-xs text-slate-500">
                      {mapData.temperatureLogs.map((l: any) => (
                        <li key={l.id} className="flex items-center justify-between">
                          <span>{l.tempC}°C {l.source}</span>
                          <Badge tone={l.isAlarm ? 'danger' : 'neutral'}>{l.isAlarm ? 'ALARM' : ''}</Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <form
                  className="rounded-md border border-slate-200 p-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    store.mutate({
                      positionId: String(fd.get('positionId')),
                      patientId: String(fd.get('patientId')),
                      type: String(fd.get('type') ?? 'EMBRYO'),
                      label: String(fd.get('label')),
                      frozenAt: String(fd.get('frozenAt') ?? '') || undefined,
                    });
                    (e.currentTarget as HTMLFormElement).reset();
                  }}
                >
                  <div className="mb-2 text-sm font-medium text-slate-700">Store item</div>
                  <div className="grid gap-2 text-xs">
                    <label className="flex flex-col text-slate-600">
                      Position
                      <select name="positionId" required className="mt-1 rounded-md border border-slate-300 px-2 py-1 text-sm">
                        {positions.map((p: any) => (
                          <option key={p.id} value={p.id} disabled={!!p.storageItem}>
                            {p.label || p.position || 'Position'} {p.storageItem ? '— occupied' : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col text-slate-600">
                      Patient
                      <select name="patientId" required className="mt-1 rounded-md border border-slate-300 px-2 py-1 text-sm">
                        {patientRows.map((p) => (
                          <option key={p.id} value={p.id}>{p.givenName} {p.familyName}</option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col text-slate-600">
                      Type
                      <select name="type" className="mt-1 rounded-md border border-slate-300 px-2 py-1 text-sm">
                        {ITEM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col text-slate-600">
                      Label
                      <input name="label" required className="mt-1 rounded-md border border-slate-300 px-2 py-1 text-sm" />
                    </label>
                    <label className="flex flex-col text-slate-600">
                      Frozen at
                      <input name="frozenAt" type="date" className="mt-1 rounded-md border border-slate-300 px-2 py-1 text-sm" />
                    </label>
                    <Button type="submit" size="sm" variant="outline" loading={store.isPending}>Store</Button>
                  </div>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Positions add + inventory */}
      {activeTank && (
        <Card>
          <CardHeader><CardTitle>Add a position to {activeTank.name}</CardTitle></CardHeader>
          <CardContent>
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                createPosition.mutate({
                  tankId: activeTank.id,
                  room: String(fd.get('room') ?? '') || undefined,
                  canister: String(fd.get('canister') ?? '') || undefined,
                  cane: String(fd.get('cane') ?? '') || undefined,
                  goblet: String(fd.get('goblet') ?? '') || undefined,
                  rack: String(fd.get('rack') ?? '') || undefined,
                  label: String(fd.get('label') ?? '') || undefined,
                });
                (e.currentTarget as HTMLFormElement).reset();
              }}
            >
              {['room', 'canister', 'cane', 'goblet', 'rack', 'label'].map((f) => (
                <label key={f} className="flex flex-col text-xs font-medium text-slate-600">
                  {f}
                  <input name={f} className="mt-1 rounded-md border border-slate-300 px-2 py-1 text-sm" />
                </label>
              ))}
              <Button type="submit" size="sm" variant="outline" loading={createPosition.isPending}>Add position</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Items inventory */}
      <Card>
        <CardHeader><CardTitle>Stored items</CardTitle></CardHeader>
        <CardContent>
          {items.isLoading ? <Spinner /> : itemRows.length === 0 ? (
            <p className="text-sm text-slate-500">No items in cryostorage.</p>
          ) : (
            <div className="space-y-2">
              {itemRows.map((it: any) => (
                <div key={it.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-slate-700">{it.label}</span>
                      <Badge tone="info">{it.type}</Badge>
                      <Badge tone={statusTone(it.status)}>{it.status}</Badge>
                    </div>
                    <div className="text-xs text-slate-500">
                      {it.patient ? `${it.patient.givenName} ${it.patient.familyName}` : '—'} · {it.position?.tank?.name ?? it.position?.label ?? 'No position'} · Frozen {it.frozenAt ? new Date(it.frozenAt).toLocaleDateString() : '—'}
                    </div>
                  </div>
                  {it.status === 'STORED' && (
                    <Button size="sm" variant="ghost" onClick={() => setReleaseFor(releaseFor === it.id ? null : it.id)}>Release</Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {releaseFor && (
            <form
              className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                release.mutate({
                  id: releaseFor,
                  body: {
                    witnessId: String(fd.get('witnessId')),
                    reason: String(fd.get('reason')),
                    note: String(fd.get('note') ?? '') || undefined,
                  },
                });
              }}
            >
              <div className="mb-2 text-sm font-medium text-slate-700">Release item — double-witness</div>
              <div className="grid gap-2 md:grid-cols-2">
                <label className="flex flex-col text-xs text-slate-600">
                  Witness (different staff member)
                  <select name="witnessId" required className="mt-1 rounded-md border border-slate-300 px-2 py-1 text-sm">
                    {staffRows.filter((s: any) => s.userId).map((s: any) => (
                      <option key={s.userId} value={s.userId}>
                        {s.jobTitle || 'Staff member'} {s.employeeNumber ? `(${s.employeeNumber})` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Reason
                  <input name="reason" required placeholder="e.g. transfer / discard / expiry" className="mt-1 rounded-md border border-slate-300 px-2 py-1 text-sm" />
                </label>
                <label className="flex flex-col text-xs text-slate-600 md:col-span-2">
                  Note (optional)
                  <input name="note" className="mt-1 rounded-md border border-slate-300 px-2 py-1 text-sm" />
                </label>
              </div>
              <div className="mt-2 flex gap-2">
                <Button type="submit" size="sm" variant="danger" loading={release.isPending}>Confirm release</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setReleaseFor(null)}>Cancel</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
