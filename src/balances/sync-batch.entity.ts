import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('sync_batches')
@Unique(['batchId'])
export class SyncBatchEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  batchId!: string;

  @Column({ type: 'datetime' })
  generatedAt!: Date;

  @Column({ type: 'datetime' })
  receivedAt!: Date;

  @Column({ type: 'integer' })
  appliedRows!: number;

  @Column({ type: 'integer' })
  skippedRows!: number;
}
