import { Component, OnInit, AfterViewInit, ViewEncapsulation } from '@angular/core';
import { ApiService } from '../api.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { ProgressService } from '../services/progress.service';



@Component({
  selector: 'app-nlp',
  templateUrl: './nlp.component.html',
  styleUrls: ['./nlp.component.scss'], 
  encapsulation: ViewEncapsulation.None
})
export class NlpComponent implements OnInit, AfterViewInit {

  isValid : boolean = true; 
  tmpLoad : boolean = false; 

  annotatedText : SafeHtml = "";
  entities : any = []; 

  flagIsText : boolean = false; 

  showPage : number = 1; 
  numPages : number = 0;
  pageNumArr : any[] = []; 
  scaleFactor : number = 1; 


  colorFillMap = {
    "0" : "#f1f17f", 
    "1" : "#e19b9b", 
    "2" : "#a7a7e5", 
    "3" : "#7ff1b3"
  }

  tags : any[] = [];

  constructor(
    private api: ApiService, 
    private sanitizer: DomSanitizer, 
    private router: Router, 
    private progressService : ProgressService
  ) { }

  ngOnInit() {
    this.annotatedText = "<p>loading...</p>"; 

    if (typeof(this.api.docArray) == 'undefined' && this.api.docType != 'text'){
      this.isValid = false;
      this.router.navigate(["/home"]); 
      return;
    }

    this.getTags();
  }

  ngAfterViewInit() {
    if (this.isValid){
      if (!this.api.isDocText() ){
        this.flagIsText = false;
  
        if (this.api.docType == 'application/pdf'){
          this.drawPdfPage(this.api.docArray, true);

        }
      }else{
        this.flagIsText = true; 
        this.processText(this.api.inputText)
      }
    }
   }

   incrementZoom(amount: number) {
      this.scaleFactor = Math.round((this.scaleFactor + amount)*10)/10;
      if (!this.flagIsText){
        this.drawPdfPage(this.api.docArray);
      }
    }

    selectPage(pageNum){
      this.showPage = pageNum + 1
      this.drawPdfPage(this.api.docArray)
    }

   processText(inText){
    const self = this;
    self.progressService.loaderIsLoading(); 

    self.api.tagText(inText).then( data => {
      console.log(data)
      self.annotatedText = self.constructHtml(data);
      self.progressService.loaderIsComplete(); 
    })
   }

   constructHtml(data){

    data = data[0];

    var text = data.content;
    var offset = 0; 

    for (var i=0; i<data.entities.length; i++){
      var ent = data.entities[i];
      var s = this.getEntity(ent);

      var start = offset + ent.start; 
      var end = offset + ent.end;

      text = text.substring(0, start-1) + s + text.substring(end-1,text.length)

      offset = offset + (s.length - ent.value.length);

    }
    
    return this.sanitizer.bypassSecurityTrustHtml(text); 

   }

   getEntity(ent){
    var snippit = '<span class="entity hl-' + this.getEntHlId(ent.tag) + '" data-ent-id="' + this.getEntHlId(ent.tag) + '" matTooltip="Info about the action" matTooltipClass="ent-tool-tip">' + ent.value + '</span>'
    return snippit
   }

   getEntHlId(entity){
    var entInd = this.entities.findIndex(x => x.value == entity); 

    if (entInd != -1){
      return (parseInt(entInd)) as any; 
    }else{
      this.entities.push({
        "value" : entity, 
        "checked" : true
      })
      return (parseInt(this.entities.length)-1) as any; 
    }

   }

   toggleEntity(item, index){

    if (this.entities[index].checked){
      this.entities[index].checked = false; 
    }else{
      this.entities[index].checked = true; 
    }

    if (this.flagIsText){
      var container = document.getElementById("annotatedText"); 
      var entities = container.getElementsByClassName("entity");
  
      for (var i=0; i<entities.length; i++){
        var en = entities[i];
         
        if (parseInt(en.getAttribute("data-ent-id")) == index){
          en.classList.toggle("hideMe")
        }
       
      }
    }else{
      this.drawPdfPage(this.api.docArray)
    }

   
   }


