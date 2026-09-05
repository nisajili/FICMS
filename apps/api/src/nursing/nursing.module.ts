import { Module } from '@nestjs/common';
import { NursingService } from './nursing.service';
import { NursingController } from './nursing.controller';

@Module({
  controllers: [NursingController],
  providers: [NursingService],
  exports: [NursingService],
})
export class NursingModule {}
