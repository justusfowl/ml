import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import {HomeComponent} from './home/home.component';
import {NlpComponent} from './nlp/nlp.component';
import {StatisticsComponent} from './statistics/statistics.component';

import { LabelComponent } from './admin/label/label.component';
import { NerlabelComponent } from './admin/nerlabel/nerlabel.component';
import { SettingsComponent } from './settings/settings.component';
import { SearchComponent } from './search/search.component';

const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'search', component: SearchComponent },
  { path: 'stats', component: StatisticsComponent },
  { path: 'nlp', component: NlpComponent },
  { path: 'settings', component: SettingsComponent },
  { path: 'admin/label', component: LabelComponent },
  { path: 'admin/nerlabel', component: NerlabelComponent },
  
  { path: '', redirectTo: '/home', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
