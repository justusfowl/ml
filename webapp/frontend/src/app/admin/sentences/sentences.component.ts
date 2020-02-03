import { Component, OnInit, ViewEncapsulation, ApplicationRef } from '@angular/core';
import { ApiService } from '../../api.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { v1 as uuid } from 'uuid';
import { MatSnackBar, MatTooltip } from '@angular/material';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ProgressService } from '../../services/progress.service';

@Component({
  selector: 'app-sentences',
  templateUrl: './sentences.component.html',
  styleUrls: ['./sentences.component.scss'], 
  encapsulation: ViewEncapsulation.None
})
export class SentencesComponent implements OnInit {

  totalText : string = ""; 
  annotatedText : SafeHtml = "";
  objId : any = "";
  flagIsPageCalledFromWorkflow : boolean = false;
  flagIsNoDataAvailable : boolean = true;
  textObj : any; 

  scaleFactor : number = 1; 

  sentences : any[] = [];

  flagshowSettings : boolean = false;

  flagNoLineBreak : boolean = false; 

  constructor(
    private router: Router,
    private api: ApiService,
    private sanitizer: DomSanitizer, 
    private appRef: ApplicationRef,
    public snackBar: MatSnackBar, 
    private route: ActivatedRoute, 
    public progressService : ProgressService

  ) {

  }

  ngOnInit() {

    this.router.routeReuseStrategy.shouldReuseRoute = () => false;

    let objId = this.route.snapshot.queryParamMap.get('objId');
    let wfCalled = this.route.snapshot.queryParamMap.get('wf');

    if (!wfCalled || wfCalled == "false"){
        this.flagIsPageCalledFromWorkflow = false;
    }else{
        this.flagIsPageCalledFromWorkflow = true;
        this.updateUrlParamsToWF();
    }

    if (objId){
      this.objId = objId; 
    }


  }

  async ngAfterViewInit() {
   
    // this.api.isLoading = true;
    this.progressService.loaderIsLoading();



    if (this.objId){
      this.getSentenceObj(this.objId);
    }else{
      this.getSentenceObj();
    }
   }

   showSettings(){
     if (this.flagshowSettings){
      this.flagshowSettings = false;
     }else{
       this.flagshowSettings = true;
     }
   }

   showSelectedText(evt) {

    if (evt.target.classList.contains("sentences")){
      let sentenceId = evt.target.getAttribute("data-sent-id");

      this.removeSentence(sentenceId);
      return;
    }

    // disable right click
    if (evt.which == 3){
      return;
    }

    var text = ""; 
    var startIdx, endIdx; 

    let flagHasEntity = false;
    let flagAbort = false; 
    let flagRemoveEntity = false;




    if (window.getSelection) {

        let caretPos = this.getCarePosition(evt);
        console.log("Caret: " +  caretPos)

        let sel = window.getSelection() as any; 

        if (sel.type == 'Range'){ // (sel as any).baseOffset == (sel as any).focusOffset){

          
          let textAnchorNode = sel.anchorNode.textContent;
          let textAnchorIndex = this.totalText.indexOf(textAnchorNode);

          let textContentClicked = sel.focusNode.textContent;
          let textIndex = this.totalText.indexOf(textContentClicked);

          // a text area has been selected
          text = window.getSelection().toString();

          let textNoLinebreak = text.replace(/(\r\n|\n|\r)/g,"   ");

          startIdx = textAnchorIndex + Math.min(sel.focusOffset,sel.anchorOffset); // textAnchorIndex + sel.anchorOffset;

          if (this.flagNoLineBreak){
            endIdx = startIdx + text.length;
          }else{
            endIdx = startIdx + textNoLinebreak.length;
          }
          

        
        }

    } else if ((document as any).selection && (document as any).selection.type != "Control") {
        text = (document as any).selection.createRange().text;
    }

    if (text.length > 0){

      console.log("Add new tag with text: " + text );
      let newSentences = this.makeSentence(startIdx, endIdx, text);
      this.sentences.push(newSentences);
      this.makeText(); 

    }

  }