   drawPdfPage(array, drawPreview=false){

    this.tmpLoad = true; 

    this.clearCanvas()

    var self = this; 

    var pdfjsLib = window['pdfjs-dist/build/pdf'];

      // Asynchronous download of PDF
    //var loadingTask = pdfjsLib.getDocument(url);
    var loadingTask = pdfjsLib.getDocument({data: array});

    loadingTask.promise.then(function(pdf) {

      self.numPages = pdf.numPages;
      self.pageNumArr = Array.from(Array(pdf.numPages).keys())
      
      pdf.getPage(self.showPage).then(function(page) {

        //var viewport = page.getViewport({scale: scale});
        var viewport = page.getViewport({scale: self.scaleFactor});
        // Prepare canvas using PDF page dimensions
        var canvas = document.getElementById('the-canvas');
        var context = (canvas as any).getContext('2d');
        (canvas as any).height = viewport.height;
        (canvas as any).width = viewport.width;

        // Render PDF page into canvas context
        var renderContext = {
          canvasContext: context,
          viewport: viewport
        };

        var renderTask = page.render(renderContext);

        renderTask.promise.then(function () {

          console.log('Page rendered');
          
          self.drawEntities(self.showPage)

        });
      });

      // draw previews 
      if (drawPreview){
        for (var i=0;i<pdf.numPages+1;i++){
          self.drawPreview(pdf,i+1)
        }
  
      }

    }, function (reason) {
      // PDF loading error
      console.error(reason);
    });
  }

  drawPreview(pdf, pageNumber){

          
    pdf.getPage(pageNumber).then(function(page) {

      //var viewport = page.getViewport({scale: scale});
      var viewport = page.getViewport({scale: 0.3});
      // Prepare canvas using PDF page dimensions
      var canvas = document.getElementById('prev_'+pageNumber);
      var context = (canvas as any).getContext('2d');
      
      (canvas as any).height = viewport.height;
      (canvas as any).width = viewport.width;

      // Render PDF page into canvas context
      var renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      var renderTask = page.render(renderContext);

      renderTask.promise.then(function () {

        console.log('Preview rendered');

      });
    });

  }
  
  drawEntities(pageNum = 1){

    var pageObject = this.api.fileResData.pages[this.api.fileResData.pages.findIndex(x => x.idx == pageNum-1)]

    var c = document.getElementById("the-canvas");
    var ctx = (c as any).getContext("2d");

    pageObject.entities.forEach(ent => {

      var entIdx = this.getEntHlId(ent.tag); 

      var tagIdx = this.entities.findIndex(x => x.value == ent.tag);
      
      if (this.entities[tagIdx].checked){

        ctx.beginPath();

        var x1, x2, y1, y2; 

        x1 = Math.round(ent.pos.x1*this.scaleFactor)
        x2 = Math.round(ent.pos.x2*this.scaleFactor)
        y1 = Math.round(ent.pos.y1*this.scaleFactor)
        y2 = Math.round(ent.pos.y2*this.scaleFactor)

        ctx.rect(x1, y1, x2-x1, y2-y1);
        ctx.globalAlpha = 0.2;
       
        ctx.fillStyle = this.colorFillMap[entIdx.toString()];
        ctx.fill();
  
        ctx.lineWidth = 4;
        ctx.strokeStyle = this.colorFillMap[entIdx.toString()];
        ctx.stroke();
      }
      
    });

    if (typeof(pageObject.detections) != "undefined"){

      let origPageWidth = pageObject.width; 
      let origPageHeight = pageObject.height; 

      let canvasWidth = parseInt(c.getAttribute("width"));
      let canvasHeight = parseInt(c.getAttribute("height"));

      let relScaleFactor = canvasWidth/origPageWidth;

      pageObject.detections.forEach(bbox => {

        let conf = bbox[1];
        let bboxItem = bbox[2];

        let x_mid = bboxItem[0];
        let y_mid = bboxItem[1];
        let bbox_width = bboxItem[2];
        let bbox_height = bboxItem[3];

        var x1, x2, y1, y2;

        x1 = Math.round(Math.round(x_mid-bbox_width/2)*relScaleFactor)
        y1 = Math.round(Math.round(y_mid-bbox_height/2)*relScaleFactor)
        let width = Math.round(bbox_width*relScaleFactor)
        let height  = Math.round(bbox_height*relScaleFactor)

        ctx.rect(x1, y1, width,height);
        ctx.globalAlpha = 0.1;
       
        ctx.fillStyle = "#FF0000";
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.fillText("Textbody: (" + ((Math.round(conf*10000)/100)).toFixed() + ")", x1+20, y1+20);
        ctx.fillStyle = "#000000";

        ctx.lineWidth = 3;
        ctx.strokeStyle ="#FF0000";
        ctx.stroke();
        
      });
    }

    this.tmpLoad = false; 

  }

  clearCanvas(){
    var c = document.getElementById("the-canvas");
    var ctx = (c as any).getContext("2d");
    ctx.save();
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,(c as any).width, (c as any).height);
    ctx.restore();
  }

  getTags(){
    const self = this;
    self.progressService.loaderIsLoading();

    self.api.getNerLabelTag().then( (data : any) => {

      this.tags = data;

      self.progressService.loaderIsComplete(); 

    }).catch(err => {
      console.log(err);
      self.progressService.loaderIsComplete(); 
    })
   }



}
