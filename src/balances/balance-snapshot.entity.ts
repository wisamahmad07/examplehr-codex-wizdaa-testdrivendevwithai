import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('balance_snapshots')
@Unique(['employeeId', 'locationId'])
export class BalanceSnapshotEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  employeeId!: string;

  @Column()
  locationId!: string;

  @Column({ type: 'integer' })
  balanceUnits!: number;

  @Column({ type: 'datetime' })
  sourceUpdatedAt!: Date;

  @Column({ type: 'text' })
  sourceType!: 'REALTIME' | 'BATCH';

  @Column({ type: 'datetime' })
  updatedAt!: Date;
}
