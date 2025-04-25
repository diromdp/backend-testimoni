import { Injectable, ForbiddenException, BadRequestException, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { DATABASE_CONNECTION } from '../database/database-connection';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class SubscriptionService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) { }

  async create(createSubscriptionDto: CreateSubscriptionDto, adminId: number) {
    try {
      const newSubscription = await this.db
        .insert(schema.subscriptions)
        .values({
          name: createSubscriptionDto.name,
          features: createSubscriptionDto.features,
          description: createSubscriptionDto.description,
          price: createSubscriptionDto.price,
          position: createSubscriptionDto.position,
          planType: createSubscriptionDto.planType,
          type: createSubscriptionDto.type,
          adminId: adminId,
        })
        .returning();

      return {
        message: 'Subscription created successfully',
        subscription: newSubscription[0],
      };
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw new BadRequestException('Failed to create subscription');
    }
  }

  async findAll(adminRole: string) {
    if (adminRole !== 'superadmin') {
      throw new ForbiddenException('Only superadmin can view all subscriptions');
    }
    try {
    const subscriptions = await this.db
      .select()
      .from(schema.subscriptions);

      return subscriptions;
    } catch (error) {
      throw new Error(`Failed to find all subscriptions: ${error.message}`);
    }
  }

  async findOne(id: number, adminRole: string) {
    if (adminRole !== 'superadmin') {
      throw new ForbiddenException('Only superadmin can view subscription details');
    }
    try {
      const subscription = await this.db
        .select()
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.id, id))
        .limit(1);

      if (!subscription[0]) {
        throw new BadRequestException('Subscription not found');
      }

      return subscription[0];
    }
    catch (error) {
      throw new Error(`Failed to find subscription ${id}: ${error.message}`);
    }
  }

  async update(id: number, updateSubscriptionDto: UpdateSubscriptionDto, adminRole: string) {
    if (adminRole !== 'superadmin') {
      throw new HttpException(
        'Only superadmin can update subscriptions',
        HttpStatus.FORBIDDEN,
      );
    }
    try {
      const existingSubscription = await this.db
        .select()
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.id, id))
        .limit(1);

      if (!existingSubscription[0]) {
        throw new HttpException(
          'Subscription not found',
          HttpStatus.NOT_FOUND,
        );
      }

      const updatedSubscription = await this.db
        .update(schema.subscriptions)
        .set(updateSubscriptionDto)
        .where(eq(schema.subscriptions.id, id))
        .returning();

      return {
        message: 'Subscription updated successfully',
        subscription: updatedSubscription[0],
      };
    } catch (error) {
      throw new Error(`Failed to update subscription ${id}: ${error.message}`);
    }
  }

  async remove(id: number, adminRole: string) {
    if (adminRole !== 'superadmin') {
      throw new ForbiddenException('Only superadmin can delete subscriptions');
    }

    try {
      const existingSubscription = await this.db
        .select()
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.id, id))
        .limit(1);

      if (!existingSubscription[0]) {
        throw new BadRequestException('Subscription not found');
      }

      await this.db
        .delete(schema.subscriptions)
        .where(eq(schema.subscriptions.id, id));

      return {
        message: 'Subscription deleted successfully',
      };
    } catch (error) {
      throw new Error(`Failed to delete subscription ${id}: ${error.message}`);
    }
  }

  async findAllPublic() {
    try {
      const subscriptions = await this.db
        .select({
          id: schema.subscriptions.id,
          name: schema.subscriptions.name,
          features: schema.subscriptions.features,
          description: schema.subscriptions.description,
          price: schema.subscriptions.price,
          planType: schema.subscriptions.planType,
          position: schema.subscriptions.position,
          type: schema.subscriptions.type,
        })
        .from(schema.subscriptions)

      return subscriptions;
    } catch (error) {
      throw new Error(`Failed to find all public subscriptions: ${error.message}`);
    }
  }

  async findOnePublic(id: number) {
    const subscription = await this.db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.id, id))
      .limit(1);

    return subscription[0];
  }
  
}
