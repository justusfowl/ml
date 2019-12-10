import { Component, OnInit } from '@angular/core';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss']
})
export class StatisticsComponent implements OnInit {

  workflowStats : any[] = [];

  bboxLabelStats : any = {}
  bboxLabelCount : number = 0; 

  constructor(
    private api: ApiService
  ) { }

  ngOnInit() {
    this.getWorkflowStats();
    this.getBboxLabelStats(); 
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
