import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { HcmCommandStatus, HcmCommandType } from './time-off.constants';

@Entity('hcm_commands')
@Unique(['requestId', 'commandType'])
export class HcmCommandEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  requestId!: string;

  @Column({ type: 'text' })
  commandType!: HcmCommandType;

  @Column({ type: 'text' })
  status!: HcmCommandStatus;

  @Column({ type: 'text' })
  idempotencyKey!: string;

  @Column({ type: 'integer' })
  attemptCount!: number;

  @Column({ type: 'text', nullable: true })
  lastErrorCode?: string | null;

  @Column({ type: 'text', nullable: true })
  lastErrorMessage?: string | null;

  @Column({ type: 'datetime', nullable: true })
  lastAttemptAt?: Date | null;

  @Column({ type: 'datetime', nullable: true })
  completedAt?: Date | null;
}
