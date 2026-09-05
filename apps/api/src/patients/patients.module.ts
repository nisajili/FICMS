import { Module } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { PatientSelfController } from './patient-self.controller';

@Module({
  controllers: [PatientsController, PatientSelfController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
