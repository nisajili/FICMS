import type { SessionUser } from '@ficms/types';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators';
import { RequirePermissions } from '../common/permissions.guard';
import { DocumentsService } from './documents.service';

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'patientId', 'type'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'Document file (max 10 MiB)' },
        patientId: { type: 'string', format: 'uuid' },
        type: { type: 'string', enum: ['ID', 'SCAN', 'REPORT', 'CONSENT', 'OTHER'], default: 'OTHER' },
        description: { type: 'string', description: 'Optional description of the document' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a patient document (multipart file)' })
  @RequirePermissions('patient:update')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { patientId: string; type: string; description?: string },
    @CurrentUser() user: SessionUser,
  ) {
    if (!file) throw new Error('No file uploaded.');
    return this.service.upload(
      {
        patientId: body.patientId,
        type: (body.type ?? 'OTHER') as never,
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        body: file.buffer,
        description: body.description,
      },
      user,
    );
  }

  @Get('patients/:patientId')
  @RequirePermissions('patient:view')
  @ApiOperation({ summary: 'List documents for a patient' })
  list(@Param('patientId') patientId: string, @CurrentUser() user: SessionUser) {
    return this.service.listForPatient(patientId, user);
  }

  @Get('me/:id/download')
  @RequirePermissions('patient:view_self')
  @ApiOperation({ summary: 'Download one of my own released documents' })
  async downloadSelf(@Param('id') id: string, @CurrentUser() user: SessionUser, @Res() res: Response) {
    const result = await this.service.downloadSelf(id, user);
    if (result.url) {
      return res.redirect(result.url);
    }
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(result.fileName ?? 'document')}"`);
    return res.send(result.buffer);
  }

  @Get(':id/info')
  @RequirePermissions('patient:view')
  @ApiOperation({ summary: 'Get a document with a signed download URL' })
  info(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.getDownloadInfo(id, user);
  }

  @Get(':id/download')
  @RequirePermissions('patient:view')
  @ApiOperation({ summary: 'Download a document (streams file or redirects to signed URL)' })
  async download(@Param('id') id: string, @CurrentUser() user: SessionUser, @Res() res: Response) {
    const result = await this.service.download(id, user);
    if (result.url) {
      return res.redirect(result.url);
    }
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(result.fileName ?? 'document')}"`);
    return res.send(result.buffer);
  }

  @Delete(':id')
  @RequirePermissions('patient:update')
  @ApiOperation({ summary: 'Delete a patient document' })
  delete(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.delete(id, user);
  }
}
