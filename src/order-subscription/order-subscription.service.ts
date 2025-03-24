import { Injectable, BadRequestException, ForbiddenException, Inject, HttpException, HttpStatus } from '@nestjs/common';
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
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as nodemailer from 'nodemailer';

@Injectable()
export class OrderSubscriptionService {
  private readonly serverKey: string;
  private readonly clientKey: string;
  private readonly isProduction: boolean;
  private readonly apiUrl: string;
  private transporter: nodemailer.Transporter;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema & typeof subscriptionSchema>,
    private readonly subscriptionService: SubscriptionService,
    private readonly configService: ConfigService
  ) { 
    this.serverKey = this.configService.get<string>('SERVER_KEY') || '';
    this.clientKey = this.configService.get<string>('CLIENT_ID') || '';
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    this.apiUrl = this.isProduction 
      ? this.configService.get<string>('SANDBOX_PROD') || ''
      : this.configService.get<string>('SANDBOX_DEV') || '';

    // Initialize email transporter
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      secure: false,
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASSWORD')
      }
    });
  }

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

  async create(userId: number, createOrderSubscriptionDto: CreateOrderSubscriptionDto, status: string) {
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

    // Check if user has existing active subscription
    const existingCurrentSubscription = await this.db
      .select()
      .from(currentSubscription.currentSubscriptions)
      .where(eq(currentSubscription.currentSubscriptions.userId, userId))
      .limit(1);

    // Prepare feature usage data
    let featureUsage = subscription.features;

    // If user has existing subscription, merge features
    if (existingCurrentSubscription && existingCurrentSubscription[0]) {
      const prevFeatureUsage = existingCurrentSubscription[0].featureUsage;
      
      // Merge the features, keeping used values from previous subscription
      if (prevFeatureUsage && typeof prevFeatureUsage === 'object') {
        featureUsage = this.mergeFeatureUsage(prevFeatureUsage, subscription.features);
      }
    }

    const newOrderSubscription = await this.db
      .insert(schema.orderSubscriptions)
      .values({
        userId,
        subscriptionId: createOrderSubscriptionDto.subscriptionId,
        startDate,
        endDate,
        status: status ? status : 'PENDING',
        nextBillingDate: nextBillingDate ? sql`${nextBillingDate}` : sql`NULL`,
        isAutoRenew: subscription.planType !== 'LIFETIME',
      })
      .returning();

    await this.db.insert(currentSubscription.currentSubscriptions)
      .values({
        userId,
        subscriptionId: createOrderSubscriptionDto.subscriptionId,
        orderSubscriptionId: newOrderSubscription[0].id,
        type: subscription.type,
        startDate,
        endDate,
        nextBillingDate: nextBillingDate ? sql`${nextBillingDate}` : sql`NULL`,
        featureUsage: featureUsage,
        featureLimit: subscription.features,
        isActive: true
      })
      .onConflictDoUpdate({
        target: [currentSubscription.currentSubscriptions.userId],
        set: {
          subscriptionId: createOrderSubscriptionDto.subscriptionId,
          orderSubscriptionId: newOrderSubscription[0].id,
          type: subscription.type,
          startDate,
          endDate,
          nextBillingDate: nextBillingDate ? sql`${nextBillingDate}` : sql`NULL`,
          featureUsage: featureUsage,
          featureLimit: subscription.features,
          isActive: true,
          updatedAt: new Date()
        }
      });

    return {
      message: 'Order subscription created successfully',
      orderSubscription: newOrderSubscription[0],
    };
  }

  // Helper method to merge feature usage
  private mergeFeatureUsage(prevFeatures: any, newFeatures: any): any {
    const mergedFeatures = { ...newFeatures };
    
    // Traverse previous features
    for (const key in prevFeatures) {
      if (Object.prototype.hasOwnProperty.call(prevFeatures, key)) {
        // Check if feature exists in new subscription
        if (mergedFeatures[key] !== undefined) {
          const prevFeature = prevFeatures[key];
          const newFeature = mergedFeatures[key];
          
          // If feature is an object with limit and used properties
          if (typeof prevFeature === 'object' && 
              prevFeature !== null && 
              typeof newFeature === 'object' && 
              newFeature !== null &&
              'limit' in newFeature && 
              'used' in prevFeature) {
            
            // Keep the used value from previous subscription
            mergedFeatures[key] = {
              ...newFeature,
              used: prevFeature.used,
              // Ensure used doesn't exceed new limit
              remaining: Math.max(0, newFeature.limit - prevFeature.used)
            };
          }
          // If feature is a simple count or boolean value, keep the new value
        }
      }
    }
    
    return mergedFeatures;
  }

  // Midtrans Integration Methods
  async generateSnapToken(params: {
    userId: number;
    subscriptionId: number;
    userName: string;
    userEmail: string;
  }) {
    try {
      const { userId, subscriptionId, userName, userEmail } = params;
      
      // Get subscription details
      const subscription = await this.subscriptionService.findOne(subscriptionId, 'superadmin');
      
      if (!subscription) {
        throw new BadRequestException('Subscription not found');
      }
      
      // Generate unique order ID
      const orderId = `SUB-${Date.now()}-${userId}`;
      const baseUrl = this.configService.get<string>('APP_URL');
      
      const payload = {
        transaction_details: {
          order_id: orderId,
          gross_amount: subscription.price
        },
        customer_details: {
          first_name: userName,
          email: userEmail
        },
        item_details: [{
          id: `SUB-${subscription.id}`,
          name: `${subscription.name} (${subscription.planType})`,
          price: subscription.price,
          quantity: 1
        }],
        callbacks: {
          finish: `${baseUrl}/payment-check`,
          error: `${baseUrl}/payment-error`,
          pending: `${baseUrl}/payment-pending`
        }
      };

      const auth = Buffer.from(`${this.serverKey}:`).toString('base64');
      
      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Basic ${auth}`
        }
      });

      return {
        token: response.data.token,
        redirect_url: response.data.redirect_url,
        clientKey: this.clientKey,
        order_id: orderId
      };
    } catch (error) {
      console.error('Error generating Snap token:', error.response?.data || error.message);
      throw new HttpException(
        error.response?.data?.error_messages || 'Failed to generate Snap token',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async verifyPaymentNotification(notification: any) {
    try {
      const orderId = notification.order_id;
      const statusCode = notification.status_code;
      const grossAmount = notification.gross_amount;
      const transactionStatus = notification.transaction_status;
      const fraudStatus = notification.fraud_status;
      
      // Verify the transaction status
      let paymentStatus: 'SUCCESS' | 'PENDING' | 'FAILED' = 'FAILED';
      
      if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
        if (fraudStatus === 'accept') {
          paymentStatus = 'SUCCESS';
        }
      } else if (transactionStatus === 'pending') {
        paymentStatus = 'PENDING';
      }
      
      return {
        orderId,
        statusCode,
        grossAmount,
        transactionStatus,
        fraudStatus,
        paymentStatus
      };
    } catch (error) {
      console.error('Error verifying payment notification:', error);
      throw new HttpException(
        'Failed to verify payment notification',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async checkTransactionStatus(orderId: string) {
    try {
      const baseUrl = this.isProduction
        ? 'https://api.midtrans.com'
        : 'https://api.sandbox.midtrans.com';
      
      const auth = Buffer.from(`${this.serverKey}:`).toString('base64');
      
      const response = await axios.get(`${baseUrl}/v2/${orderId}/status`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error checking transaction status:', error);
      throw new HttpException(
        'Failed to check transaction status',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Email methods
  async sendPaymentSuccessEmail(to: string, data: {
    name: string;
    subscriptionName: string;
    amount: number;
    orderId: string;
  }) {
    const subject = 'Pembayaran Berhasil - Langganan Anda Telah Aktif';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pembayaran Berhasil</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
          }
          .header {
            background-color: #ff7235;
            padding: 20px;
            text-align: center;
          }
          .header h1 {
            color: white;
            margin: 0;
            font-size: 24px;
          }
          .logo {
            max-width: 150px;
            margin-bottom: 10px;
          }
          .content {
            padding: 30px;
            background-color: #ffffff;
          }
          .footer {
            background-color: #f5f5f5;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #666666;
          }
          .order-details {
            background-color: #f9f9f9;
            border-left: 4px solid #ff7235;
            padding: 15px;
            margin: 20px 0;
          }
          .button {
            display: inline-block;
            background-color: #ff7235;
            color: white;
            text-decoration: none;
            padding: 12px 25px;
            border-radius: 4px;
            margin-top: 20px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>TESTINESIA</h1>
          </div>
          <div class="content">
            <h2>Pembayaran Berhasil! 🎉</h2>
            <p>Halo <strong>${data.name}</strong>,</p>
            <p>Kami ingin memberitahu bahwa pembayaran Anda untuk langganan <strong>${data.subscriptionName}</strong> telah berhasil diproses.</p>
            
            <div class="order-details">
              <p><strong>Order ID:</strong> ${data.orderId}</p>
              <p><strong>Jumlah:</strong> Rp ${data.amount.toLocaleString('id-ID')}</p>
              <p><strong>Status:</strong> <span style="color: #28a745;">Berhasil</span></p>
            </div>
            
            <p>Langganan Anda sekarang aktif. Anda dapat mulai menggunakan semua fitur premium Testinesia.</p>
            
            <p>Terima kasih atas kepercayaan Anda menggunakan layanan Testinesia!</p>
            
            <a href="${this.configService.get('BASE_URL')}/dashboard" class="button">Akses Dashboard</a>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Testinesia. Semua hak dilindungi.</p>
            <p>Jika Anda memiliki pertanyaan, silakan hubungi tim dukungan kami di ${this.configService.get('MAIL_USER')}.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(to, subject, html);
  }

  async sendPaymentFailedEmail(to: string, data: {
    name: string;
    subscriptionName: string;
    orderId: string;
  }) {
    const subject = 'Pembayaran Gagal - Tindakan Diperlukan';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pembayaran Gagal</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
          }
          .header {
            background-color: #ff7235;
            padding: 20px;
            text-align: center;
          }
          .header h1 {
            color: white;
            margin: 0;
            font-size: 24px;
          }
          .content {
            padding: 30px;
            background-color: #ffffff;
          }
          .footer {
            background-color: #f5f5f5;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #666666;
          }
          .order-details {
            background-color: #f9f9f9;
            border-left: 4px solid #dc3545;
            padding: 15px;
            margin: 20px 0;
          }
          .button {
            display: inline-block;
            background-color: #ff7235;
            color: white;
            text-decoration: none;
            padding: 12px 25px;
            border-radius: 4px;
            margin-top: 20px;
            font-weight: bold;
          }
          .alert {
            background-color: #fff8f8;
            border-left: 4px solid #dc3545;
            padding: 15px;
            margin: 20px 0;
            color: #721c24;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>TESTINESIA</h1>
          </div>
          <div class="content">
            <h2>Pembayaran Gagal</h2>
            <p>Halo <strong>${data.name}</strong>,</p>
            
            <div class="alert">
              <p>Maaf, pembayaran Anda untuk langganan <strong>${data.subscriptionName}</strong> tidak dapat diproses.</p>
            </div>
            
            <div class="order-details">
              <p><strong>Order ID:</strong> ${data.orderId}</p>
              <p><strong>Status:</strong> <span style="color: #dc3545;">Gagal</span></p>
            </div>
            
            <p>Beberapa alasan umum pembayaran gagal:</p>
            <ul>
              <li>Dana tidak mencukupi</li>
              <li>Batas transaksi harian terlampaui</li>
              <li>Masalah koneksi saat proses pembayaran</li>
              <li>Metode pembayaran tidak didukung</li>
            </ul>
            
            <p>Silakan coba lagi dengan metode pembayaran yang berbeda atau hubungi tim dukungan kami jika Anda memerlukan bantuan.</p>
            
            <a href="${this.configService.get('BASE_URL')}/subscription" class="button">Coba Lagi</a>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Testinesia. Semua hak dilindungi.</p>
            <p>Jika Anda memiliki pertanyaan, silakan hubungi tim dukungan kami di ${this.configService.get('MAIL_USER')}.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(to, subject, html);
  }

  async sendPaymentPendingEmail(to: string, data: {
    name: string;
    subscriptionName: string;
    orderId: string;
  }) {
    const subject = 'Pembayaran Tertunda - Tindakan Diperlukan';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pembayaran Tertunda</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
          }
          .header {
            background-color: #ff7235;
            padding: 20px;
            text-align: center;
          }
          .header h1 {
            color: white;
            margin: 0;
            font-size: 24px;
          }
          .content {
            padding: 30px;
            background-color: #ffffff;
          }
          .footer {
            background-color: #f5f5f5;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #666666;
          }
          .order-details {
            background-color: #f9f9f9;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
          }
          .button {
            display: inline-block;
            background-color: #ff7235;
            color: white;
            text-decoration: none;
            padding: 12px 25px;
            border-radius: 4px;
            margin-top: 20px;
            font-weight: bold;
          }
          .warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>TESTINESIA</h1>
          </div>
          <div class="content">
            <h2>Pembayaran Tertunda</h2>
            <p>Halo <strong>${data.name}</strong>,</p>
            
            <div class="warning">
              <p>Pembayaran Anda untuk langganan <strong>${data.subscriptionName}</strong> saat ini tertunda.</p>
            </div>
            
            <div class="order-details">
              <p><strong>Order ID:</strong> ${data.orderId}</p>
              <p><strong>Status:</strong> <span style="color: #ffc107;">Tertunda</span></p>
            </div>
            
            <p>Kami mencatat bahwa transaksi Anda sedang dalam proses verifikasi atau menunggu pembayaran. Untuk menyelesaikan proses pembayaran:</p>
            
            <ol>
              <li>Selesaikan instruksi pembayaran dari bank atau provider pembayaran Anda</li>
              <li>Simpan bukti pembayaran sebagai referensi</li>
              <li>Tunggu 1x24 jam untuk proses verifikasi</li>
            </ol>
            
            <p>Jika Anda telah menyelesaikan pembayaran, harap tunggu beberapa saat untuk sistem kami memproses pembayaran Anda.</p>
            
            <a href="${this.configService.get('BASE_URL')}/payment/check" class="button">Cek Status Pembayaran</a>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Testinesia. Semua hak dilindungi.</p>
            <p>Jika Anda memiliki pertanyaan, silakan hubungi tim dukungan kami di ${this.configService.get('MAIL_USER')}.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(to, subject, html);
  }

  private async sendEmail(to: string, subject: string, html: string) {
    try {
      const info = await this.transporter.sendMail({
        from: `"Testinesia" <${this.configService.get<string>('MAIL_USER')}>`,
        to,
        subject,
        html
      });
      
      return info;
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
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

  async getUserOrderHistory(userId: number) {
    try {
      const orders = await this.db
        .select({
          id: schema.orderSubscriptions.id,
          startDate: schema.orderSubscriptions.startDate,
          endDate: schema.orderSubscriptions.endDate,
          status: schema.orderSubscriptions.status,
          createdAt: schema.orderSubscriptions.createdAt,
          subscription: {
            name: subscriptionSchema.subscriptions.name,
            price: subscriptionSchema.subscriptions.price,
            planType: subscriptionSchema.subscriptions.planType,
            type: subscriptionSchema.subscriptions.type,
          }
        })
        .from(schema.orderSubscriptions)
        .leftJoin(
          subscriptionSchema.subscriptions, 
          eq(schema.orderSubscriptions.subscriptionId, subscriptionSchema.subscriptions.id)
        )
        .where(eq(schema.orderSubscriptions.userId, userId))
        .orderBy(desc(schema.orderSubscriptions.createdAt));

      if (!orders || orders.length === 0) {
        return {
          message: 'Tidak ada riwayat order subscription',
          orders: []
        };
      }

      // Filter out FREE subscriptions
      const filteredOrders = orders.filter(order => 
        order.subscription?.type?.toUpperCase() !== 'free'
      );

      if (filteredOrders.length === 0) {
        return {
          message: 'Tidak ada riwayat order subscription berbayar',
          orders: []
        };
      }

      return {
        message: 'Riwayat order subscription berhasil ditemukan',
        orders: filteredOrders
      };
    } catch (error) {
      throw new Error(`Gagal mendapatkan riwayat order subscription: ${error.message}`);
    }
  }

  async getUserByOrderId(orderId: string) {
    // Parse order ID to get user ID
    const orderParts = orderId.split('-');
    const userId = parseInt(orderParts[orderParts.length - 1]);
    
    const user = await this.db
      .select()
      .from(userSchema.users)
      .where(eq(userSchema.users.id, userId))
      .limit(1);
    
    return user[0];
  }
}
