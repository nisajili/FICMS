import { Module } from '@nestjs/common';
import { EmbryologyService } from './embryology.service';
import { EmbryologyController } from './embryology.controller';

@Module({
  controllers: [EmbryologyController],
  providers: [EmbryologyService],
  exports: [EmbryologyService],
})
export class EmbryologyModule {}
