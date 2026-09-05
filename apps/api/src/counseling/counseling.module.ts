import { Module } from '@nestjs/common';
import { CounselingService } from './counseling.service';
import { CounselingController } from './counseling.controller';

@Module({
  controllers: [CounselingController],
  providers: [CounselingService],
  exports: [CounselingService],
})
export class CounselingModule {}
