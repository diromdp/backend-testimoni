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
				transactionStatus: 'pending',
				paymentBase: {},
				orderPayment: '',
				grossAmount: 0,
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
				nameSubscription: freeSubscription.name,
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
		const result = await this.db
			.select({
				currentSubscription: schema.currentSubscriptions,
				grossAmount: orderSubscriptionSchema.orderSubscriptions.grossAmount,
				transactionStatus: orderSubscriptionSchema.orderSubscriptions.transactionStatus,
				paymentBase: orderSubscriptionSchema.orderSubscriptions.paymentBase,
				orderPayment: orderSubscriptionSchema.orderSubscriptions.orderPayment,
			})
			.from(schema.currentSubscriptions)
			.leftJoin(
				orderSubscriptionSchema.orderSubscriptions,
				eq(schema.currentSubscriptions.orderSubscriptionId, orderSubscriptionSchema.orderSubscriptions.id)
			)
			.where(eq(schema.currentSubscriptions.userId, userId))
			.limit(1);

		if (!result || result.length === 0) {
			throw new Error('Current subscription not found for this user');
		}

		// Merge the current subscription with grossAmount
		const subscription = {
			...result[0].currentSubscription,
			grossAmount: result[0].grossAmount || 0,
			transactionStatus: result[0].transactionStatus,
			paymentBase: result[0].paymentBase,
			orderPayment: result[0].orderPayment,

		};

		return subscription;
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

	async checkPremiumStatus(userId: number): Promise<{ isPremium: boolean }> {
		try {
			const subscription = await this.getCurrentSubscription(userId);
			// Check if subscription type is not 'free' and is active
			const isPremium = subscription.type !== 'free' && subscription.isActive;
			return { isPremium };
		} catch (error) {
			// If there's no subscription or any error, user is not premium
			return { isPremium: false };
		}
	}
}
