import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { TimeOffRequestStatus } from './time-off.constants';

@Entity('time_off_requests')
export class TimeOffRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  employeeId!: string;

  @Column()
  locationId!: string;

  @Column({ type: 'integer' })
  amountUnits!: number;

  @Column({ type: 'text' })
  status!: TimeOffRequestStatus;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;

  @Column({ type: 'text', nullable: true })
  actedBy?: string | null;

  @Column({ type: 'text', nullable: true })
  decisionNote?: string | null;

  @Column({ type: 'text', nullable: true })
  statusReasonCode?: string | null;

  @Column({ type: 'text', nullable: true })
  externalBookingId?: string | null;

  @Column({ type: 'datetime' })
  createdAt!: Date;

  @Column({ type: 'datetime' })
  updatedAt!: Date;

  @Column({ type: 'datetime', nullable: true })
  approvedAt?: Date | null;

  @Column({ type: 'datetime', nullable: true })
  rejectedAt?: Date | null;

  @Column({ type: 'datetime', nullable: true })
  cancelledAt?: Date | null;

  @Column({ type: 'datetime', nullable: true })
  reconciliationRequiredAt?: Date | null;
}
