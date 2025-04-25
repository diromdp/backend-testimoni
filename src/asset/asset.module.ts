import { Module } from '@nestjs/common';
import { AssetService } from './asset.service';
import { AssetController } from './asset.controller';
import { PublicAssetController } from './public-asset.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [AssetController, PublicAssetController],
  providers: [AssetService],
  exports: [AssetService],
})
export class AssetModule {}
