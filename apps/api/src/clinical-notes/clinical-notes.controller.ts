import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClinicalNotesService } from './clinical-notes.service';
import { CurrentUser } from '../common/decorators';
import { RequirePermissions } from '../common/permissions.guard';
import { CreateClinicalNoteDto, CorrectClinicalNoteDto, ClinicalNoteQueryDto } from './dto/clinical-note.dto';
import type { SessionUser } from '@ficms/types';

/**
 * Clinical notes with an immutable revision chain. Signed notes are never
 * overwritten: corrections create a new, versioned addendum/revision.
 */
@ApiTags('clinical-notes')
@Controller('clinical-notes')
export class ClinicalNotesController {
  constructor(private readonly service: ClinicalNotesService) {}

  @Post()
  @RequirePermissions('medical_record:create')
  @ApiOperation({ summary: 'Create a clinical note (unsigend; may be edited in place)' })
  create(@Body() dto: CreateClinicalNoteDto, @CurrentUser() user: SessionUser) {
    return this.service.create(dto, user);
  }

  @Get()
  @RequirePermissions('medical_record:view')
  @ApiOperation({ summary: 'List clinical notes for the organisation (optionally by patient)' })
  list(@Query() q: ClinicalNoteQueryDto, @CurrentUser() user: SessionUser) {
    return this.service.list(q, user);
  }

  @Get(':id')
  @RequirePermissions('medical_record:view')
  @ApiOperation({ summary: 'Get a clinical note (tenant-scoped)' })
  get(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.get(id, user);
  }

  @Post(':id/sign')
  @RequirePermissions('medical_record:update')
  @ApiOperation({ summary: 'Sign a clinical note, making its content immutable' })
  sign(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.sign(id, user);
  }

  @Post(':id/correct')
  @RequirePermissions('medical_record:update')
  @ApiOperation({ summary: 'Correct a note. Signed notes are never overwritten; a new revision is created.' })
  correct(@Param('id') id: string, @Body() dto: CorrectClinicalNoteDto, @CurrentUser() user: SessionUser) {
    return this.service.correct(id, dto, user);
  }
}
