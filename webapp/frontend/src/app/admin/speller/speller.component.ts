import { Component, OnInit, OnDestroy, HostListener, AfterViewInit, ViewEncapsulation, ChangeDetectorRef, ViewChild , ElementRef, ApplicationRef} from '@angular/core';
import { ApiService } from '../../api.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { v1 as uuid } from 'uuid';
import { MatSnackBar, MatTooltip } from '@angular/material';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ProgressService } from '../../services/progress.service';
import { AuthenticationService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-speller',
  templateUrl: './speller.component.html',
  styleUrls: ['./speller.component.scss'], 
  encapsulation: ViewEncapsulation.None
})
export class SpellerComponent implements OnInit {

  
  objId : string = ""; 

  flagIsPageCalledFromWorkflow : boolean = true;

  totalNumPages : number = 0; 
  textObj : any = {}; 
  annotatedText : SafeHtml = "";
  rawText : SafeHtml = "";
  entities : any = []; 
  scaleFactor : number = 1;

  flagIsNoDataAvailable : boolean = true; 

  pageIdxSelected : number = 0;

  newEntText: string = ""; 
  newEntTextShortCut : string = ""; 

  selectedText: string = '';
  tagIdxSelected : number = 0;

  tags : any[] = [];

  flagShowEntSmall : boolean = true;
  flagShowRawText : boolean = false;
  flagHidePerson : boolean = false;

  flagIsDemo : boolean = false;
  flagAllowEntChange : boolean = true;

  pagesReVisited : any[] = [];

  selectedEntityTypeId: number = 0;

  // image base64 string
  pageViewImage : string = null;
  flagIsZoomed : boolean = false;


  // test area

  textIdxSelected : number = 0;

  constructor(
    private router: Router,
    private api: ApiService,
    private sanitizer: DomSanitizer, 
    public snackBar: MatSnackBar, 
    private route: ActivatedRoute, 
    private cd: ChangeDetectorRef, 
    private appRef: ApplicationRef,
    private toastr: ToastrService, 
    public progressService : ProgressService, 
    public auth: AuthenticationService
  ) { }

  ngOnInit() {
    
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
    
    let objId = this.route.snapshot.queryParamMap.get('objId');
    let wfCalled = this.route.snapshot.queryParamMap.get('wf');

    if (!wfCalled || wfCalled == "false"){
        this.flagIsPageCalledFromWorkflow = false;
    }else{
        this.flagIsPageCalledFromWorkflow = true;
    }

    if (objId){
      this.objId = objId; 
    }

    this.progressService.getObjectProgressLog().subscribe((message: any) => {
      if (typeof(message.message) != "undefined"){
        this.toastr.info(message.category, message.message, {timeOut: 6000});
        if (typeof(message.details) != "undefined"){
          if (typeof(message.details.complete) != "undefined"){
            // this.api.isLoading = false;
            this.progressService.loaderIsComplete();
          }

          if (typeof(message.details.start) != "undefined" || typeof(message.details.progress) != "undefined"){
            // this.api.isLoading = true;
            this.progressService.loaderIsLoading();
          }
        }
      }
    });

  }

  
  async ngAfterViewInit() {
   
    // this.api.isLoading = true;
    this.progressService.loaderIsLoading();

    // use async to wait for labels to load first
    await this.api.getNerLabelTag().then( (data : any) => {
      this.tags = data;
      if (this.flagIsDemo){
        // this.api.isLoading = false;
        this.progressService.loaderIsComplete();
      }
    }).catch(err => {
      console.log(err);
      // this.api.isLoading = false;
      this.progressService.loaderIsComplete();
    })


    if (this.objId){
      this.getSpellerLabelObject(this.objId);
    }else{
      this.getSpellerLabelObject();
    }
   }

   prevPage(){

     if (this.pageIdxSelected-1 >= 0){
       this.pageIdxSelected =  this.pageIdxSelected - 1; 
       this.makeText(); 
     }
   }

   nextPage(){

    if (confirm('Ist diese Seite komplett korrigiert? Rückkehr ist nicht möglich.')) {

     if(this.pageIdxSelected+1 < this.textObj.pages.length){

      this.finalizeCorrectionsCurrentPage();

      this.pageIdxSelected =  this.pageIdxSelected + 1;
      this.makeText();

      // insert pageIdx to the pages that have been presented to the user.
      this.pagesReVisited.push(this.pageIdxSelected);

     }
    }

   }


