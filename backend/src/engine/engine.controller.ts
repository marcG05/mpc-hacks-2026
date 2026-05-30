import { Controller, Get, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EngineService } from './engine.service';

@Controller("engine")
export class EngineController {
  constructor(private readonly engine: EngineService) {}

  @Get()
  getHello(): string {
    return this.engine.getHello();
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.engine.processTransactions(file);
  }
}
