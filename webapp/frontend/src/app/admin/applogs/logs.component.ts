import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { ProgressService } from 'src/app/services/progress.service';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from 'src/app/api.service';
import {MatPaginator} from '@angular/material/paginator';

@Component({
  selector: 'app-logs',
  templateUrl: './logs.component.html',
  styleUrls: ['./logs.component.scss']
})
export class LogsComponent implements OnInit, AfterViewInit {

  displayedColumns: string[] = ['_id', 'category', 'message'];

  logs: string[] = ["Hello!"];
  logMessage : string = "";

  currentObjId : string = "";

  constructor(
    private api: ApiService, 
    private route: ActivatedRoute,
    public progressService : ProgressService
  ) { }

  @ViewChild(MatPaginator, {static: true}) paginator: MatPaginator;

  ngOnInit() {

    this.progressService.logs.paginator = this.paginator;


    let objId = this.route.snapshot.queryParamMap.get('objId');
   
    if (objId){
      this.currentObjId = objId; 
    }else{
      this.currentObjId = "";
    }

    console.log(objId)

  }

  ngAfterViewInit(){

  }

  getFilterArgs(){
    return {_id: this.currentObjId};
  }

  changeObjId(val){
    this.currentObjId = val; 
  }

  applyFilter(filterValue: string) {
    this.progressService.logs.filter = filterValue.trim().toLowerCase();
  }


  

}
