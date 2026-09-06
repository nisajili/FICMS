import { Module } from '@nestjs/common';
import { UltrasoundService } from './ultrasound.service';
import { UltrasoundController } from './ultrasound.controller';

@Module({
  controllers: [UltrasoundController],
  providers: [UltrasoundService],
  exports: [UltrasoundService],
})
export class UltrasoundModule {}
