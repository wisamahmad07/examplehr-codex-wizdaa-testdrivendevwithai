export declare class KeyedMutexService {
    private readonly tails;
    withLock<T>(key: string, work: () => Promise<T>): Promise<T>;
}
