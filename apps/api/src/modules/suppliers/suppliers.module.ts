import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { SUPPLIER_REPOSITORY } from './domain/ports/supplier.repository';
import { SUPPLIER_REPORT_REPOSITORY } from './domain/ports/supplier-report.repository';
import { PrismaSupplierRepository } from './infrastructure/persistence/prisma-supplier.repository';
import { PrismaSupplierReportRepository } from './infrastructure/persistence/prisma-supplier-report.repository';
import {
  CreateSupplierUseCase,
  UpdateSupplierUseCase,
  ListSuppliersUseCase,
  GetSupplierUseCase,
  AssignProductSupplierUseCase,
  ListProductSuppliersUseCase,
} from './application/supplier.use-cases';
import { GetSupplierReportUseCase } from './application/supplier-report.use-case';
import { SuppliersController } from './presentation/http/suppliers.controller';

/**
 * Fornecedores (Fase 1, Inc.2). Cadastro + vínculo com produtos. `leadTimeDays`
 * alimenta a previsão de reposição (Inc.3); o vínculo habilita o relatório por
 * fornecedor (Fase 2).
 */
@Module({
  imports: [IamModule],
  controllers: [SuppliersController],
  providers: [
    CreateSupplierUseCase,
    UpdateSupplierUseCase,
    ListSuppliersUseCase,
    GetSupplierUseCase,
    AssignProductSupplierUseCase,
    ListProductSuppliersUseCase,
    GetSupplierReportUseCase,
    { provide: SUPPLIER_REPOSITORY, useClass: PrismaSupplierRepository },
    { provide: SUPPLIER_REPORT_REPOSITORY, useClass: PrismaSupplierReportRepository },
  ],
})
export class SuppliersModule {}
