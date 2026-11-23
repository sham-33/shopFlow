import { CommonModule } from '@app/common';
import { Module } from '@nestjs/common';
import { SERVICE_NAME } from './constants.js';

@Module({
  imports: [CommonModule.forRoot({ serviceName: SERVICE_NAME })],
})
export class AppModule {}
