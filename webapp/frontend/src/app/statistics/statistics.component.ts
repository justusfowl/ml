import { Component, OnInit } from '@angular/core';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss']
})
export class StatisticsComponent implements OnInit {

  workflowStats : any[] = [];

  constructor(
    private api: ApiService
  ) { }

  ngOnInit() {
    this.getWorkflowStats();
  }

  getWorkflowStats(){

    this.api.getStatsWorkflow().then((result : any) => {
      this.workflowStats = result; 
    }).catch(err => {
      console.log(err);
    })

  }

}
