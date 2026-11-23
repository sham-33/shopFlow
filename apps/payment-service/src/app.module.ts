import { CommonModule } from '@app/common';
import { Module } from '@nestjs/common';

@Module({
  imports: [CommonModule.forRoot({ serviceName: 'payment-service' })],
})
export class AppModule {}
