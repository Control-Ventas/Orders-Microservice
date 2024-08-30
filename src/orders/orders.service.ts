import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PrismaClient } from '@prisma/client';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ChangeStatusDto } from './dto';
import { CLIENT_MICROSERVICE, PRODUCT_MICROSERVICE } from 'src/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @Inject(PRODUCT_MICROSERVICE) private readonly productsClient: ClientProxy,
    @Inject(CLIENT_MICROSERVICE) private readonly clientsClient: ClientProxy,
  ) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
  }

  async create(createOrderDto: CreateOrderDto) {
    try {
      const clientId = createOrderDto.clientId;
      const productIds = createOrderDto.items.map(item => item.productId);

      const client = await firstValueFrom(
        this.clientsClient.send('validateClient', clientId)
      )

      const products = await firstValueFrom(
        this.productsClient.send({ cmd: 'validateProducts' }, productIds)
      )

      for (const item of createOrderDto.items) {
        const product = products.find(p => p.product_id === item.productId);
        if (!product) {
          throw new RpcException(`Product with ID ${item.productId} not found`);
        }
        if (product.stock < item.quantity) {
          throw new RpcException(
            `Insufficient stock for product ${product.product_name}. Available: ${product.stock}, Requested: ${item.quantity}`
          )
        }
      }

      // Update product stock
      for (const item of createOrderDto.items) {
        const restarStockDto = {
          product_id: item.productId,
          cantidad: item.quantity,
        };

        await firstValueFrom(
          this.productsClient.send({ cmd: 'restarStock' }, restarStockDto)
        );
      }

      const totalAmount = createOrderDto.items.reduce((acc, orderItem) => {
        const price = products.find(product => product.product_id === orderItem.productId).price;
        return price * orderItem.quantity;
      }, 0)

      const totalItems = createOrderDto.items.reduce((acc, orderItem) => {
        return acc + orderItem.quantity;
      }, 0)

      const order = await this.order.create({
        data: {
          clientId: clientId,
          totalAmount: totalAmount,
          totalItems: totalItems,
          OrderItem: {
            createMany: {
              data: createOrderDto.items.map((item) => ({
                price: products.find(product => product.product_id === item.productId).price,
                quantity: item.quantity,
                productId: item.productId
              }))
            }
          }
        },
        include: {
          OrderItem: true, // Include OrderItem data in the response
        }
      });
      
      // Prepare the response object with only orderItems
      return {
        clientName: client.name,
        id: order.id,
        totalAmount: order.totalAmount,
        totalItems: order.totalItems,
        status: order.status,
        paid: order.paid,
        paidAt: order.paidAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        clientId: order.clientId,
        orderItems: order.OrderItem.map(item => ({
          price: item.price,
          quantity: item.quantity,
          productId: item.productId,
          product_name: products.find(product => product.product_id === item.productId).product_name
        }))
      };
      
    } catch (error) {
      throw new RpcException(error)
    }
  }

  findAll() {
    return this.order.findMany();
  }

  async findOne(id: number) {
    const order = await this.order.findUnique({
      where: { id: id }
    });

    if (!order) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Order #${id} not found`
      });
    }

    const client = await firstValueFrom(
      this.clientsClient.send('validateClient', order.clientId)
    )

    if (!client) {
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Client #${order.clientId} not found`
      });
    }

    const orderItems = await this.orderItem.findMany({
      where: { orderId: id }
    });


    return {
      clientName: client.name,
      ...order,
      OrderItems: orderItems
    }
  }

  async changeOrderStatus(changeStatusDto: ChangeStatusDto) {
    const { id, status } = changeStatusDto;

    const order = await this.findOne(id);

    if (!order) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Order #${id} not found`
      });
    }

    if (order.status === status) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: `Order #${id} is already ${status}`
      });
    }

    return this.order.update({
      where: { id },
      data: { status: status }
    })
  }


}
