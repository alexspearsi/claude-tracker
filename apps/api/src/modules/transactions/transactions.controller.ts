import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { TransactionsService } from './transactions.service.js';
import type { TransactionDto, TransactionSummary } from './transaction.types.js';
// DTO импортируются значением, не через `import type`: глобальный ValidationPipe берёт класс
// из метаданных параметра, а для type-only импорта там окажется Object и проверка молча пропустится.
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { SummaryQueryDto } from './dto/summary-query.dto.js';
import { TransactionQueryDto } from './dto/transaction-query.dto.js';
import { UpdateTransactionDto } from './dto/update-transaction.dto.js';

// Защита — глобальный JwtAuthGuard из AuthModule; локальный @UseGuards здесь уронит старт.
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: TransactionQueryDto,
  ): Promise<TransactionDto[]> {
    return this.transactions.findAll(user.id, query);
  }

  // Объявлен ДО @Get(':id') — Nest матчит роуты по порядку регистрации,
  // иначе 'summary' попал бы в параметр :id.
  @Get('summary')
  summary(
    @CurrentUser() user: AuthUser,
    @Query() query: SummaryQueryDto,
  ): Promise<TransactionSummary> {
    return this.transactions.summary(user.id, query.month, query.year);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TransactionDto> {
    return this.transactions.findOne(user.id, id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTransactionDto,
  ): Promise<TransactionDto> {
    return this.transactions.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransactionDto,
  ): Promise<TransactionDto> {
    return this.transactions.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.transactions.remove(user.id, id);
  }
}
