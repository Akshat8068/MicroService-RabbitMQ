import {
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { isAxiosError, type Method } from 'axios';

type ServiceName = 'order' | 'product';

@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async forward<T>(
    service: ServiceName,
    method: Method,
    path: string,
    data?: unknown,
  ): Promise<T> {
    const baseURL = this.configService.getOrThrow<string>(
      service === 'order' ? 'ORDER_SERVICE_URL' : 'PRODUCT_SERVICE_URL',
    );

    try {
      const response = await this.httpService.axiosRef.request<T>({
        baseURL,
        method,
        url: path,
        data,
        timeout: 5000,
      });
      return response.data;
    } catch (error) {
      if (!isAxiosError(error)) {
        throw error;
      }

      const status = error.response?.status;
      if (status !== undefined && status < 500) {
        throw new HttpException(error.response?.data, status);
      }

      this.logger.error(
        `Request to ${service} service failed${status ? ` with status ${status}` : ''}`,
        error.stack,
      );
      throw new ServiceUnavailableException(
        `${service} service is unavailable`,
      );
    }
  }
}
