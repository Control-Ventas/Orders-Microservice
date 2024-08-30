import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { CLIENT_MICROSERVICE, envs, PRODUCT_MICROSERVICE } from 'src/config';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
  imports: [
    ClientsModule.register([
      { 
        name: PRODUCT_MICROSERVICE, 
        transport: Transport.TCP,
        options: {
          host: envs.productsMicroserviceHost,
          port: envs.productsMicroservicePort,
        },
      },
      {
        name: CLIENT_MICROSERVICE, 
        transport: Transport.TCP,
        options: {
          host: envs.clientsMicroserviceHost,
          port: envs.clientsMicroservicePort,
        },
      }
    ]),
  ]
})
export class OrdersModule {}
