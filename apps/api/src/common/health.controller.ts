import { Controller, Get } from '@nestjs/common';
import { Public } from './decorators/public.decorator.js';

@Public()
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: string; ts: string } {
    return { status: 'ok', ts: new Date().toISOString() };
  }
}
