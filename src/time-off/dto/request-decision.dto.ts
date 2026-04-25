import { IsOptional, IsString } from 'class-validator';

export class RequestDecisionDto {
  @IsString()
  actorId!: string;

  @IsOptional()
  @IsString()
  note?: string;
}
