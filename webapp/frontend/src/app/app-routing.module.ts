import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import {HomeComponent} from './home/home.component';
import {NlpComponent} from './nlp/nlp.component';
import {StatisticsComponent} from './statistics/statistics.component';
import { SpellerComponent } from './admin/speller/speller.component';
import { LabelComponent } from './admin/label/label.component';
import { NerlabelComponent } from './admin/nerlabel/nerlabel.component';
import { SettingsComponent } from './settings/settings.component';
import { SearchComponent } from './search/search.component';
import { LogsComponent } from './admin/applogs/logs.component';
import { LoginComponent } from './login/login.component';
import { AuthGuard } from './services/authguard'

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'home', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'search', component: SearchComponent, canActivate: [AuthGuard] },
  { path: 'stats', component: StatisticsComponent, canActivate: [AuthGuard] },
  { path: 'logs', component: LogsComponent, canActivate: [AuthGuard] },
  { path: 'nlp', component: NlpComponent, canActivate: [AuthGuard] },
  { path: 'settings', component: SettingsComponent, canActivate: [AuthGuard] },
  { path: 'admin/label', component: LabelComponent, canActivate: [AuthGuard] },
  { path: 'admin/speller', component: SpellerComponent, canActivate: [AuthGuard] },
  { path: 'admin/nerlabel', component: NerlabelComponent, canActivate: [AuthGuard] },
  
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  // otherwise redirect to home
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
