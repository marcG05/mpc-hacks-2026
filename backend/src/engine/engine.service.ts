import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EngineService {
  getHello(): string {
    return 'Hello World';
  }

  processTransactions(file: Express.Multer.File): string {
    // Navigate from backend directory to the python directory
    const pythonDir = path.join(process.cwd(), '..', 'python');
    const inputCsv = path.join(pythonDir, 'transactions.csv');
    const outputCsv = path.join(pythonDir, 'fraud_results.csv');

    try {
      // 1. Save the uploaded file buffer
      fs.writeFileSync(inputCsv, file.buffer);

      // 2. Run the python engine
      execSync('python3 engine.py', { cwd: pythonDir });

      // 3. Read and return the output CSV
      const results = fs.readFileSync(outputCsv, 'utf-8');
      return results;
    } catch (error) {
      console.error("Error processing transactions:", error);
      throw new InternalServerErrorException('Failed to process transactions via python engine');
    }
  }
}
