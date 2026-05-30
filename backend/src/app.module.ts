import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EngineModule } from './engine/engine.module';

@Module({
  imports: [EngineModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
