import { Controller, Get } from '@nestjs/common';
import { EngineService } from './engine.service';

@Controller("engine")
export class EngineController {
  constructor(private readonly engine: EngineService) {}

  @Get()
  getHello(): string {
    return this.engine.getHello();
  }
}
