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
import { MailService } from '../mail/mail.service';
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
    private readonly configService: ConfigService,
    private readonly mailService: MailService
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

  async create(userId: number, createOrderSubscriptionDto: CreateOrderSubscriptionDto, status: string, orderPaymentId?: string) {
    const subscription = await this.subscriptionService.findOne(
      createOrderSubscriptionDto.subscriptionId,
      'superadmin'
    );

    if (!subscription) {
      throw new BadRequestException('Subscription not found');
    }

    // Create the new order subscription first
    const newOrderSubscription = await this.db
      .insert(schema.orderSubscriptions)
      .values({
        userId,
        subscriptionId: createOrderSubscriptionDto.subscriptionId,
        transactionStatus: status ? status : 'pending',
        grossAmount: subscription.price,
        paymentBase: createOrderSubscriptionDto.paymentBase,
        orderPayment: orderPaymentId
      })
      .returning();

    // Make sure we have a valid order_subscription_id before updating current_subscriptions
    if (!newOrderSubscription || !newOrderSubscription[0] || !newOrderSubscription[0].id) {
      throw new Error('Failed to create order subscription');
    }

    return {
      message: 'Order subscription created successfully',
      orderSubscription: newOrderSubscription[0],
    };
  }

  async setSubscription(userId: number, subscriptionId: number, orderSubscriptionId: number): Promise<any> {
    try {
      // 1. Get the new subscription details
      const newSubscription = await this.subscriptionService.findOne(subscriptionId, 'superadmin');
      if (!newSubscription) {
        throw new BadRequestException('Subscription not found');
      }

      console.log('New subscription details:', {
        id: newSubscription.id,
        name: newSubscription.name,
        features: newSubscription.features
      });

      // 2. Get current subscription if exists
      const currentSub = await this.db
        .select()
        .from(currentSubscription.currentSubscriptions)
        .where(eq(currentSubscription.currentSubscriptions.userId, userId))
        .limit(1);

      console.log('Current subscription:', currentSub[0]);

      // 3. Calculate start and end dates with Indonesia timezone (WIB/UTC+7)
      const startDate = new Date();
      startDate.setHours(startDate.getHours() + 7);
      
      const endDate = this.calculateDurationInDays(startDate, newSubscription.planType);
      const nextBillingDate = new Date(endDate);
      nextBillingDate.setDate(nextBillingDate.getDate() + 3);
      
      // 4. Prepare feature usage data with proper handling for numeric values
      let featureUsage;
      if (currentSub && currentSub[0] && currentSub[0].featureUsage) {
        featureUsage = this.sumFeatureUsage(currentSub[0].featureUsage, newSubscription.features);
      } else {
        featureUsage = newSubscription.features;
      }

      // 5. Update current subscription
      if (currentSub && currentSub[0]) {
        const updated = await this.db
          .update(currentSubscription.currentSubscriptions)
          .set({
            subscriptionId: subscriptionId,
            nameSubscription: newSubscription.name,
            orderSubscriptionId: orderSubscriptionId,
            type: newSubscription.type,
            startDate: this.ensureValidDate(startDate),
            endDate: this.ensureValidDate(endDate),
            nextBillingDate: nextBillingDate ? sql`${this.ensureValidDate(nextBillingDate)}` : sql`NULL`,
            featureUsage: featureUsage,
            featureLimit: newSubscription.features,
            isActive: true,
            updatedAt: this.ensureValidDate(new Date())
          })
          .where(eq(currentSubscription.currentSubscriptions.userId, userId))
          .returning();
      
        return {
          message: 'Current subscription updated successfully',
          subscription: newSubscription,
          featureUsage
        };
      }
      
      return {
        message: 'No current subscription found to update',
        status: 'failed'
      };
    } catch (error) {
      console.error('Error setting subscription:', error);
      throw new Error(`Failed to set subscription: ${error.message}`);
    }
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
        subscriptionId: subscription.id,
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
      query = query.where(eq(schema.orderSubscriptions.transactionStatus, status)) as typeof query;
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
          createdAt: schema.orderSubscriptions.createdAt,
          transactionStatus: schema.orderSubscriptions.transactionStatus,
          payment: schema.orderSubscriptions.paymentBase,
          grossAmount: schema.orderSubscriptions.grossAmount,
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

      // Filter out orders with grossAmount = 0 and FREE subscriptions
      const filteredOrders = orders.filter(order =>
        (order.grossAmount !== 0 && order.grossAmount !== null) &&
        order.subscription?.type?.toUpperCase() !== 'FREE'
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

  async getOrderPayment(orderId: string) {
    const order = await this.db
      .select()
      .from(schema.orderSubscriptions)
      .where(eq(schema.orderSubscriptions.orderPayment, orderId))
      .limit(1);

    return order[0];
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
              <h1>Syafak</h1>
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
              
              <p>Langganan Anda sekarang aktif. Anda dapat mulai menggunakan semua fitur premium Syafak.</p>
              
              <p>Terima kasih atas kepercayaan Anda menggunakan layanan Syafak!</p>
              
              <a href="${this.configService.get('BASE_URL')}/dashboard" class="button">Akses Dashboard</a>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Syafak. Semua hak dilindungi.</p>
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
              <h1>Syafak</h1>
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
              <p>&copy; ${new Date().getFullYear()} Syafak. Semua hak dilindungi.</p>
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
              <h1>Syafak</h1>
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
              <p>&copy; ${new Date().getFullYear()} Syafak. Semua hak dilindungi.</p>
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
      return await this.mailService.sendEmailMailer({
        to,
        subject,
        html,
        from: `"Syafak" <${this.configService.get<string>('MAIL_USER')}>`
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
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

  private ensureValidDate(date: Date): Date {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return new Date(); // Default to current date if invalid
    }
    return date;
  }

  private sumFeatureUsage(existingFeatureUsage: any, newFeatures: any): any {
    if (!existingFeatureUsage || typeof existingFeatureUsage !== 'object') {
      return newFeatures;
    }
    
    if (!newFeatures || typeof newFeatures !== 'object') {
      return existingFeatureUsage;
    }
    
    const result = { ...existingFeatureUsage };
    
    // Iterate through newFeatures and add values to existing features
    for (const key in newFeatures) {
      if (Object.prototype.hasOwnProperty.call(newFeatures, key)) {
        // Tangani khusus untuk objek Date
        if (
          newFeatures[key] instanceof Date ||
          (typeof newFeatures[key] === 'string' && this.isDateString(newFeatures[key]))
        ) {
          try {
            const newDate = newFeatures[key] instanceof Date ? 
                            newFeatures[key] : 
                            new Date(newFeatures[key]);
            
                            result[key] = newDate;
                            if (!isNaN(newDate.getTime())) {
            } else {
              // Jika tanggal tidak valid, gunakan nilai existing
              // atau null jika tidak ada
              result[key] = (key in result) ? result[key] : null;
            }
          } catch (e) {
            console.error(`Error handling date for key ${key}:`, e);
            result[key] = (key in result) ? result[key] : null;
          }
        }
        // Jika kedua nilai adalah angka, jumlahkan
        else if (
          Object.prototype.hasOwnProperty.call(result, key) &&
          typeof result[key] === 'number' &&
          typeof newFeatures[key] === 'number'
        ) {
          result[key] = result[key] + newFeatures[key];
        } 
        // Tangani objek bertingkat secara rekursif dengan pemeriksaan null
        else if (
          Object.prototype.hasOwnProperty.call(result, key) &&
          result[key] !== null && newFeatures[key] !== null &&
          typeof result[key] === 'object' && typeof newFeatures[key] === 'object'
        ) {
          result[key] = this.sumFeatureUsage(result[key], newFeatures[key]);
        } 
        // Untuk kasus lain, gunakan nilai baru
        else {
          result[key] = newFeatures[key];
        }
      }
    }
    
    return result;
  }

  // Helper untuk memeriksa apakah string adalah tanggal
  private isDateString(str: string): boolean {
    if (typeof str !== 'string') return false;
    
    // Coba parse sebagai tanggal
    const date = new Date(str);
    
    // Verifikasi bahwa hasilnya adalah tanggal valid
    return !isNaN(date.getTime());
  }

  
}
