import { Module } from '@nestjs/common';
import { ResolverService } from './resolver.service.js';
import { SettingsService } from './settings.service.js';
import { PagesService } from './pages.service.js';
import { PublicContentController } from './public.controller.js';
import { PagesAdminController } from './pages.admin.controller.js';
import {
  ContentOps, RoomsAdminController, FacilitiesAdminController, DestinationsAdminController, ProgressAdminController,
  FaqAdminController, SiteStructureAdminController,
} from './catalog.admin.controller.js';
import { SettingsAdminController } from './settings.admin.controller.js';
import { MediaReplaceController } from './media-replace.controller.js';
import { SiteOverviewController } from './overview.controller.js';
import { RevalidationListener, SiteStatusController } from './revalidation.listener.js';
import { SchedulerService } from './scheduler.service.js';
import { ToursService } from './tours.service.js';
import { PublicToursController, ToursAdminController } from './tours.controller.js';

@Module({
  controllers: [
    PublicContentController, PagesAdminController, RoomsAdminController, FacilitiesAdminController, DestinationsAdminController,
    ProgressAdminController, FaqAdminController, SiteStructureAdminController, SettingsAdminController, SiteStatusController, MediaReplaceController, SiteOverviewController,
    PublicToursController, ToursAdminController,
  ],
  providers: [ResolverService, SettingsService, PagesService, ContentOps, RevalidationListener, SchedulerService, ToursService],
  exports: [ResolverService, SettingsService, ToursService],
})
export class ContentModule {}
