import { Component, OnInit } from '@angular/core';
import { ApiService } from '../api.service';
import { ActivatedRoute } from '@angular/router';
import { ProgressService } from '../services/progress.service';

@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss']
})
export class StatisticsComponent implements OnInit {

  workflowStats : any[] = [];

  bboxLabelStats : any = {}
  bboxLabelCount : number = 0; 

  logs: string[] = ["Hello!"];
  logMessage : string = "";

  constructor(
    private api: ApiService, 
    private route: ActivatedRoute, 
    private progressService : ProgressService
  ) { }

  ngOnInit() {
    this.getWorkflowStats();
    this.getBboxLabelStats(); 

    console.log(this.route.snapshot.paramMap.get('id'));
    
  }

  sendMessage() {
    this.progressService.sendMessage(this.logMessage);
    this.logMessage = "";
  }

  getWorkflowStats(){

    this.api.getStatsWorkflow().then((result : any) => {
      this.workflowStats = result; 
    }).catch(err => {
      console.log(err);
    })

  }

  getBboxLabelStats(){
    this.api.getBboxLabelStats().then((result : any) => {
      this.bboxLabelStats = result;
      console.log(result.bbox_count)
      try{
        this.bboxLabelCount = result.bbox_count; 
      }catch(err){
        console.error(err);
      }
    }).catch(err => {
      console.log(err);
    })
  }



}
