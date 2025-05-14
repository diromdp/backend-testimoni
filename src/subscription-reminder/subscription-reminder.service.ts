import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DATABASE_CONNECTION } from '../database/database-connection';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { currentSubscriptions } from '../current-subscription/schema';
import { users } from '../user/schema';
import { MailService } from '../mail/mail.service';
import { eq, and, lte, gte, sql } from 'drizzle-orm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SubscriptionReminderService {
  private readonly logger = new Logger(SubscriptionReminderService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<any>,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  // Run at 1 AM every Sunday
  @Cron('0 1 * * 0')
  async checkSubscriptionsForReminders() {
    this.logger.log('Running subscription reminder check (Sunday 1 AM)...');
    
    try {
      // Check if there are any premium subscriptions first
      const premiumCount = await this.db
        .select({ count: sql`count(*)` })
        .from(currentSubscriptions)
        .where(eq(currentSubscriptions.type, 'premium'))
        .limit(1);
      
      // Exit early if no premium subscriptions exist
      if (!premiumCount.length || premiumCount[0].count === 0) {
        this.logger.log('No premium subscriptions found, skipping reminder check.');
        return;
      }
      
      const today = new Date();
      // Set to Indonesia timezone (UTC+7)
      today.setHours(today.getHours() + 7);
      
      // Check subscriptions that will expire in 3 days
      const threeDaysFromNow = new Date(today);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      
      // Format dates for comparison (removing time part)
      const todayStr = today.toISOString().split('T')[0];
      const threeDaysFromNowStr = threeDaysFromNow.toISOString().split('T')[0];
      
      // Find subscriptions with nextBillingDate within the next 3 days
      const subscriptionsToRemind = await this.db
        .select({
          subscription: currentSubscriptions,
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(currentSubscriptions)
        .leftJoin(users, eq(currentSubscriptions.userId, users.id))
        .where(
          and(
            eq(currentSubscriptions.isActive, true),
            eq(currentSubscriptions.type, 'premium'), // Only premium type
            gte(currentSubscriptions.nextBillingDate, new Date(todayStr)),
            lte(currentSubscriptions.nextBillingDate, new Date(threeDaysFromNowStr))
          )
        );
      
      this.logger.log(`Found ${subscriptionsToRemind.length} premium subscriptions to remind`);
      
      // Send reminder emails
      for (const item of subscriptionsToRemind) {
        if (item.user && item.user.email && item.subscription.nameSubscription) {
          await this.sendReminderEmail(
            item.user.email,
            {
              name: item.user.name || 'Pelanggan',
              subscriptionName: item.subscription.nameSubscription,
              expiryDate: item.subscription.nextBillingDate,
            }
          );
          
          this.logger.log(`Sent reminder email to user: ${item.user.email}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error checking subscriptions for reminders: ${error.message}`);
    }
  }
  
  // Run at 1 AM every Sunday
  // @Cron('0 1 * * 0')
  // async deactivateExpiredSubscriptions() {
  //   this.logger.log('Running expired subscription check (Sunday 1 AM)...');
    
  //   try {
  //     // Check if there are any premium subscriptions first
  //     const premiumCount = await this.db
  //       .select({ count: sql`count(*)` })
  //       .from(currentSubscriptions)
  //       .where(eq(currentSubscriptions.type, 'premium'))
  //       .limit(1);
      
  //     // Exit early if no premium subscriptions exist
  //     if (!premiumCount.length || premiumCount[0].count === 0) {
  //       this.logger.log('No premium subscriptions found, skipping deactivation check.');
  //       return;
  //     }
      
  //     const today = new Date();
  //     // Set to Indonesia timezone (UTC+7)
  //     today.setHours(today.getHours() + 7);
      
  //     // Format date for comparison (removing time part)
  //     const todayStr = today.toISOString().split('T')[0];
      
  //     // Define batch size for processing large datasets
  //     const BATCH_SIZE = 100;
  //     let offset = 0;
  //     let hasMoreRecords = true;
      
  //     while (hasMoreRecords) {
  //       // Find expired premium subscriptions with pagination
  //       const expiredSubscriptions = await this.db
  //         .select({
  //           subscription: currentSubscriptions,
  //           user: {
  //             id: users.id,
  //             name: users.name,
  //             email: users.email,
  //           },
  //         })
  //         .from(currentSubscriptions)
  //         .leftJoin(users, eq(currentSubscriptions.userId, users.id))
  //         .where(
  //           and(
  //             eq(currentSubscriptions.isActive, true),
  //             eq(currentSubscriptions.type, 'premium'), // Only process premium subscriptions
  //             lte(currentSubscriptions.nextBillingDate, new Date(todayStr))
  //           )
  //         )
  //         .limit(BATCH_SIZE)
  //         .offset(offset);
        
  //       if (expiredSubscriptions.length === 0) {
  //         hasMoreRecords = false;
  //         break;
  //       }
        
  //       this.logger.log(`Processing batch of ${expiredSubscriptions.length} expired subscriptions (offset: ${offset})`);
        
  //       // Process batch of expired subscriptions
  //       for (const item of expiredSubscriptions) {
  //         // Update subscription to inactive with specific featureUsage changes
  //         await this.db
  //           .update(currentSubscriptions)
  //           .set({
  //             isActive: false,
  //             type: 'free',
  //             updatedAt: new Date(),
  //             // Only update remove_brand in featureUsage to true
  //             featureUsage: sql`
  //               jsonb_set(
  //                 ${currentSubscriptions.featureUsage}::jsonb, 
  //                 '{remove_brand}', 
  //                 'false'::jsonb
  //               )
  //             `
  //           })
  //           .where(eq(currentSubscriptions.id, item.subscription.id));
          
  //         // Send expiration notification if user exists
  //         if (item.user && item.user.email && item.subscription.nameSubscription) {
  //           await this.sendExpirationEmail(
  //             item.user.email,
  //             {
  //               name: item.user.name || 'Pelanggan',
  //               subscriptionName: item.subscription.nameSubscription,
  //             }
  //           );
            
  //           this.logger.log(`Deactivated subscription and sent notification to user: ${item.user.email}`);
  //         } else {
  //           this.logger.log(`Deactivated subscription ID: ${item.subscription.id} (no user or email found)`);
  //         }
  //       }
        
  //       // Move to next batch
  //       offset += BATCH_SIZE;
  //     }
  //   } catch (error) {
  //     this.logger.error(`Error deactivating expired subscriptions: ${error.message}`);
  //   }
  // }
  
  // Email for reminding users to renew their subscription
  private async sendReminderEmail(to: string, data: {
    name: string;
    subscriptionName: string;
    expiryDate: Date;
  }) {
    const subject = 'Pengingat: Langganan Anda Akan Segera Berakhir';
    const formattedDate = new Date(data.expiryDate).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pengingat Langganan</title>
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
            border: 1px solid #e0e0e0;
          }
          .footer {
            background-color: #f5f5f5;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #666666;
            border: 1px solid #e0e0e0;
            border-top: none;
          }
          .notice {
            background-color: #fff8e1;
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
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Syafaq</h1>
          </div>
          <div class="content">
            <h2>Pengingat Langganan</h2>
            <p>Halo <strong>${data.name}</strong>,</p>
            
            <div class="notice">
              <p>Langganan <strong>${data.subscriptionName}</strong> Anda akan berakhir pada <strong>${formattedDate}</strong>.</p>
            </div>
            
            <p>Untuk terus menikmati akses penuh ke fitur premium dan layanan Syafaq, mohon perbarui langganan Anda sebelum tanggal tersebut.</p>
            
            <p>Jika langganan Anda tidak diperbarui, akun Anda akan dinonaktifkan dan Anda akan kehilangan akses ke fitur premium.</p>
            
            <p>Perbarui langganan Anda sekarang untuk menghindari gangguan layanan:</p>
            
            <div style="text-align: center; margin-top: 25px;">
              <a href="${this.configService.get('BASE_URL')}/upgrade-premium" class="button">Perbarui Langganan</a>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Syafaq. Semua hak dilindungi.</p>
            <p>Jika Anda memiliki pertanyaan, silakan hubungi tim dukungan kami di ${this.configService.get('MAIL_USER')}.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return this.mailService.sendEmailMailer({
      to,
      subject,
      html,
      from: `"Syafaq" <${this.configService.get<string>('MAIL_USER')}>`,
    });
  }
  
  // Email for notifying users that their subscription has expired
  private async sendExpirationEmail(to: string, data: {
    name: string;
    subscriptionName: string;
  }) {
    const subject = 'Langganan Anda Telah Berakhir';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Langganan Berakhir</title>
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
            border: 1px solid #e0e0e0;
          }
          .footer {
            background-color: #f5f5f5;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #666666;
            border: 1px solid #e0e0e0;
            border-top: none;
          }
          .alert {
            background-color: #fef8f8;
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
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Syafaq</h1>
          </div>
          <div class="content">
            <h2>Langganan Anda Telah Berakhir</h2>
            <p>Halo <strong>${data.name}</strong>,</p>
            
            <div class="alert">
              <p>Langganan <strong>${data.subscriptionName}</strong> Anda telah berakhir dan akun Anda sekarang telah dikembalikan ke akses terbatas.</p>
            </div>
            
            <p>Anda tidak lagi memiliki akses ke fitur premium berikut:</p>
            <ul>
              <li>Penggunaan testimoni tanpa batas</li>
              <li>Pengaturan kustom lanjutan</li>
              <li>Dukungan prioritas</li>
              <li>Dan fitur premium lainnya</li>
            </ul>
            
            <p>Untuk memulihkan akses ke semua fitur premium, silakan perbarui langganan Anda:</p>
            
            <div style="text-align: center; margin-top: 25px;">
              <a href="${this.configService.get('BASE_URL')}/upgrade-premium" class="button">Perbarui Langganan Sekarang</a>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Syafaq. Semua hak dilindungi.</p>
            <p>Jika Anda memiliki pertanyaan, silakan hubungi tim dukungan kami di ${this.configService.get('MAIL_USER')}.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return this.mailService.sendEmailMailer({
      to,
      subject,
      html,
      from: `"Syafaq" <${this.configService.get<string>('MAIL_USER')}>`,
    });
  }
} 