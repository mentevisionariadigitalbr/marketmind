import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { JwtAuthGuard } from '../../../iam/presentation/http/jwt-auth.guard';
import { PermissionsGuard } from '../../../iam/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../iam/presentation/http/require-permissions.decorator';
import { PERMISSIONS } from '../../../iam/domain/permissions';
import { AuditAction } from '../../../../shared/audit/audit-action.decorator';

import { DashboardService, type PeriodInput } from '../../application/dashboard.service';
import { PeriodQueryDto, ProductsQueryDto, TopProductsQueryDto } from './dto/dashboard-query.dto';
import {
  OverviewResponseDto,
  RevenueResponseDto,
  TimelinePointDto,
  CategoryResponseDto,
  AbcResponseDto,
  InventoryResponseDto,
  TopProductResponseDto,
  ProductsPageResponseDto,
  AlertsResponseDto,
  HealthResponseDto,
} from './dto/dashboard-response.dto';

function period(q: PeriodQueryDto): PeriodInput {
  return { preset: q.preset, from: q.from, to: q.to };
}

@ApiTags('Dashboard')
@ApiBearerAuth()
@Throttle({ default: { limit: 120, ttl: 60_000 } })
@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.DASHBOARD_READ)
@AuditAction('dashboard.read')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('overview')
  @ApiOkResponse({ type: OverviewResponseDto })
  overview() {
    return this.service.overview();
  }

  @Get('kpis')
  @ApiOkResponse({ type: OverviewResponseDto })
  kpis(@Query() q: PeriodQueryDto) {
    return this.service.kpis(period(q));
  }

  @Get('revenue')
  @ApiOkResponse({ type: RevenueResponseDto })
  revenue(@Query() q: PeriodQueryDto) {
    return this.service.revenue(period(q));
  }

  @Get('orders')
  @ApiOkResponse({ type: RevenueResponseDto })
  orders(@Query() q: PeriodQueryDto) {
    return this.service.orders(period(q));
  }

  @Get('timeline')
  @ApiOkResponse({ type: [TimelinePointDto] })
  timeline(@Query() q: PeriodQueryDto) {
    return this.service.timeline(period(q));
  }

  @Get('categories')
  @ApiOkResponse({ type: [CategoryResponseDto] })
  categories(@Query() q: PeriodQueryDto) {
    return this.service.categories(period(q));
  }

  @Get('abc')
  @ApiOkResponse({ type: AbcResponseDto })
  abc(@Query() q: PeriodQueryDto) {
    return this.service.abc(period(q));
  }

  @Get('top-products')
  @ApiOkResponse({ type: [TopProductResponseDto] })
  topProducts(@Query() q: TopProductsQueryDto) {
    return this.service.topProducts(period(q), q.limit);
  }

  @Get('inventory')
  @ApiOkResponse({ type: InventoryResponseDto })
  inventory(@Query() q: PeriodQueryDto) {
    return this.service.inventory(period(q));
  }

  @Get('products')
  @ApiOkResponse({ type: ProductsPageResponseDto })
  products(@Query() q: ProductsQueryDto) {
    return this.service.products(
      period(q),
      {
        sku: q.sku,
        title: q.title,
        categoryId: q.categoryId,
        marketplaceAccountId: q.marketplaceAccountId,
        status: q.status,
        minPrice: q.minPrice,
        maxPrice: q.maxPrice,
        minStock: q.minStock,
        maxStock: q.maxStock,
      },
      { page: q.page, pageSize: q.pageSize },
    );
  }

  @Get('alerts')
  @ApiOkResponse({ type: AlertsResponseDto })
  alerts(@Query() q: PeriodQueryDto) {
    return this.service.alerts(period(q));
  }

  @Get('health')
  @ApiOkResponse({ type: HealthResponseDto })
  health() {
    return this.service.health();
  }
}
