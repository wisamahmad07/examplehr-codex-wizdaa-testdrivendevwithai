import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class HcmBatchBalanceDto {
  @IsString()
  employeeId!: string;

  @IsString()
  locationId!: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  balanceDays!: number;
}

export class HcmBatchSyncDto {
  @IsString()
  batchId!: string;

  @IsDateString()
  generatedAt!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HcmBatchBalanceDto)
  balances!: HcmBatchBalanceDto[];
}