  showSelectedText(evt) {

    this.getCarePosition(evt);

    this.closeSuggMenu();

    if (evt.ctrlKey){
      console.log("Ctrl-Pressed");
      let suggId = evt.target.getAttribute("data-sugg-id");
      this.openSuggMenu(evt, suggId);
      return;
    }

    // disable right click
    if (evt.which == 3){
      return;
    }

    if (!this.getIfContentEditable()){
      document.getElementById("annotatedText").setAttribute("contenteditable", "false");
      return
    }else{
      document.getElementById("annotatedText").setAttribute("contenteditable", "true");
      return
    }

    var text = ""; 
    var startIdx, endIdx; 

    var flagHasSuggestion = false;

    if (evt.target.classList.contains("suggestion")){
      flagHasSuggestion = true;
    }
  }

  addEvtChangeText(){

    let self = this; 

    var editable = document.getElementById('annotatedText');

    editable.addEventListener('input', function( event : any) {

      if (event.inputType == "deleteContentForward"){
        console.log("Delete " + 1 + " char before: " + self.textIdxSelected)
      }else if (event.inputType == "deleteContentBackward"){
        console.log("Delete " + 1 + " char after: " + self.textIdxSelected)
      }else if (event.inputType == "insertText"){
        let data = event.data;
        console.log("Insert " + data.length + " chars after: " + self.textIdxSelected)
      }
      
        console.log(event)
    });

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

    this.textIdxSelected  = caretPos;

    return caretPos;
  }

  mouseLeaveTextArea(evt){
    this.closeSuggMenu();
  }

  openSuggMenu(evt, sugg_id){
    let cont = document.getElementById("sug-menu"); 
    let targetClickedRects = evt.target.getClientRects()[0];

    let top = targetClickedRects.bottom;
    let left = targetClickedRects.left;

    cont.setAttribute("style", "top: "+top+"px; left: "+left+"px");

    // add content to menu

    cont.innerHTML = ""; 

    let itemIdx = this.textObj.pages[this.pageIdxSelected].suggestions.findIndex(x => x.sugg_id == sugg_id);
    let item = this.textObj.pages[this.pageIdxSelected].suggestions[itemIdx];

    let suggestions = item.sug;

    if (document.getElementById(sugg_id).innerText == item.orig && !document.getElementById(sugg_id).classList.contains("orig_restored_approved")){
      cont.innerHTML += '<div class="sug-header">Wert</div>'
      cont.innerHTML += '<div class="sug-item orig" data-sugg-orig="1" data-sugg-id="' + item.sugg_id + '">annehmen?</div>'
    }else if (document.getElementById(sugg_id).innerText != item.orig || document.getElementById(sugg_id).classList.contains("modified")){
      cont.innerHTML += '<div class="sug-header">Originalwert</div>'
      cont.innerHTML += '<div class="sug-item orig" data-sugg-orig="1" data-sugg-id="' + item.sugg_id + '">' + item.orig + '</div>'
    }

    cont.innerHTML += '<div class="sug-header">Vorschläge</div>'

    for (var i=0; i<suggestions.length;i++){
      let sug = suggestions[i];
      cont.innerHTML += '<div class="sug-item" data-sugg-id="' + item.sugg_id + '">' + sug.key + '</div>'
    }

    cont.classList.add("view");

  }

  closeSuggMenu(){
    let cont = document.getElementById("sug-menu");
    cont.classList.remove("view");
    cont.innerHTML = ""; 
  }

  selectSuggestion(evt){
    let suggId = evt.target.getAttribute("data-sugg-id");
    let flagOrigEntry = evt.target.getAttribute("data-sugg-orig");

    if (!suggId){
      return;
    }

    let itemIdx = this.textObj.pages[this.pageIdxSelected].suggestions.findIndex(x => x.sugg_id == suggId);
    let item = this.textObj.pages[this.pageIdxSelected].suggestions[itemIdx];

    // if it is the original entry, set it to text inner and approve css class
    if (flagOrigEntry){
      document.getElementById(suggId).innerText = item.orig;
      document.getElementById(suggId).classList.add("orig_restored_approved");
      document.getElementById(suggId).classList.remove("modified");
    }else{
      document.getElementById(suggId).innerText = evt.target.innerText;
      document.getElementById(suggId).classList.remove("orig_restored_approved");
      document.getElementById(suggId).classList.add("modified");
    }

    this.closeSuggMenu();
  }

