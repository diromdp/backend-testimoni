import { Injectable, BadRequestException, ForbiddenException, Inject } from '@nestjs/common';
import { CreateOrderSubscriptionDto } from './dto/create-order-subscription.dto';
import { UpdateOrderSubscriptionDto } from './dto/update-order-subscription.dto';
import { DATABASE_CONNECTION } from '../database/database-connection';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import * as userSchema from '../user/schema';
import * as subscriptionSchema from '../subscription/schema';
import * as currentSubscription from '../current-subscription/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class OrderSubscriptionService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema & typeof subscriptionSchema>,
    private readonly subscriptionService: SubscriptionService,
  ) { }

  private calculateDurationInDays(startDate: Date, planType: string): Date {
    const endDate = new Date(startDate);

    switch (planType) {
      case 'MONTHLY':
        endDate.setMonth(endDate.getMonth() + 1);
        return endDate;
      case 'YEARLY':
        endDate.setFullYear(endDate.getFullYear() + 1);
        return endDate;
      case 'LIFETIME':
        endDate.setFullYear(endDate.getFullYear() + 100);
        return endDate;
      default:
        throw new BadRequestException('Jenis plan tidak valid');
    }
  }

  private calculateNextBillingDate(endDate: Date, planType: string): Date | null {
    if (planType === 'LIFETIME') {
      return null;
    }
    
    const nextBilling = new Date(endDate);
    nextBilling.setDate(nextBilling.getDate() - 7);
    return nextBilling;
  }

  async create(userId: number, createOrderSubscriptionDto: CreateOrderSubscriptionDto, role?: string) {
    const subscription = await this.subscriptionService.findOne(
      createOrderSubscriptionDto.subscriptionId,
      'superadmin'
    );

    if (!subscription) {
      throw new BadRequestException('Subscription not found');
    }

    const startDate = new Date();
    const endDate = this.calculateDurationInDays(startDate, subscription.planType);
    const nextBillingDate = this.calculateNextBillingDate(endDate, subscription.planType);

    // Set initial remaining features from subscription features

    const newOrderSubscription = await this.db
      .insert(schema.orderSubscriptions)
      .values({
        userId,
        subscriptionId: createOrderSubscriptionDto.subscriptionId,
        startDate,
        endDate,
        status: 'ACTIVE',
        nextBillingDate: nextBillingDate ? sql`${nextBillingDate}` : sql`NULL`,
        isAutoRenew: subscription.planType !== 'LIFETIME',
      })
      .returning();

    await this.db.insert(currentSubscription.currentSubscriptions)
      .values({
        userId,
        subscriptionId: createOrderSubscriptionDto.subscriptionId,
        orderSubscriptionId: newOrderSubscription[0].id,
        featureUsage: subscription.features,
        isActive: true
      })
      .onConflictDoUpdate({
        target: [currentSubscription.currentSubscriptions.userId],
        set: {
          subscriptionId: createOrderSubscriptionDto.subscriptionId,
          orderSubscriptionId: newOrderSubscription[0].id,
          featureUsage: subscription.features,
          isActive: true,
          updatedAt: new Date()
        }
      });

    return {
      message: 'Order subscription created successfully',
      orderSubscription: newOrderSubscription[0],
    };
  }

  async update(orderId: number, updateOrderSubscriptionDto: UpdateOrderSubscriptionDto, userId: number) {
    // Verify the order exists and belongs to the user
    const existingOrder = await this.db
      .select()
      .from(schema.orderSubscriptions)
      .where(and(
        eq(schema.orderSubscriptions.id, orderId),
        eq(schema.orderSubscriptions.userId, userId)
      ))
      .limit(1);

    if (!existingOrder[0]) {
      throw new BadRequestException('Order subscription not found or unauthorized');
    }

    if (!updateOrderSubscriptionDto.subscriptionId) {
      throw new BadRequestException('Subscription ID is required');
    }
    
    const subscription = await this.db.query.subscriptions.findFirst({
      where: eq(subscriptionSchema.subscriptions.id, updateOrderSubscriptionDto.subscriptionId)
    });

    if (!subscription) {
      throw new BadRequestException('Subscription not found');
    }

    const startDate = new Date();
    const endDate = this.calculateDurationInDays(startDate, subscription.planType);
    const nextBillingDate = this.calculateNextBillingDate(endDate, subscription.planType);

    // Deactivate current order
    await this.db.update(schema.orderSubscriptions)
      .set({
        status: 'INACTIVE',
        updatedAt: new Date()
      })
      .where(and(
        eq(schema.orderSubscriptions.userId, userId),
        eq(schema.orderSubscriptions.status, 'ACTIVE')
      ));

    // Create new order
    const newOrder = await this.db.insert(schema.orderSubscriptions)
      .values({
        userId,
        subscriptionId: updateOrderSubscriptionDto.subscriptionId,
        startDate,
        endDate,
        nextBillingDate: nextBillingDate ? sql`${nextBillingDate}` : sql`NULL`,
        status: 'ACTIVE',
        isAutoRenew: subscription.planType !== 'LIFETIME',
      })
      .returning();

    // Update current subscription
    await this.db.update(currentSubscription.currentSubscriptions)
      .set({
        subscriptionId: updateOrderSubscriptionDto.subscriptionId,
        orderSubscriptionId: newOrder[0].id,
        featureUsage: subscription.features,
        updatedAt: new Date()
      })
      .where(eq(currentSubscription.currentSubscriptions.userId, userId));

    return {
      message: 'Order subscription updated successfully',
      orderSubscription: newOrder[0],
    };
  }

  async findUserActiveSubscription(userId: number) {
    const activeSubscription = await this.db
      .select()
      .from(schema.orderSubscriptions)
      .where(
        and(
          eq(schema.orderSubscriptions.userId, userId),
          eq(schema.orderSubscriptions.status, 'ACTIVE')
        )
      )
      .limit(1);

    return activeSubscription[0];
  }

  async remove(id: number, adminRole: string) {
    if (adminRole !== 'superadmin') {
      throw new ForbiddenException('Only superadmin can delete order subscriptions');
    }

    const existingOrder = await this.db
      .select()
      .from(schema.orderSubscriptions)
      .where(eq(schema.orderSubscriptions.id, id))
      .limit(1);

    if (!existingOrder[0]) {
      throw new BadRequestException('Order subscription not found');
    }

    await this.db
      .delete(schema.orderSubscriptions)
      .where(eq(schema.orderSubscriptions.id, id));

    return {
      message: 'Order subscription deleted successfully',
    };
  }

  async findAll(page: number = 1, limit: number = 10, status?: string) {
    const offset = (page - 1) * limit;

    let query = this.db
      .select({
        orderSubscription: schema.orderSubscriptions,
        user: {
          id: userSchema.users.id,
          name: userSchema.users.name,
          email: userSchema.users.email,
        },
        subscription: {
          id: subscriptionSchema.subscriptions.id,
          name: subscriptionSchema.subscriptions.name,
          price: subscriptionSchema.subscriptions.price,
          planType: subscriptionSchema.subscriptions.planType,
        },
      })
      .from(schema.orderSubscriptions)
      .leftJoin(userSchema.users, eq(schema.orderSubscriptions.userId, userSchema.users.id))
      .leftJoin(subscriptionSchema.subscriptions, eq(schema.orderSubscriptions.subscriptionId, subscriptionSchema.subscriptions.id));

    if (status) {
      query = query.where(eq(schema.orderSubscriptions.status, status)) as typeof query;
    }

    const [totalCount] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.orderSubscriptions)
      .then(rows => rows);

    const orders = await query
      .limit(limit)
      .offset(offset)
      .orderBy(desc(schema.orderSubscriptions.createdAt));

    return {
      data: orders,
      meta: {
        total: totalCount.count,
        page,
        limit,
        totalPages: Math.ceil(totalCount.count / limit),
      },
    };
  }

  async findOne(id: number) {
    const order = await this.db
      .select({
        orderSubscription: schema.orderSubscriptions,
        user: {
          id: userSchema.users.id,
          name: userSchema.users.name,
          email: userSchema.users.email,
        },
        subscription: {
          id: subscriptionSchema.subscriptions.id,
          name: subscriptionSchema.subscriptions.name,
          price: subscriptionSchema.subscriptions.price,
          planType: subscriptionSchema.subscriptions.planType,
          features: subscriptionSchema.subscriptions.features,
        },
      })
      .from(schema.orderSubscriptions)
      .leftJoin(userSchema.users, eq(schema.orderSubscriptions.userId, userSchema.users.id))
      .leftJoin(subscriptionSchema.subscriptions, eq(schema.orderSubscriptions.subscriptionId, subscriptionSchema.subscriptions.id))
      .where(eq(schema.orderSubscriptions.id, id))
      .limit(1)
      .then(rows => rows[0]);

    if (!order) {
      throw new BadRequestException('Order subscription not found');
    }

    return order;
  }
}
