import { Component, OnInit, OnDestroy, HostListener, AfterViewInit, ViewEncapsulation, ChangeDetectorRef, ViewChild , ElementRef, ApplicationRef} from '@angular/core';
import { ApiService } from '../../api.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { v1 as uuid } from 'uuid';
import { MatSnackBar, MatTooltip, MatMenuTrigger, MatMenu } from '@angular/material';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ProgressService } from '../../services/progress.service';
import { NERTagFilterPipe } from '../../pipes/pipes';

@Component({
  selector: 'app-nerlabel',
  templateUrl: './nerlabel.component.html',
  styleUrls: ['./nerlabel.component.scss'], 
  encapsulation: ViewEncapsulation.None
})
export class NerlabelComponent implements OnInit, AfterViewInit, OnDestroy {


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

  entityTypes : any[] = [
    {
      "id" : 0, 
      "val" : "konsolidiert", 
      "target_obj" : "consolidated_ent"
    },
    {
      "id" : 1, 
      "val" : "NLP", 
      "target_obj" : "details_ner_ent"
    },
    {
      "id" : 2, 
      "val" : "Matcher", 
      "target_obj" : "details_match_ent"
    },
    {
      "id" : 3, 
      "val" : "Fuzzy", 
      "target_obj" : "details_fuzz_ent"
    }
  ]
  
