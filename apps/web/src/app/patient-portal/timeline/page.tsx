'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, Badge, Spinner, EmptyState } from '@ficms/ui';
import { self } from '@/lib/queries';

export default function PatientTimeline() {
  const { data: timeline, isLoading } = useQuery({ queryKey: ['me', 'timeline'], queryFn: self.timeline });

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold text-slate-900">My Treatment Timeline</h1><p className="text-sm text-slate-500">An overview of your cycles and their milestones.</p></div>

      {isLoading ? <div className="flex justify-center py-20"><Spinner /></div>
        : !timeline || timeline.length === 0 ? (
          <EmptyState title="No treatment cycles yet" description="Your cycles and treatment milestones will appear here." />
        ) : (
          <div className="space-y-6">
            {timeline.map((cycle: any) => (
              <Card key={cycle.id}>
                <CardContent className="p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {cycle.cycleNumber} · {cycle.treatmentType}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {cycle.startDate ? `Started ${new Date(cycle.startDate).toLocaleDateString()}` : 'Not started'}
                      </p>
                    </div>
                    <Badge tone={cycTone(cycle.status)}>{cycle.status.replace('_', ' ')}</Badge>
                  </div>

                  <ol className="relative space-y-4 border-l border-slate-200 pl-6">
                    <Milestone label="Cycle started" date={cycle.startDate} done />
                    {cycle.events.map((ev: any) => (
                      <li key={ev.id} className="relative">
                        <span className="absolute -left-[27px] mt-1 h-3 w-3 rounded-full border-2 border-brand-600 bg-white" />
                        <p className="text-sm font-medium text-slate-900">{ev.title || ev.eventType}</p>
                        {ev.scheduledAt && <p className="text-xs text-slate-500">{new Date(ev.scheduledAt).toLocaleDateString()}</p>}
                      </li>
                    ))}
                    <Milestone label="Egg retrieval" date={cycle.retrievalAt} />
                    <Milestone label="Transfer" date={cycle.transferAt} />
                    {cycle.outcome && (
                      <li className="relative">
                        <span className="absolute -left-[27px] mt-1 h-3 w-3 rounded-full bg-emerald-500" />
                        <p className="text-sm font-medium text-slate-900">Outcome: {cycle.outcome}</p>
                      </li>
                    )}
                  </ol>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}

function Milestone({ label, date, done = false }: { label: string; date?: string | null; done?: boolean }) {
  if (!date) return null;
  return (
    <li className="relative">
      <span className={`absolute -left-[27px] mt-1 h-3 w-3 rounded-full border-2 ${done ? 'border-brand-600 bg-brand-600' : 'border-slate-300 bg-white'}`} />
      <p className="text-sm font-medium text-slate-900">{label}</p>
      <p className="text-xs text-slate-500">{new Date(date).toLocaleDateString()}</p>
    </li>
  );
}

function cycTone(s: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary' {
  if (['OUTCOME'].includes(s)) return 'success';
  if (['TRANSFER', 'FREEZING'].includes(s)) return 'info';
  if (['CANCELLED'].includes(s)) return 'danger';
  return 'primary';
}
