import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateTimeOffRequestDto {
  @IsString()
  employeeId!: string;

  @IsString()
  locationId!: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  amountDays!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
