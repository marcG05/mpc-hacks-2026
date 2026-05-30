import { Injectable } from '@nestjs/common';

@Injectable()
export class EngineService {
  getHello(): string {
    return 'Hello World';
  }
}
