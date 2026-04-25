import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { HcmBalanceResponse, HcmBookingCommand, HcmBookingResponse } from './hcm.types';
export declare class HcmClient {
    private readonly httpService;
    private readonly configService;
    private readonly baseUrl;
    constructor(httpService: HttpService, configService: ConfigService);
    getBalance(employeeId: string, locationId: string): Promise<HcmBalanceResponse>;
    bookTimeOff(command: HcmBookingCommand): Promise<HcmBookingResponse>;
    private mapError;
    private parseErrorBody;
}
