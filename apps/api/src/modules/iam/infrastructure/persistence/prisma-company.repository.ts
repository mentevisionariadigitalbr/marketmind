import { Injectable } from '@nestjs/common';
import { PrismaService } from '@marketmind/kernel';
import { Company, TaxRegime } from '../../domain/entities/company.entity';
import { CompanyRepository, CreateCompanyData } from '../../domain/ports/company.repository';

@Injectable()
export class PrismaCompanyRepository implements CompanyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCompanyData): Promise<Company> {
    const row = await this.prisma.db.company.create({
      data: {
        name: data.name,
        taxId: data.taxId ?? undefined,
        taxRegime: data.taxRegime ?? undefined,
      },
    });
    return this.toEntity(row);
  }

  async findById(id: string): Promise<Company | null> {
    const row = await this.prisma.db.company.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  private toEntity(row: {
    id: string;
    name: string;
    taxId: string | null;
    taxRegime: string;
    createdAt: Date;
    updatedAt: Date;
  }): Company {
    return new Company({
      id: row.id,
      name: row.name,
      taxId: row.taxId,
      taxRegime: row.taxRegime as TaxRegime,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
