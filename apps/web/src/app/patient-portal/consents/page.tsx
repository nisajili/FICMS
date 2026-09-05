'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Card, CardContent, CardHeader, CardTitle, Button, Badge, Spinner, EmptyState,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@ficms/ui';
import { self } from '@/lib/queries';

export default function PatientConsents() {
  const qc = useQueryClient();
  const { data: consents, isLoading } = useQuery({ queryKey: ['me', 'consents'], queryFn: self.consents });
  const [viewing, setViewing] = React.useState<any>(null);
  const { data: content, isLoading: contentLoading } = useQuery({
    queryKey: ['me', 'consent', viewing?.id],
    queryFn: () => self.consent(viewing.id),
    enabled: !!viewing,
  });

  const sign = useMutation({
    mutationFn: (id: string) => self.signConsent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me', 'consents'] });
      setViewing(null);
    },
  });

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold text-slate-900">My Consents</h1><p className="text-sm text-slate-500">Review and sign consent documents.</p></div>

      {viewing ? (
        <Card>
          <CardHeader><CardTitle>{viewing.title}</CardTitle></CardHeader>
          <CardContent>
            {contentLoading ? <Spinner /> : (
              <div className="prose prose-slate max-w-none">
                <p className="whitespace-pre-wrap text-sm text-slate-700">{content?.content || 'No content available.'}</p>
              </div>
            )}
            <div className="mt-4 flex gap-3">
              {viewing.status === 'SIGNED' || viewing.status === 'WITNESSED' ? (
                <Badge tone="success">Signed {viewing.signedAt ? new Date(viewing.signedAt).toLocaleDateString() : ''}</Badge>
              ) : (
                <Button loading={sign.isPending} onClick={() => sign.mutate(viewing.id)}>Sign consent</Button>
              )}
              <Button variant="outline" onClick={() => setViewing(null)}>Back</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {isLoading ? <div className="flex justify-center py-12"><Spinner /></div>
              : !consents || consents.length === 0 ? <EmptyState title="No consent documents" />
              : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Title</TableHead><TableHead>Status</TableHead><TableHead>Signed</TableHead><TableHead>Action</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {consents.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium text-slate-900">{c.title}</TableCell>
                        <TableCell><Badge tone={tone(c.status)}>{c.status.replace('_', ' ')}</Badge></TableCell>
                        <TableCell>{c.signedAt ? new Date(c.signedAt).toLocaleDateString() : '—'}</TableCell>
                        <TableCell><Button size="sm" variant="outline" onClick={() => setViewing(c)}>View</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function tone(s: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary' {
  if (['SIGNED', 'WITNESSED'].includes(s)) return 'success';
  if (['PENDING_SIGNATURE'].includes(s)) return 'warning';
  if (['REVOKED'].includes(s)) return 'danger';
  return 'neutral';
}
