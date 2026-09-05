import { Module } from '@nestjs/common';
import { CryostorageService } from './cryostorage.service';
import { CryostorageController } from './cryostorage.controller';

@Module({
  controllers: [CryostorageController],
  providers: [CryostorageService],
  exports: [CryostorageService],
})
export class CryostorageModule {}
