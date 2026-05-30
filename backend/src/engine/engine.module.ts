import { Module } from '@nestjs/common';
import { EngineController } from './engine.controller';
import { EngineService } from './engine.service';

@Module({
  imports: [],
  controllers: [EngineController],
  providers: [EngineService],
})
export class EngineModule {}
