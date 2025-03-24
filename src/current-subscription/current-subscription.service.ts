import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database-connection';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import * as subscriptionSchema from '../subscription/schema';
import * as orderSubscriptionSchema from '../order-subscription/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class CurrentSubscriptionService {
	constructor(
		@Inject(DATABASE_CONNECTION)
		private readonly db: NodePgDatabase<typeof schema>,
	) { }

	async setDefaultSubscription(userId: number): Promise<any> {
		// Find the free subscription type
		const freeSubscription = await this.db
			.select()
			.from(subscriptionSchema.subscriptions)
			.where(eq(subscriptionSchema.subscriptions.type, 'free'))
			.limit(1)
			.then(rows => rows[0]);

		if (!freeSubscription) {
			throw new Error('Free subscription type not found');
		}

		// Create new order subscription first
		const startDate = new Date();
		const endDate = new Date();
		endDate.setFullYear(endDate.getFullYear() + 100); // Set far future date for free subscription

		const [orderSubscription] = await this.db
			.insert(orderSubscriptionSchema.orderSubscriptions)
			.values({
				userId,
				subscriptionId: freeSubscription.id,
				startDate,
				endDate,
				nextBillingDate: endDate,
				status: 'ACTIVE',
				isAutoRenew: false,
			})
			.returning();

		// Create new current subscription entry
		const currentSubscription = await this.db
			.insert(schema.currentSubscriptions)
			.values({
				userId,
				subscriptionId: freeSubscription.id,
				orderSubscriptionId: orderSubscription.id,
				type: 'free',
				featureUsage: freeSubscription.features,
				featureLimit: freeSubscription.features,
				startDate,
				endDate,
				nextBillingDate: endDate,
				isActive: true,
			})
			.returning();

		return currentSubscription[0];
	}

	async getCurrentSubscription(userId: number): Promise<any> {
		const currentSubscription = await this.db
			.select()
			.from(schema.currentSubscriptions)
			.where(eq(schema.currentSubscriptions.userId, userId))
			.limit(1)
			.then(rows => rows[0]);

		if (!currentSubscription) {
			throw new Error('Current subscription not found for this user');
		}

		return currentSubscription;
	}

	async updateFeatureUsage(userId: number, featureUsage: Record<string, any>): Promise<any> {
		// First check if the subscription exists
		const currentSubscription = await this.getCurrentSubscription(userId);

		if (!currentSubscription) {
			throw new Error('Current subscription not found for this user');
		}

		// Merge existing feature usage with new updates
		const updatedFeatureUsage = {
			...currentSubscription.featureUsage,
			...featureUsage
		};

		// Update the feature usage
		const [updatedSubscription] = await this.db
			.update(schema.currentSubscriptions)
			.set({
				featureUsage: updatedFeatureUsage,
				updatedAt: new Date(),
			})
			.where(eq(schema.currentSubscriptions.userId, userId))
			.returning();

		return updatedSubscription;
	}
}
