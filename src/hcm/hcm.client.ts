import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import axios from 'axios';
import { firstValueFrom } from 'rxjs';
import {
  HcmBalanceResponse,
  HcmBookingCommand,
  HcmBookingResponse,
  HcmTransportError,
  HcmValidationError,
} from './hcm.types';

@Injectable()
export class HcmClient {
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get<string>('HCM_BASE_URL') ?? 'http://127.0.0.1:4010';
  }

  async getBalance(
    employeeId: string,
    locationId: string,
  ): Promise<HcmBalanceResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<HcmBalanceResponse>(
          `${this.baseUrl}/balances/${employeeId}/${locationId}`,
        ),
      );

      return response.data;
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async bookTimeOff(command: HcmBookingCommand): Promise<HcmBookingResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<HcmBookingResponse>(
          `${this.baseUrl}/bookings`,
          command,
        ),
      );

      return response.data;
    } catch (error) {
      throw this.mapError(error);
    }
  }

  private mapError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const errorBody = this.parseErrorBody(error.response?.data);
      const responseCode = errorBody.code;

      if (!error.response || error.code === 'ECONNABORTED') {
        return new HcmTransportError('HCM request timed out or failed');
      }

      if (responseCode === 'INSUFFICIENT_BALANCE') {
        return new HcmValidationError(
          'INSUFFICIENT_BALANCE',
          errorBody.message ?? 'Insufficient balance',
        );
      }

      if (
        responseCode === 'INVALID_DIMENSION' ||
        error.response.status === 404
      ) {
        return new HcmValidationError(
          'INVALID_DIMENSION',
          errorBody.message ?? 'Invalid employee or location',
        );
      }

      if (error.response.status >= 500) {
        return new HcmTransportError('HCM request failed with server error');
      }
    }

    return new HcmTransportError('Unexpected HCM transport failure');
  }

  private parseErrorBody(data: unknown): {
    code?: string;
    message?: string;
  } {
    if (typeof data !== 'object' || data === null) {
      return {};
    }

    const record = data as Record<string, unknown>;
    return {
      code: typeof record.code === 'string' ? record.code : undefined,
      message: typeof record.message === 'string' ? record.message : undefined,
    };
  }
}