  sortEntities(){

    this.sentences.sort((a, b) => (a.start > b.start) ? 1 : -1);

   }
  
  makeText(){
    this.sortEntities();
    this.annotatedText = this.constructHtml();
   }

  makeSentence(
    startIdx, endIdx, textVal
  ){

    let entID = uuid(); 

    console.log(entID);
    
    return {
       "created_at": new Date(),
       "bgColor" : this.getRandomColor(),
       "end": endIdx,
       "sentence_id":  entID,
       "start": startIdx,
       "value": textVal
    };
  }

  getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color + "6b";
  }

  removeSentence(sentenceId){
    let sentIdx = this.sentences.findIndex(x => x.sentence_id == sentenceId);
    if (sentIdx > -1){
      this.sentences.splice(sentIdx, 1);
      this.makeText();
    }
  }

  getEntity(sentence){
    var snippit = '<span class="sentences" data-sent-id="' + sentence.sentence_id + '" style="background-color:' + sentence.bgColor + '" >' + sentence.value + '</span>'
    return snippit;
  }

  constructHtml(){

    var text = this.totalText;
    var offset = 0; 

    for (var i=0; i<this.sentences.length; i++){
      var sen = this.sentences[i];

      var s = this.getEntity(sen);

      var start = offset + sen.start; 
      var end = offset + sen.end;

      text = text.substring(0, start) + s + text.substring(end,text.length)

      let textNoLinebreak = sen.value.replace(/(\r\n|\n|\r)/g,"   ");          
    
      

      if (this.flagNoLineBreak){
        offset = offset + (s.length - sen.value.length);
      }else{
        offset = offset + (s.length - textNoLinebreak.length);
      }

      }

      // this.cd.detectChanges();
      this.appRef.tick();

      return this.sanitizer.bypassSecurityTrustHtml(text); 

    }

    getCarePosition(evt){
      let clickedSelection = window.getSelection() as any;
      let clickedNode = clickedSelection.anchorNode;
  
      let editableDiv = document.getElementById("annotatedText") as any;
  
      let previousLength = 0;
  
      function indexInParent(node) {
          var children = node.parentNode.childNodes;
          var num = 0;
          for (var i=0; i<children.length; i++) {
              if (children[i]==node) return num;
              num++;
          }
          return -1;
      }
  
      let indexInPar =  indexInParent(clickedNode);
      let childNodes = document.getElementById("annotatedText").childNodes;
  
      if (indexInPar > 0){
        for (var i=0; i<indexInPar; i++) {
          const thisNode = childNodes[i] as any;
          if ( thisNode.nodeType == 3){
            previousLength = previousLength + thisNode.length
          }else{
            previousLength = previousLength + thisNode.innerText.length
          }
          
        }
      }
  
      
  
      let doc = document as any;
  
      var caretPos = 0,
      sel, range;
      if (window.getSelection) {
        sel = window.getSelection();
        if (sel.rangeCount) {
          range = sel.getRangeAt(0);
          if (range.commonAncestorContainer.parentNode == editableDiv) {
            caretPos = range.endOffset;
          }
        }
      } else if (doc.selection && doc.selection.createRange) {
        range = doc.selection.createRange();
        if (range.parentElement() == editableDiv) {
          var tempEl = document.createElement("span");
          editableDiv.insertBefore(tempEl, editableDiv.firstChild);
          var tempRange = range.duplicate();
          tempRange.moveToElementText(tempEl);
          tempRange.setEndPoint("EndToEnd", range);
          caretPos = tempRange.text.length;
        }
      }
  
      caretPos = caretPos + previousLength;
  
      console.log(caretPos);
      console.log(clickedSelection.focusOffset)
      console.log(clickedSelection.anchorOffset)

      let start = Math.min(clickedSelection.focusOffset, clickedSelection.anchorOffset)
      let end = Math.max(clickedSelection.focusOffset, clickedSelection.anchorOffset)
  
      return {
        "start" : start, 
        "end" : end, 
        "previousLength" : previousLength
      };
    }

  approveSentences(){

    if (this.sentences.length < 1){
      this.snackBar.open('Es wurden keine Sätze definiert.', null, {
        duration: 1500,
      });

      return;
    }

      if (confirm('Alle Sätze definiert?')) {

        this.textObj.sentences = this.sentences;
        
        // this.api.isLoading = true;
        this.progressService.loaderIsLoading(); 

        this.api.approveSentences(this.textObj).then(res => {

            this.snackBar.open('Dokument bestätigt.', null, {
                duration: 1500,
              });

            this.getSentenceObj();
            this.updateUrlParamsToWF();

        }).catch(err => {
            this.snackBar.open('Etwas hat nicht geklappt.', null, {
                duration: 1500,
            });
            // this.api.isLoading = false;
            this.progressService.loaderIsComplete();
            console.error(err);
        })
    }
  }


  getSentenceObj(objectId?){
    const self = this;
    // self.api.isLoading = true;
    self.progressService.loaderIsLoading();

    self.api.getSentenceObj(objectId, this.flagIsPageCalledFromWorkflow).then( (data : any) => {

      if (typeof(data._id) == "undefined"){
          self.flagIsNoDataAvailable = true;
          // self.updateUrlParams(true);
      }else{

        self.flagIsNoDataAvailable = false;

        self.objId = data._id; 

        // self.updateUrlParams();

        if (typeof(data.pages) != "undefined"){

          var allText = ""; 

          data.pages.forEach(element => {
            if (typeof(element.read_text) != "undefined"){
              allText += element.read_text;
            }
          });

          self.textObj = data;

          if (typeof(data.sentences) != "undefined"){
            this.sentences = data.sentences;
          }else{
            this.sentences = [];
          }
          
          self.totalText = allText; 

          self.makeText();  // this.sanitizer.bypassSecurityTrustHtml(allText);
          

        }else{
          throw "no pages contained in the object";
        
        }
        this.progressService.joinObjLogRoom(self.objId);
      }
       // self.api.isLoading = false;
       self.progressService.loaderIsComplete(); 

    }).catch(err => {
      console.log(err);
      // self.api.isLoading = false;
      self.progressService.loaderIsComplete();
      self.flagIsNoDataAvailable = true; 
    })

   }

   copyUrlToClipboard(){

    let targetUrl = window.location.origin + "/#" +this.router.url.split('?')[0] + "?objId="+ this.objId

    document.addEventListener('copy', (e: ClipboardEvent) => {
        e.clipboardData.setData('text/plain', (targetUrl));
        e.preventDefault();
        document.removeEventListener('copy', null);
        this.snackBar.open("URL kopiert", null, {
            duration: 1500,
        });
      });
      document.execCommand('copy');
  }

  refreshThisPageNoReload(){
    if (confirm('Soll das Objekt neu geladen werden? Alle Änderungen verfallen damit unwiderruflich.')) {
      this.getSentenceObj(this.objId);
    }
  }

  toggleNoLB(){
    if (this.flagNoLineBreak){
      this.flagNoLineBreak = false;
    }else{
      this.flagNoLineBreak = true;
    }
  }

  incrementZoom(amount: number) {
    this.scaleFactor = Math.round((this.scaleFactor + amount)*10)/10;
  }

  updateUrlParamsToWF(){

    this.router.routeReuseStrategy.shouldReuseRoute = () => true;

    this.router.navigate(
      [], 
      {
        relativeTo: this.route,
        queryParams: { wf: true },
        queryParamsHandling: ''
      }).then(() => {
        this.router.routeReuseStrategy.shouldReuseRoute = () => true;
      });
    
      

    }

}
