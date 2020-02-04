import { ViewChild, Component, AfterViewInit } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../api.service';
import { NavDrawerService } from '../services/nav.service';
import { MatDrawer, MatSidenav } from '@angular/material';

import { AuthenticationService } from '../services/auth.service';
import { ProgressService } from '../services/progress.service';


@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss']
})
export class NavComponent implements AfterViewInit {

  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches),
      shareReplay()
    );

    @ViewChild("drawer", {static: false}) public drawer: MatSidenav

    currentUserName = ""; 

  constructor(
    private breakpointObserver: BreakpointObserver, 
    public router : Router, 
    public api : ApiService, 
    private route: ActivatedRoute, 
    private navService : NavDrawerService,
    public authenticationService: AuthenticationService, 
    public progressService : ProgressService
  ) {

    this.authenticationService.currentUser.subscribe((x : any) => {

      if(x){
        this.currentUserName = x.userName
      }else{
        this.currentUserName = "";
      }
      
    });
  }

  ngAfterViewInit(){
    this.navService.setMyNavDrawer(this.drawer);  
  }

  execSearch(){

    if (this.api.searchQryString.length == 0){
      this.api.flagHasSearched = false; 
      return;
    }

    this.api.searchQryStringText = this.api.searchQryString;

    this.progressService.loaderIsLoading();

    this.api.searchQueryHandler(this.api.searchQryString).then((res : any) =>{

        /*

        if (typeof(res.data.search_result) == "undefined"){
          this.api.searchResults = [];
          this.api.lastSearchTime = 0;
          this.api.lastEmbedTime = 0;
          this.api.flagHasSearched = false;
        }else{
          this.api.searchResults = res.data.search_result; 
          this.api.lastSearchTime = res.data.search_time;
          this.api.lastEmbedTime = res.data.embed_time; 
          this.api.flagHasSearched = true; 
        }

        */ 
        
        res.data.documents.forEach(element => {
          if (typeof(element.wfstatus_change) == "undefined"){
            element.wfstatus_change = [];
          }
        });

        this.api.searchResults = res.data.documents; 
        this.api.lastSearchTime = res.data.search_time;
        this.api.lastEmbedTime = res.data.embed_time; 
        
        this.api.flagHasSearched = true; 

        this.progressService.loaderIsComplete();
        
        

    }).catch(err => {
      console.error(err);
    })

  }

  isSearchActive(){
    if (this.api.flagHasSearched){
      let state : any = this.route.pathFromRoot[0];
      if (state._routerState.snapshot.url.indexOf("search") > -1){
        return true; 
      }else{
        return false; 
      }
    }else{
      return false; 
    } 
  }

  goToLabelWF(drawer){
    const self = this;
   
    self.router.navigate(["/admin/label"], { queryParams: { wf: 'true'} }).then( (e) => {
      drawer.close();
   });
  }

  goToNERLabelWF(drawer){
    const self = this;
   
    self.router.navigate(["/admin/nerlabel"], { queryParams: { wf: 'true'} }).then( (e) => {
      drawer.close();
   });
  }

}
