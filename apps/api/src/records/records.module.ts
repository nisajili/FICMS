import { Module } from '@nestjs/common';
import { RecordNumberService } from './record-number.service';

@Module({
  providers: [RecordNumberService],
  exports: [RecordNumberService],
})
export class RecordsModule {}
