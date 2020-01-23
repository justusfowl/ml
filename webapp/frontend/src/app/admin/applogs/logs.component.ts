import { Component, OnInit, AfterViewInit } from '@angular/core';
import { ProgressService } from 'src/app/services/progress.service';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from 'src/app/api.service';

@Component({
  selector: 'app-logs',
  templateUrl: './logs.component.html',
  styleUrls: ['./logs.component.scss']
})
export class LogsComponent implements OnInit, AfterViewInit {

  logs: string[] = ["Hello!"];
  logMessage : string = "";

  currentObjId : string = "";

  constructor(
    private api: ApiService, 
    private route: ActivatedRoute,
    public progressService : ProgressService
  ) { }

  ngOnInit() {


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


  

}
