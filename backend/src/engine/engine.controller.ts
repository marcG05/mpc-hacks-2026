import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EngineService } from './engine.service';

@Controller('engine')
export class EngineController {
  constructor(private readonly engine: EngineService) { }

  @Get()
  getHello(): string {
    return this.engine.getHello();
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
     const transactions = await this.engine.processTransactions(file);
    return { transactions };
  }

  @Post('analyze')
  @UseInterceptors(FileInterceptor('file'))
  async analyzeFile(@UploadedFile() file: Express.Multer.File) {
    const transactions = await this.engine.processTransactions(file);
    return { transactions };
  }

  @Get('transactions')
  getTransactions() {
    return this.engine.getTransactions();
  }

  @Get('decisions')
  getDecisions() {
    return this.engine.getDecisions();
  }

  @Get('summary')
  getSummary() {
    return this.engine.getSummary();
  }

  @Get('metrics')
  getMetrics() {
    return this.engine.getMetrics();
  }

  @Get('health')
  async getHealth() {
    return this.engine.getHealth();
  }

  @Get('map-token')
  getMapToken() {
    return { token: process.env.MAP || '' };
  }

  @Post('decision')
  recordDecision(
    @Body()
    body: {
      tx: string;
      card?: string;
      action: string;
      score?: number;
      by?: string;
      time?: string;
    },
  ) {
    return this.engine.recordDecision(body);
  }

  @Post('chat')
  async chat(
    @Body()
    body: {
      tx: any;
      history: { role: 'user' | 'model'; text: string }[];
      message: string;
    },
  ) {
    return this.engine.chatWithGemini(body.tx, body.history, body.message);
  }
}
