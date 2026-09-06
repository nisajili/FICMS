'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, Badge, Spinner, EmptyState, Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@ficms/ui';
import { self } from '@/lib/queries';

export default function PatientDocuments() {
  const { data: documents, isLoading } = useQuery({ queryKey: ['me', 'documents'], queryFn: self.documents });

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold text-slate-900">My Documents</h1><p className="text-sm text-slate-500">Documents approved for you to access.</p></div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="flex justify-center py-12"><Spinner /></div>
            : !documents || documents.length === 0 ? <EmptyState title="No documents available" description="Approved documents will appear here." />
            : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>File</TableHead><TableHead>Type</TableHead><TableHead>Size</TableHead><TableHead>Uploaded</TableHead><TableHead>Action</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {documents.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium text-slate-900">{d.fileName}</TableCell>
                      <TableCell><Badge tone="info">{d.type}</Badge></TableCell>
                      <TableCell>{formatBytes(d.sizeBytes)}</TableCell>
                      <TableCell>{new Date(d.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <a href={self.documentDownloadUrl(d.id)} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline">Download</Button>
                        </a>
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

function formatBytes(n: number): string {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
