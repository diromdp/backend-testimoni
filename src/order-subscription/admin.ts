  // Admin endpoints
  // @AdminAuth()
  // @Post('admin/create')
  // @HttpCode(HttpStatus.CREATED)
  // @ApiResponse({ status: HttpStatus.CREATED, description: 'Order subscription created by admin successfully' })
  // @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Only superadmin can create order subscriptions' })
  // async adminCreate(
  //   @Body() createOrderSubscriptionDto: CreateOrderSubscriptionDto & { userId: number },
  //   @Request() req
  // ) {
  //   try {
  //     if (!createOrderSubscriptionDto.userId) {
  //       throw new BadRequestException('User ID is required');
  //     }
  //     return await this.orderSubscriptionService.create(
  //       createOrderSubscriptionDto.userId,
  //       createOrderSubscriptionDto,
  //       'ACTIVE',
  //       ''
  //     );
  //   } catch (error) {
  //     return { status: error.status || 500, message: error.message };
  //   }
  // }

  // @AdminAuth()
  // @Patch('admin/:id')
  // @ApiResponse({ status: HttpStatus.OK, description: 'Order subscription updated by admin successfully' })
  // @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Only superadmin can update order subscriptions' })
  // async adminUpdate(
  //   @Param('id') id: string,
  //   @Body() updateOrderSubscriptionDto: UpdateOrderSubscriptionDto,
  //   @Request() req
  // ) {
  //   try {
  //     return await this.orderSubscriptionService.update(+id, updateOrderSubscriptionDto, req.user.role);
  //   } catch (error) {
  //     return { status: error.status || 500, message: error.message };
  //   }
  // }

  // @AdminAuth()
  // @Get('admin/list')
  // @ApiResponse({ status: HttpStatus.OK, description: 'Order subscriptions retrieved successfully' })
  // @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Only superadmin can view order subscriptions' })
  // async adminList(
  //   @Request() req,
  //   @Query('page') page: number = 1,
  //   @Query('limit') limit: number = 10,
  //   @Query('status') status?: string
  // ) {
  //   try {
  //     if (req.user.role !== 'superadmin') {
  //       throw new BadRequestException('Only superadmin can view order subscriptions');
  //     }
  //     return await this.orderSubscriptionService.findAll(page, limit, status);
  //   } catch (error) {
  //     return { status: error.status || 500, message: error.message };
  //   }
  // }

  // @AdminAuth()
  // @Get('admin/:id')
  // @ApiResponse({ status: HttpStatus.OK, description: 'Order subscription retrieved successfully' })
  // @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Only superadmin can view order subscriptions' })
  // async adminFindOne(@Param('id') id: string, @Request() req) {
  //   try {
  //     if (req.user.role !== 'superadmin') {
  //       throw new BadRequestException('Only superadmin can view order subscriptions');
  //     }
  //     return await this.orderSubscriptionService.findOne(+id);
  //   } catch (error) {
  //     return { status: error.status || 500, message: error.message };
  //   }
  // }

  // @AdminAuth()
  // @Delete(':id')
  // @ApiResponse({ status: HttpStatus.OK, description: 'Order subscription deleted successfully' })
  // @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Only superadmin can delete order subscriptions' })
  // remove(@Param('id') id: string, @Request() req) {
  //   return this.orderSubscriptionService.remove(+id, req.user.role);
  // }

  
//   async remove(id: number, adminRole: string) {
//     if (adminRole !== 'superadmin') {
//       throw new ForbiddenException('Only superadmin can delete order subscriptions');
//     }

//     const existingOrder = await this.db
//       .select()
//       .from(schema.orderSubscriptions)
//       .where(eq(schema.orderSubscriptions.id, id))
//       .limit(1);

//     if (!existingOrder[0]) {
//       throw new BadRequestException('Order subscription not found');
//     }

//     await this.db
//       .delete(schema.orderSubscriptions)
//       .where(eq(schema.orderSubscriptions.id, id));

//     return {
//       message: 'Order subscription deleted successfully',
//     };
//   }

// async update(id: number, updateOrderSubscriptionDto: UpdateOrderSubscriptionDto, userId: number, orderPaymentId: string) {
  //   // Verify the order exists and belongs to the user
  //   const existingOrder = await this.db
  //     .select()
  //     .from(schema.orderSubscriptions)
  //     .where(and(
  //       eq(schema.orderSubscriptions.id, id),
  //       eq(schema.orderSubscriptions.userId, userId)
  //     ))
  //     .limit(1);

  //   if (!existingOrder[0]) {
  //     throw new BadRequestException('Order subscription not found or unauthorized');
  //   }

  //   if (!updateOrderSubscriptionDto.subscriptionId) {
  //     throw new BadRequestException('Subscription ID is required');
  //   }

  //   const subscription = await this.db.query.subscriptions.findFirst({
  //     where: eq(subscriptionSchema.subscriptions.id, updateOrderSubscriptionDto.subscriptionId)
  //   });

  //   if (!subscription) {
  //     throw new BadRequestException('Subscription not found');
  //   }

  //   const startDate = new Date();
  //   const endDate = this.calculateDurationInDays(startDate, subscription.planType);
  //   const nextBillingDate = this.calculateNextBillingDate(endDate, subscription.planType);

  //   // Deactivate current order
  //   await this.db.update(schema.orderSubscriptions)
  //     .set({
  //       status: 'INACTIVE',
  //       updatedAt: new Date()
  //     })
  //     .where(and(
  //       eq(schema.orderSubscriptions.userId, userId),
  //       eq(schema.orderSubscriptions.status, 'ACTIVE')
  //     ));

  //   // Create new order
  //   const newOrder = await this.db.insert(schema.orderSubscriptions)
  //     .values({
  //       userId,
  //       subscriptionId: updateOrderSubscriptionDto.subscriptionId,
  //       startDate,
  //       endDate,
  //       nextBillingDate: nextBillingDate ? sql`${nextBillingDate}` : sql`NULL`,
  //       status: 'ACTIVE',
  //       isAutoRenew: subscription.planType !== 'LIFETIME',
  //       orderPayment: orderPaymentId
  //     })
  //     .returning();

  //   // Update current subscription
  //   await this.db.update(currentSubscription.currentSubscriptions)
  //     .set({
  //       subscriptionId: updateOrderSubscriptionDto.subscriptionId,
  //       orderSubscriptionId: newOrder[0].id,
  //       featureUsage: subscription.features,
  //       updatedAt: new Date()
  //     })
  //     .where(eq(currentSubscription.currentSubscriptions.userId, userId));

  //   return {
  //     message: 'Order subscription updated successfully',
  //     orderSubscription: newOrder[0],
  //   };
  // }