  @HostListener('document:keydown', ['$event']) onKeydownHandler(evt: KeyboardEvent) {
      
    const re = /^[0-9.]+$/

    // disable shortkeys for demo 
    if (!this.flagIsDemo && this.flagAllowEntChange){
      if (evt.key.match(re)){
        let number = parseInt(evt.key);
  
        if (number <= this.tags.length){
          this.tagIdxSelected = number - 1;
        }
      }else{
        let selIdx = this.tags.findIndex(x => x.shortcut.toUpperCase() == evt.key.toUpperCase());

        let suitableIdx;

        if (!this.getIncludeNonProdTags()){
          let visibleTags = this.tags.filter(x => x.prod == true);
          suitableIdx = visibleTags.map((elem, idx) => elem.shortcut.toUpperCase() == evt.key.toUpperCase() ? idx : "").filter(String)
        }else{
          suitableIdx = this.tags.map((elem, idx) => elem.shortcut.toUpperCase() == evt.key.toUpperCase() ? idx : "").filter(String)
        } 
        
        // if selected tag exists but is not visible, due to non-prod, set selIdx == -1
        if (selIdx > -1 && !this.getIncludeNonProdTags() && !this.tags[selIdx].prod ){
          selIdx = -1;
        }

        if (suitableIdx.length > 1){
          selIdx = -1;
          this.tagIdxSelected = selIdx; 
          this.snackBar.open('Der Shortcut ist doppelt vergeben - bitte Kategorie anklicken.', null, {
            duration: 1500,
          });
          return;
        }

        this.tagIdxSelected = selIdx; 
      }
    }
    
  }

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
    private nerTagFilterPipe: NERTagFilterPipe
  ) { }

  

  ngOnInit() {

    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
    
    let objId = this.route.snapshot.queryParamMap.get('objId');
    let flagIsDemo = this.route.snapshot.queryParamMap.get('demo');
    let wfCalled = this.route.snapshot.queryParamMap.get('wf');

    if (!wfCalled || wfCalled == "false"){
        this.flagIsPageCalledFromWorkflow = false;
    }else{
        this.flagIsPageCalledFromWorkflow = true;
    }

    if (flagIsDemo){
      this.flagIsDemo = true;
      this.flagAllowEntChange = false;
      this.flagHidePerson = true;

      if (!this.api.nerDemoResponse || this.api.docType != 'text'){
        this.router.navigate(["/home"]); 
        return;
      }
    }

    if (objId){
      this.objId = objId; 
    }

    let self = this; 

    this.progressService.getObjectProgressLog().subscribe((message: any) => {
      if (typeof(message.message) != "undefined"){
        this.toastr.info(message.category, message.message, {timeOut: 6000});
        if (typeof(message.details) != "undefined"){
          if (typeof(message.details.complete) != "undefined"){
            // this.api.isLoading = false;
            this.progressService.loaderIsComplete();
            setTimeout(() => { self.refreshToolTip.show(); }, 500);
          }

          if (typeof(message.details.start) != "undefined" || typeof(message.details.progress) != "undefined"){
            // this.api.isLoading = true;
            this.progressService.loaderIsLoading();
          }
        }
      }
    });

  }

  ngOnDestroy(){
    this.progressService.leaveObjLogRoom(this.objId);
  }

  @ViewChild('tooltip', {static: false}) tooltip: MatTooltip;
  @ViewChild('refreshToolTip', {static: false}) refreshToolTip: MatTooltip;
  


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


    if (this.flagIsDemo){
      this.getNerDemoObject();
    }else{
      if (this.objId){
        this.getNerLabelObject(this.objId);
      }else{
        this.getNerLabelObject();
      }
    }
    
   }

   prevPage(){

     if (this.pageIdxSelected-1 >= 0){
       this.pageIdxSelected =  this.pageIdxSelected - 1; 
       this.makeText(); 
     }
   }

   nextPage(){
     if(this.pageIdxSelected+1 < this.textObj.pages.length){
      this.pageIdxSelected =  this.pageIdxSelected + 1; 
      this.makeText();

      // insert pageIdx to the pages that have been presented to the user.
      this.pagesReVisited.push(this.pageIdxSelected);

     }
   }


  showSelectedText(evt) {

    var text = ""; 
    var startIdx, endIdx; 

    var flagRightClick = false;
    var flagCtrlClick = false;

    let flagHasEntity = false;
    let flagAbort = false; 
    let flagRemoveEntity = false;

    
    // disable right click
    if (evt.which == 3){
      flagRightClick = true;
      return;     
    }
    
    if (evt.ctrlKey){
      console.log("Ctrl-Pressed")
      flagCtrlClick = true;
    }

    if ((this.flagIsDemo || !this.flagAllowEntChange) && !flagCtrlClick){
      return;
    }

    if (evt.target.classList.contains("entity")){
      flagHasEntity = true;
    }

    if (evt.target.classList.contains("removeEnt")){
      flagHasEntity = true;
      flagRemoveEntity = true;
    }

    if (!flagHasEntity || flagCtrlClick){

      if (window.getSelection) {

          let sel = window.getSelection(); 

          if (sel.type != 'Range'){ // (sel as any).baseOffset == (sel as any).focusOffset){

            let textContentClicked = sel.focusNode.textContent;
            let textIndex = this.textObj.pages[this.pageIdxSelected].read_text.indexOf(textContentClicked);
            
            let idxClicked = textIndex + sel.focusOffset;

            // a word has only been clicked

            startIdx = this.getWordBound(idxClicked, this.textObj.pages[this.pageIdxSelected].read_text, true)
            endIdx = this.getWordBound(idxClicked, this.textObj.pages[this.pageIdxSelected].read_text)
            
            let resultWord = this.textObj.pages[this.pageIdxSelected].read_text.substring(startIdx, endIdx)

            text = resultWord; 
          
          }else{

            let textAnchorNode = sel.anchorNode.textContent;
            let textAnchorIndex = this.textObj.pages[this.pageIdxSelected].read_text.indexOf(textAnchorNode);

            let textContentClicked = sel.focusNode.textContent;
            let textIndex = this.textObj.pages[this.pageIdxSelected].read_text.indexOf(textContentClicked);

            // a text area has been selected
            text = window.getSelection().toString();

            //let textNoLinebreak = text.replace(/(\r\n|\n|\r)/g,"   ");

            startIdx = textAnchorIndex + Math.min(sel.focusOffset,sel.anchorOffset); // textAnchorIndex + sel.anchorOffset;
            endIdx = startIdx + text.length;

            if (typeof((sel as any).baseNode.classList) != "undefined"){
              if ((sel as any).baseNode.classList.contains("entity")){
                flagHasEntity = true;
              }
            }
            

          }

      } else if ((document as any).selection && (document as any).selection.type != "Control") {
          text = (document as any).selection.createRange().text;
      }

      // only add the tag if Ctrl has NOT been pressed and if NOT all characters are line breaks
      if (!flagCtrlClick ){

        this.selectedText = text;

        console.log("Add new tag with text: " + text ); 
  
        let newTag = this.makeTag(startIdx, endIdx, text); 

        if (newTag && ! /^[/\r|\n/]+$/.test(text)){
          this.addTag(newTag);
        }
        
      }else{

        this.api.getWordSuggestion(text).then((res : any) => {

          this.openSuggMenu(evt, res);

          console.log("right click text: " + text ); 
          console.log(res)
        })
  
      }


    }else{
      if (flagRemoveEntity){
        let tagId = evt.target.getAttribute("data-ent-id"); 
        this.removeTag(tagId);
        console.log("Remove entity: "+ tagId);
      }

    }

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
        console.error("getWord()", "Es ist etwas mit dem Wort '" + text + "' schief gelaufen.");
        resIdx = 0;
      }

    }

    console.log("iterations:" + iteration)
    
    return resIdx;
  
  }


   updateShortcut(){

     if (this.newEntText.length > 0){

      let newShortcut = this.newEntText.substring(0,1); 

      let shortkeyIdx = this.tags.findIndex(x => x.shortcut.toUpperCase() == newShortcut.toUpperCase()); 

      if (shortkeyIdx == -1){
        this.newEntTextShortCut = newShortcut.toUpperCase(); 
      }

     }else{
       this.newEntTextShortCut = ""; 
     }
   }

   
  addNewTag(){

    let shortkeyIdx = this.tags.findIndex(x => x.shortcut.toUpperCase() == this.newEntTextShortCut.toUpperCase()); 

    if (shortkeyIdx != -1){

      this.snackBar.open('Bitte anderen Shortcut wählen.', null, {
        duration: 1500,
      });
      return; 

    }

    if (this.newEntTextShortCut.length > 1 || this.newEntTextShortCut.length == 0){
      this.snackBar.open('Bitte Shortcut mit einem Zeichen wählen.', null, {
        duration: 1500,
      });
      return; 
    }

    let newTag = {
      "value" : this.newEntText, 
      "shortcut" : this.newEntTextShortCut.toUpperCase(), 
      "prod" : true
    }

    // this.api.isLoading = true;
    this.progressService.loaderIsLoading();

    this.api.addNerLabelTag(newTag).then( (data : any) => {

      if (data.ops.length > 0){
        this.tags.push(data.ops[0])
      }
      this.progressService.loaderIsComplete();
      //this.api.isLoading = false;
      this.newEntText = "";
      this.newEntTextShortCut = ""; 

    }).catch(err => {
      console.log(err);
      // this.api.isLoading = false;
      this.progressService.loaderIsComplete();
    })

    console.log(newTag); 

  }

  getNerDemoObject(){
    const self = this; 

    if (!self.api.nerDemoResponse){
      return;
    }
    

    let nerResponse = self.api.nerDemoResponse.data;


    // create a demo doc letter document from input text

    self.flagIsDemo = true;
    self.flagIsNoDataAvailable = false;
    self.flagAllowEntChange = false;

    self.totalNumPages = 1;
    self.pageIdxSelected = 0;

    let docObject = {
      "_id" : "Demo",
      "pages" : [
        {
          "entities" :  self.sortEntities(nerResponse.entities),
          "details" : nerResponse.details,
          "read_text" : nerResponse.text, 
          "read_text_raw" : nerResponse.text_raw
        }
      ]

    }

    this.textObj = docObject;

    this.makeText();

  }

  getNerLabelObject(objectId?){
    const self = this;
    // self.api.isLoading = true;
    self.progressService.loaderIsLoading();
    self.flagIsNoDataAvailable = false; 

    // reset the pages visited for the new object
    self.pagesReVisited = [];

    self.api.getNerLabelObject(objectId, this.flagIsPageCalledFromWorkflow).then( (data : any) => {

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
          data.pages[self.pageIdxSelected].entities = self.sortEntities(data.pages[self.pageIdxSelected].entities);
          self.totalNumPages = data.pages.length; 
          self.annotatedText = self.constructHtml(data.pages);
          self.rawText = self.getRawText(data.pages);

          if (data.pages.length > 1){
            setTimeout(() => { self.tooltip.show(); }, 2500);
          }

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
    this.sortEntities();
    this.annotatedText = this.constructHtml(this.textObj.pages);
    this.rawText = this.getRawText(this.textObj.pages);
   }

   sortEntities(entities?){

    if (entities){
      entities.sort((a, b) => (a.start > b.start) ? 1 : -1); 
      return entities;
    }else{
      this.textObj.pages[this.pageIdxSelected].entities.sort((a, b) => (a.start > b.start) ? 1 : -1)
    }

   }

   addTag(tag: any){

    let flagAdd = true;

    // are there tags that start or end at the same index in the string?

    let startIdx = this.textObj.pages[this.pageIdxSelected].entities.findIndex(x => x.start == tag.start);
    let endIdx = this.textObj.pages[this.pageIdxSelected].entities.findIndex(x => x.end == tag.end);

    if (startIdx > -1 || endIdx > -1){

      // is the UI including non-prod tags?

      let isShowNonProdEntities = this.getIncludeNonProdTags();

      if (isShowNonProdEntities){
        // if also non-prod entities should be displayed, then there is an interference with an existing tag
        flagAdd = false;
      }else{

        let startEntProd, endEntProd;

        try{
          startEntProd = this.tags[this.tags.findIndex(x => x._id == this.textObj.pages[this.pageIdxSelected].entities[startIdx]._id)].prod;
        }catch(err){    
          startEntProd = false;
        }
        
        try{
          endEntProd = this.tags[this.tags.findIndex(x => x._id == this.textObj.pages[this.pageIdxSelected].entities[endIdx]._id)].prod;
        }catch(err){
          endEntProd = false;
        }
        
        // if non prod entities are not shown, then there might be no interference with a tag because 
        // the existing tag in the entities list might be a non-prod tag entity
        // yet: when one of the intering entities belongs to a productive entity, then there is an error

        if (startEntProd || endEntProd){
          flagAdd = false;
        }

      }

    }

    if (flagAdd){

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
     if (tag.start <= this.textObj.pages[this.pageIdxSelected].entities[0].start && 
      tag.end >= this.textObj.pages[this.pageIdxSelected].entities[this.textObj.pages[this.pageIdxSelected].entities.length-1].end){
       return true; 
     }

     // does the UI include non-prod tags?
     let isShowNonProdEntities = this.getIncludeNonProdTags();

     this.textObj.pages[this.pageIdxSelected].entities.forEach(element => {
        if (
          (element.end > tag.start  && element.start < tag.start) ||
          (element.start < tag.end && element.end > tag.end) ||
          (element.start >= tag.start && element.end <= tag.end)
          ){
            if (!isShowNonProdEntities){

              let elementIsProd;
              try{
                elementIsProd = this.tags[this.tags.findIndex(x => x._id == element._id)].prod;
              }catch(err){    
                elementIsProd = false;
              }

              if (elementIsProd){
                flagDoesInterfere = true; 
              }
            }else{
              flagDoesInterfere = true; 
            }
          
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


   constructHtml(data){

    // make deep copy of the object so that the hiding of personal information is not overwriting results.
    data = JSON.parse(JSON.stringify(data[this.pageIdxSelected]));

    if (typeof(data.read_text) == "undefined"){
      this.annotatedText = null; 
      return; 
    }

    var text = data.read_text;
    var offset = 0; 

    for (var i=0; i<data.entities.length; i++){
      var ent = data.entities[i];

      let prodTag = this.getEntIsProdClass(ent._id);

      if ((prodTag != "" && this.getIncludeNonProdTags()) || prodTag == ""){

        let sanityCheckOverlap = true;
        let previousTag
        if (i > 0){
          previousTag = data.entities[i-1];
          if (previousTag.end > ent.start){
            sanityCheckOverlap = false;
          }
        }
        
        if (sanityCheckOverlap){
          var s = this.getEntity(ent);

          var start = offset + ent.start; 
          var end = offset + ent.end;

          text = text.substring(0, start) + s + text.substring(end,text.length)

          // let textNoLinebreak = ent.value.replace(/(\r\n|\n|\r)/g,"   ");          
    
          offset = offset + (s.length - ent.value.length);

        }else{

          /*
          this.snackBar.open('Ein Tag überschneidet sich mit vorherigen. Konsole prüfen.', null, {
            duration: 1500,
          });
          */

          console.log("Conflicting tags...")

          let startPreviewIdxPre = Math.min(previousTag.start-15, 0);
          let endPreviewIdxPre = Math.min(previousTag.start, 0);

          let startPreviewIdxSuff = Math.min(previousTag.end-15, 0);
          let endPreviewIdxSuff = Math.min(previousTag.end, 0);

          let tagName = this.getEntHlValue(previousTag._id);

          let prevText = text.substring(startPreviewIdxPre, endPreviewIdxPre) + previousTag.value + "[" + tagName + "]" + text.substring(startPreviewIdxSuff, endPreviewIdxSuff);


          // for demo: prevent errors popping up 
          // createHtml takes care of overlapping items for UI purposes.

          if (!this.flagIsDemo){

            if (confirm("Ein Tag kann nicht zugefügt werden, soll der konfliktierende Tag gelöscht werden? \n" + prevText)){
              let prevTagIdx = this.textObj.pages[this.pageIdxSelected].entities.findIndex(x => x.ent_id == previousTag.ent_id);
              this.textObj.pages[this.pageIdxSelected].entities.splice(prevTagIdx, 1);
              console.log("Delete previousTag"); 
              console.log(previousTag); 
            }
  
            startPreviewIdxPre = Math.min(ent.start-15, 0);
            endPreviewIdxPre = Math.min(ent.start, 0);
  
            startPreviewIdxSuff = Math.min(ent.end-15, 0);
            endPreviewIdxSuff = Math.min(ent.end, 0);
  
            tagName = this.getEntHlValue(ent._id);
  
            prevText = text.substring(startPreviewIdxPre, endPreviewIdxPre) + ent.value + "[" + tagName + "]" + text.substring(startPreviewIdxSuff, endPreviewIdxSuff);
  
  
            if (confirm("Ein Tag kann nicht zugefügt werden, soll der konfliktierende Tag gelöscht werden? \n" + prevText)){
  
              let entTagIdx = this.textObj.pages[this.pageIdxSelected].entities.findIndex(x => x.ent_id == ent.ent_id);
              this.textObj.pages[this.pageIdxSelected].entities.splice(entTagIdx, 1);
  
              console.log("Delete ent");
              console.log(ent);
            }

          }

          
        }
        
      }

    }

    // this.cd.detectChanges();
    this.appRef.tick();
    
    return this.sanitizer.bypassSecurityTrustHtml(text); 

   }

   toggleClassShowEnt(state?){

    let tagList = document.getElementsByClassName("entity") as any;
    for (var i=0;i<tagList.length;i++){
      let elem = tagList[i];
      if (this.flagShowEntSmall){
        elem.classList.add("showEnt")
      }else{
        elem.classList.remove("showEnt")
      }
    }

   }

   toggleShowRawText(state){
    console.log(state);
    this.flagShowRawText = state;
   }

   toggleClassHidePerson(state){
     this.flagHidePerson = state.checked;
     this.makeText(); 
   }

   getRawText(data){

    if (typeof(data[this.pageIdxSelected].read_text_raw) != "undefined"){
      return this.sanitizer.bypassSecurityTrustHtml(data[this.pageIdxSelected].read_text_raw); 
    }else{
      return ""; 
    }
   }


   getEntity(ent){
     let classShowEnt = ""; 
     if (this.flagShowEntSmall){
       classShowEnt = "showEnt";
     }

     if (this.flagHidePerson && this.getEntHlImmutableTitle(ent._id).toLowerCase() == "PER".toLowerCase()){

        let origLen = ent.value.length;
        let hidden_val = new Array( origLen ).fill( 1 ).map( ( _, i ) => String.fromCharCode( 65 + 23 ) ).join(""); 
        ent.value = hidden_val;

     }
    var snippit = '<span class="entity hl-' + this.getEntHlId(ent._id) + " " + classShowEnt + " " + this.getEntIsProdClass(ent._id) +'" ' + 
     ' style="background-color: ' + this.getEntBgColor(ent._id) + '; border: ' + this.getEntBorderStyle(ent._id) + ';"' + ' data-tag-id="' + 
      this.getEntHlId(ent._id) + '" data-ent-id="' + ent.ent_id + '">' + ent.value + '<span style="color:' + this.getEntTextColor(ent._id) +  ';" class="ent-tooltip">' + this.getEntHlValue(ent._id) + 
      '</span><div class="removeEnt" data-ent-id="' + ent.ent_id + '">X</div></span>'
    return snippit;
   }

   getEntHlId(tag_id){
    var entInd = this.tags.findIndex(x => x._id == tag_id); 

    if (entInd > -1){
      return entInd;
    }else{
      return 9999;
    }
    
   }

   getEntTextColor(tag_id){
    var entInd = this.tags.findIndex(x => x._id == tag_id); 

    if (entInd > -1){
      return this.tags[entInd].textColor;
    }else{
      return '#000000';
    }
    
   }

   getEntBgColor(tag_id){
    var entInd = this.tags.findIndex(x => x._id == tag_id); 

    if (entInd > -1){
      return this.tags[entInd].bgColor + "57"; // adding transparency;
    }else{
      return '#000000';
    }
   }

   getEntBorderStyle(tag_id){
    var entInd = this.tags.findIndex(x => x._id == tag_id); 

    if (entInd > -1){
      return "1px solid " + this.tags[entInd].bgColor; // adding transparency;
    }else{
      return "1px solid " + '#000000';
    }
   }

   getEntHlValue(tag_id){
    var entInd = this.tags.findIndex(x => x._id == tag_id); 

    if (entInd > -1){
      return  this.tags[entInd].display;
    }else{
      return "unknown";
    }
   }

   
   getEntHlImmutableTitle(tag_id){
    var entInd = this.tags.findIndex(x => x._id == tag_id); 

    if (entInd > -1){
      return  this.tags[entInd].value;
    }else{
      return "unknown";
    }
   }

   getEntIsProdClass(tag_id){
    var entInd = this.tags.findIndex(x => x._id == tag_id); 

    if (entInd > -1){
      if (this.tags[entInd].prod){
        return ""
      }else{
        return "non-prod"
      }
    }else{
      return "non-prod";
    }
    
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


    approveObject(){

      let flagApproveItem = true; 

      if (this.getIsFinal()){

        if (this.textObj.wfstatus > 3){
          if (confirm('Das Objekt wurde bereits bestätigt - sollen die Änderungen überschrieben werden?')) {
            flagApproveItem = true;
          }else{
            flagApproveItem = false;
          }
        }
        
        if (flagApproveItem){
          if (confirm('Alle Seiten korrekt gelabelt?')) {
           
            // this.api.isLoading = true;
            this.progressService.loaderIsLoading(); 

            this.api.approveNerLabelObject(this.textObj).then(res => {

                this.snackBar.open('Dokument bestätigt.', null, {
                    duration: 1500,
                  });
    
                this.getNerLabelObject();
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
         
      }else{
          this.snackBar.open('Bitte erst alle Seiten labeln.', 'OK', {
              duration: 3000
            });
      }
      
  }

  disregardNerObject(){

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

          this.api.disregardNerObject(this.textObj).then(res => {

              this.snackBar.open('Dokument wurde deaktiviert.', null, {
                  duration: 1500,
                });

              this.getNerLabelObject();
              this.updateUrlParamsToWF();

          }).catch(err => {
              this.snackBar.open('Etwas hat nicht geklappt.', null, {
                  duration: 1500,
              });
              console.error(err);
          });

        }
    }
  }

  handleDisplayEntityChange(evt){

    let self = this; 
    
     if (this.selectedEntityTypeId > 0) {
      this.snackBar.open('Es werden nun alle Tags angezeigt. Nicht produktive sind rot-umrandet.', null, {
        duration: 1500,
      });
    }

    let target_obj_meta = this.entityTypes[this.entityTypes.findIndex(x => x.id == this.selectedEntityTypeId)]; 

    if (target_obj_meta.id == 0){
      this.flagAllowEntChange = true;
    }else{
      this.flagAllowEntChange = false;
    }

    let target_obj_name = target_obj_meta.target_obj;

    let target_obj = this.textObj.pages[this.pageIdxSelected].details[target_obj_name]

    this.textObj.pages[this.pageIdxSelected].entities = this.sortEntities(target_obj);

    this.makeText();

    if (target_obj.length < 1){

      let sb = this.snackBar.open( `Es wurden keine Entitäten für  ${target_obj_meta.val} gefunden`, "Laden?", {
        duration: 5500,
      });

      sb.onAction().subscribe(() => {
        console.log('The snack-bar action was triggered!');

        self.router.navigate(["/home"]).then( (e) => {
          self.progressService.loaderIsComplete(); 
        });
      });

    }


   

  }

  getIncludeNonProdTags(){
    if (this.selectedEntityTypeId == 0){
      return false;
    }else{
      return true;
    }
  }


  updateUrlParams(flagNoObjId=false){

    if (flagNoObjId){
      this.router.navigate(
        [], 
        {
          relativeTo: this.route,
          queryParamsHandling: 'merge'
        });
    }else{
      this.router.navigate(
        [], 
        {
          relativeTo: this.route,
          queryParams: { objId: this.objId },
          queryParamsHandling: 'merge'
        });
    }
  
  }

  updateUrlParamsToWF(){

    this.router.navigate(
      [], 
      {
        relativeTo: this.route,
        queryParams: { wf: true },
        queryParamsHandling: ''
      });
    
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

  navToLabelObj(){

    this.router.navigate(["/admin/label"], { queryParams: { objId: this.objId } }).then( (e) => {
    });

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
      this.api.getNerLabelTag().then( (data : any) => {
        this.tags = data;
        this.getNerLabelObject(this.objId);
      }).catch(err => {
        console.log(err);
        this.progressService.loaderIsComplete();
      })

    }
  }

  openSuggMenu(evt, response){


    let cont = document.getElementById("sug-menu"); 
    let targetClickedRects = evt.target.getClientRects()[0];

    let top = evt.clientY // targetClickedRects.bottom;
    let left = evt.clientX // targetClickedRects.left;

    cont.setAttribute("style", "top: "+top+"px; left: "+left+"px");

    // add content to menu

    cont.innerHTML = ""; 

    let itemIdx = response.suggestions.findIndex(x => x.orig == response.text)

    if (itemIdx > -1){
      let suggestions = response.suggestions[itemIdx].sug;

      cont.innerHTML += '<div class="sug-header">Vorschläge</div>'
  
      for (var i=0; i<suggestions.length;i++){
        let sug = suggestions[i];
        cont.innerHTML += '<div class="sug-item">' + sug.key + '</div>'
      }
  
      
    }else{
      cont.innerHTML += '<div class="sug-header">Keine Vorschläge für ' +response.text +' .</div>'
    }

    cont.classList.add("view");

  }

  closeSuggMenu(){
    let cont = document.getElementById("sug-menu");
    cont.classList.remove("view");
    cont.innerHTML = ""; 
  }

  clickBody(){
    this.closeSuggMenu();
  }

}