  getWordBound(idx, text, start=false){

    let maxIterations = 99999; 

    let resIdx = -1;
    let it = idx;
    let iteration = 0
    
    while (resIdx < 0){

      let character = text.substring(it, it+1);
      
      if (character == " " || character == "," || character == "." || character == ":" || character == "?"|| character == "!" || character == "{"  || /\r|\n/.exec(character)){
        
        if (start){
          resIdx = it+1; 
        }else{
          resIdx = it; 
        }
      }
      
      if (start){
        it--;
        
        if (it == 0){
          resIdx = 0;
        }
      }else{
        it++;
        
        if (it == text.length){
          resIdx = text.length;
        }
      }

      iteration++;

      if (iteration >= maxIterations){
        this.toastr.error("getWord()", "Es ist etwas mit dem Wort '" + text + "' schief gelaufen.", {timeOut: 6000});
        resIdx = 0;
      }

    }

    console.log("iterations:" + iteration)
    
    return resIdx;
  
  }

  getSpellerLabelObject(objectId?){
    const self = this;
    // self.api.isLoading = true;
    self.progressService.loaderIsLoading();
    self.flagIsNoDataAvailable = false; 

    // reset the pages visited for the new object
    self.pagesReVisited = [];

    self.api.getSpellerObject(objectId, this.flagIsPageCalledFromWorkflow).then( (data : any) => {

      if (typeof(data._id) == "undefined"){
          self.flagIsNoDataAvailable = true;
          // self.updateUrlParams(true);
      }else{

        self.objId = data._id; 

        // self.updateUrlParams();

        if (typeof(data.pages) != "undefined"){

          self.pageIdxSelected = 0;

          self.pagesReVisited.push(self.pageIdxSelected);

          self.textObj = data;
          data.pages[self.pageIdxSelected].suggestions = self.sortSuggestions(data.pages[self.pageIdxSelected].suggestions);
          self.totalNumPages = data.pages.length; 
          self.annotatedText = self.constructHtml(data.pages);
          this.resetZoom();
          self.drawPdfPage();
          
          setTimeout(function(){
            self.addEvtChangeText();
          },500)
          


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
      self.flagIsNoDataAvailable = false; 
    })

   }

   selectEntity(index, _id){
     this.tagIdxSelected = index;
   }

   makeText(){
    this.sortSuggestions();
    this.annotatedText = this.constructHtml(this.textObj.pages);
    this.addEvtChangeText(); 

    this.resetZoom();
    this.drawPdfPage();

   }

   sortSuggestions(suggestions?){

    if (suggestions){
      suggestions.sort((a, b) => (a.start > b.start) ? 1 : -1); 
      return suggestions;
    }else{
      this.textObj.pages[this.pageIdxSelected].suggestions.sort((a, b) => (a.start > b.start) ? 1 : -1)
    }

   }

   addTag(tag: any){

    if (this.textObj.pages[this.pageIdxSelected].entities.findIndex(x => x.start == tag.start) == -1 && 
      this.textObj.pages[this.pageIdxSelected].entities.findIndex(x => x.end == tag.end) == -1
      ){

        if (!this.doesTagInterfereWithOthers(tag)){
          this.textObj.pages[this.pageIdxSelected].entities.push(tag);
          this.makeText();
        }else{
          console.log("interfering tag...cannot add")
          this.snackBar.open('Ein Wort kann nur in einem Tag vorkommen. Überschneidungen sind nicht zulässig.', null, {
            duration: 1500,
          });
        }        

      }else{
        this.snackBar.open('Es ist ein Fehler aufgetreten - lösche das Tag vor dem ausgewählten Wort und versuche es erneut.', null, {
          duration: 1500,
        });
      }
    
   }

   doesTagInterfereWithOthers(tag){

     let flagDoesInterfere = false; 

     if (this.textObj.pages[this.pageIdxSelected].entities.length == 0){
       return false;
     }

     // tag overlaps with all other tags
     if (tag.start <= this.textObj.pages[this.pageIdxSelected].entities[0].start && tag.end >= this.textObj.pages[this.pageIdxSelected].entities[this.textObj.pages[this.pageIdxSelected].entities.length-1].end){
       return true; 
     }

     this.textObj.pages[this.pageIdxSelected].entities.forEach(element => {
        if (
          (element.end > tag.start  && element.start < tag.start) ||
          (element.start < tag.end && element.end > tag.end) ||
          (element.start >= tag.start && element.end <= tag.end)
          ){
          flagDoesInterfere = true; 
        }
     });

     return flagDoesInterfere;

   }

   removeTag(tagId){
    let tagIdx = this.textObj.pages[this.pageIdxSelected].entities.findIndex(x => x.ent_id == tagId); 

    if (tagIdx > -1){
      this.textObj.pages[this.pageIdxSelected].entities.splice(tagIdx, 1); 
      this.makeText();
    }
   }

   makeTag(
     startIdx, endIdx, textVal
   ){

     let entID = uuid(); 

     console.log(entID);

     if (this.tagIdxSelected < 0){
      this.snackBar.open('Bitte eine gültige Kategorie auswählen.', null, {
        duration: 1500,
      });
      return;
     }
     
     return {
        "created_at": new Date(),
        "end": endIdx,
        "ent_id":  entID,
        "start": startIdx,
        "tag": this.tags[this.tagIdxSelected].value,
        "_id": this.tags[this.tagIdxSelected]._id,
        "value": textVal
     };
   }

   getIfContentEditable(){

    try{
      if (typeof(this.textObj.pages[this.pageIdxSelected].flag_read_text_updated) == "undefined"){
        return true;
      }else{
        return false;
      }
    }catch(err){
      return true;
    }

   }


   constructHtml(data){

    // make deep copy of the object so that the hiding of personal information is not overwriting results.
    data = JSON.parse(JSON.stringify(data[this.pageIdxSelected]));

    if (typeof(data.read_text) == "undefined"){
      this.annotatedText = null; 
      return; 
    }

    var text = data.read_text;

    if (this.getIfContentEditable()){

      var offset = 0; 

      for (var i=0; i<data.suggestions.length; i++){
        var sugg = data.suggestions[i];
  
        let sanityCheckOverlap = true;
        let previousTag
        if (i > 0){
          previousTag = data.suggestions[i-1];
          if (previousTag.end > sugg.start){
            sanityCheckOverlap = false;
          }
        }
        
        if (sanityCheckOverlap){
          var s = this.getSuggestion(sugg);
  
          var start = offset + sugg.start; 
          var end = offset + sugg.end;
  
          text = text.substring(0, start) + s + text.substring(end,text.length)
  
          let textNoLinebreak = sugg.orig.replace(/(\r\n|\n|\r)/g,"   ");          
    
          offset = offset + (s.length - textNoLinebreak.length);
        }else{
          this.snackBar.open('Ein Tag überschneidet sich mit vorherigen. Konsole prüfen.', null, {
            duration: 1500,
          });
          console.log("Conflicting tags: ")
          console.log(previousTag); 
          console.log(sugg)
        }
  
      }
    }

    this.cd.detectChanges();
    this.appRef.tick();
    
    return this.sanitizer.bypassSecurityTrustHtml(text); 

   }

   resetTextWithSuggestions(){

    if (confirm('Soll der Text für diese Seite auf den Rohtext samt den Vorschlägen zurückgesetzt werden? Dieser Vorgang lässt sich nicht rückgängig machen.')) {
      delete this.textObj.pages[this.pageIdxSelected].flag_read_text_updated;
      this.textObj.pages[this.pageIdxSelected].read_text = this.textObj.pages[this.pageIdxSelected].read_text_raw;
      this.makeText();

      this.snackBar.open('Die Korrekturen wurden zurückgesetzt.', null, {
        duration: 1500,
      });
    }

   }

   removeEditLock(){
     if (typeof(this.textObj.pages[this.pageIdxSelected].flag_read_text_updated) != "undefined"){
       delete this.textObj.pages[this.pageIdxSelected].flag_read_text_updated;

       this.snackBar.open('Der Textkörper lässt sich nun bearbeiten. Bestätigen überführt die Datei in den Pretag Modus.', null, {
        duration: 1500,
      });
     }
   }


   getSuggestion(ent){

     var snippit = '<span id="' + ent.sugg_id + '" class="suggestion orig" data-sugg-id="' + ent.sugg_id + '">' + ent.orig + '</span>';

    return snippit;
   }


   incrementZoom(amount: number) {
      this.scaleFactor = Math.round((this.scaleFactor + amount)*10)/10;
    }

    getIsFinal(){

      if (typeof(this.textObj.pages) == "undefined"){
        return false;
      }

      let flagHasVisitedAllPages = true;

      for (var i=0;i<this.textObj.pages.length;i++){
        if (this.pagesReVisited.indexOf(i) == -1){
          flagHasVisitedAllPages = false;
        }
      }
      return flagHasVisitedAllPages; 
    }

    finalizeCorrectionsCurrentPage(){

      if (this.annotatedText){
        let suggs = document.getElementsByClassName("suggestion") as any;

        if (suggs){
          for (var i=0; i<suggs.length;i++){
            let sugg_item = suggs[i];
            let suggId = sugg_item.getAttribute("data-sugg-id");
            let finalText = sugg_item.innerText;
    
            let suggIdx = this.textObj.pages[this.pageIdxSelected].suggestions.findIndex(x => x.sugg_id == suggId);
    
            if (suggIdx > -1){
              this.textObj.pages[this.pageIdxSelected].suggestions[suggIdx].final_text = finalText
            }
    
          }
        }
  
        let updatedText = document.getElementById("annotatedText").innerText;
  
        this.textObj.pages[this.pageIdxSelected].read_text = updatedText;
        this.textObj.pages[this.pageIdxSelected].flag_read_text_updated = true;
  
      }
      
    }


    approveObject(){

      let flagApproveItem = true; 

      if (this.getIsFinal()){
        
        if (flagApproveItem){
          if (confirm('Alle Seiten korrekt gelabelt?')) {

            this.finalizeCorrectionsCurrentPage();
           
            // this.api.isLoading = true;
            this.progressService.loaderIsLoading(); 

            
            if (typeof(this.textObj.pages) != "undefined"){
              this.textObj.pages.forEach(element => {
                delete element.base64String;
              });
            }

            this.api.approveSpellerObject(this.textObj).then(res => {

                this.snackBar.open('Dokument bestätigt.', null, {
                    duration: 1500,
                  });
    
                this.getSpellerLabelObject();

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
         
      }else{
          this.snackBar.open('Bitte erst alle Seiten labeln.', 'OK', {
              duration: 3000
            });
      }
      
  }

  disregardSpellerObject(){

    let flagEnsureDisregardObject = true; 

    if (this.textObj.wfstatus > 3){
      if (confirm('Das Objekt wurde bereits bestätigt - sollen die Änderungen überschrieben werden?')) {
        flagEnsureDisregardObject = true;
      }else{
        flagEnsureDisregardObject = false;
      }
    }
    if (flagEnsureDisregardObject){

      if (confirm('Dieses Objekt für die weitere Bearbeitung aussortieren (bspw. enthält Textfehler)?')) {

          this.api.disregardSpellerObject(this.textObj).then(res => {

              this.snackBar.open('Dokument wurde deaktiviert.', null, {
                  duration: 1500,
                });

              this.getSpellerLabelObject();

          }).catch(err => {
              this.snackBar.open('Etwas hat nicht geklappt.', null, {
                  duration: 1500,
              });
              console.error(err);
          });

        }
    }
  }

  refreshThisPageNoReload(){
    if (confirm('Soll das Objekt neu geladen werden? Alle Änderungen verfallen damit unwiderruflich.')) {
      this.getSpellerLabelObject(this.objId);
    }
  }

  issueObjToWf(targetWf, wfsteps=[]){

    let body = {
      "targetWf" : targetWf, 
      "objectIds" : [this.objId], 
      "wfsteps" : wfsteps
    }

    this.api.issueObjIdsToWf(body).then( (res : any) => {

      this.toastr.info("Das Objekt wurde '" + targetWf + "' zugefügt.");
      

    }).catch(err => {
      console.error(err);
      // this.api.isLoading = false; 
      this.progressService.loaderIsComplete();
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

  // PDF AREA 

  clearCanvas(){
    var c = document.getElementById("the-canvas");
    var ctx = (c as any).getContext("2d");
    ctx.save();
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,(c as any).width, (c as any).height); 
    ctx.restore();
  }

  
  drawPdfPage(){

    this.pageViewImage = 'data:image/jpg;base64,' + this.textObj.pages[this.pageIdxSelected].base64String;


  }

  resetZoom(){
    let prevImg = document.getElementById("prevImage");
    prevImg.setAttribute("style", "");
    this.flagIsZoomed = false;
  }

  imgClick(evt){

    if (this.flagIsZoomed){
      evt.target.setAttribute("style", "");
      this.flagIsZoomed = false;
    }else{

      let point = evt.offsetX + "/" + evt.offsetY;

      let midPointX = evt.target.width / 2;
      let midPointY = evt.target.height / 2;

      evt.target.setAttribute("style", "transform: scale(1.5) translate(" + (midPointX-evt.offsetX) +"px, " + (midPointY-evt.offsetY) +"px);");
      this.flagIsZoomed = true;
    }

  }


}
