import { Component, OnInit, HostListener, AfterViewInit, ViewEncapsulation, ChangeDetectorRef, ViewChild , ElementRef} from '@angular/core';
import { ApiService } from 'src/app/api.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { v1 as uuid } from 'uuid';
import { MatSnackBar, MatTooltip } from '@angular/material';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-nerlabel',
  templateUrl: './nerlabel.component.html',
  styleUrls: ['./nerlabel.component.scss'], 
  encapsulation: ViewEncapsulation.None
})
export class NerlabelComponent implements OnInit, AfterViewInit {

  objId : string = ""; 

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

  pagesReVisited : any[] = [];

  
  @HostListener('document:keydown', ['$event']) onKeydownHandler(evt: KeyboardEvent) {
      
    const re = /^[0-9.]+$/

    // disable shortkeys for demo
    if (!this.flagIsDemo){
      if (evt.key.match(re)){
        let number = parseInt(evt.key);
  
        if (number <= this.tags.length){
          this.tagIdxSelected = number - 1;
        }
      }else{
        let selIdx = this.tags.findIndex(x => x.shortcut.toUpperCase() == evt.key.toUpperCase()); 
  
        if (selIdx > -1){
          this.tagIdxSelected = selIdx; 
        }
      }
    }
    
    
  }

 



  constructor(
    private router: Router,
    private api: ApiService,
    private sanitizer: DomSanitizer, 
    public snackBar: MatSnackBar, 
    private route: ActivatedRoute, 
    private cd: ChangeDetectorRef
  ) { }

  

  ngOnInit() {

    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
    
    let objId = this.route.snapshot.queryParamMap.get('objId');
    let flagIsDemo = this.route.snapshot.queryParamMap.get('demo'); 

    if (flagIsDemo){
      this.flagIsDemo = true;

      if (!this.api.nerDemoResponse || this.api.docType != 'text'){
        this.router.navigate(["/home"]); 
        return;
      }
    }

    if (objId){
      this.objId = objId; 
    }
  }

  @ViewChild('tooltip', {static: false}) tooltip: MatTooltip;


  async ngAfterViewInit() {
   
    this.api.isLoading = true;

    // use async to wait for labels to load first
    await this.api.getNerLabelTag().then( (data : any) => {
      this.tags = data;
      if (this.flagIsDemo){
        this.api.isLoading = false; 
      }
    }).catch(err => {
      console.log(err);
      this.api.isLoading = false; 
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

    let flagHasEntity = false;
    let flagAbort = false; 
    let flagRemoveEntity = false;

    if (evt.target.classList.contains("entity")){
      flagHasEntity = true;
    }

    if (evt.target.classList.contains("removeEnt")){
      flagHasEntity = true;
      flagRemoveEntity = true;
    }

    if (!flagHasEntity){

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

      if (true /* exclude line breaks:!(/\r|\n/.exec(text)) */){
        this.selectedText = text;
        console.log("Add new tag with text: " + text ); 
  
        let newTag = this.makeTag(startIdx, endIdx, text); 
        this.addTag(newTag); 
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

    let resIdx = -1;
    let it = idx;
    
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
    }
    
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
      "shortcut" : this.newEntTextShortCut.toUpperCase()
    }

    this.api.isLoading = true;

    this.api.addNerLabelTag(newTag).then( (data : any) => {

      if (data.ops.length > 0){
        this.tags.push(data.ops[0])
      }

      this.api.isLoading = false;
      this.newEntText = "";
      this.newEntTextShortCut = ""; 

    }).catch(err => {
      console.log(err);
      this.api.isLoading = false; 
    })

    console.log(newTag); 

  }

  getNerDemoObject(){
    const self = this; 
    let nerResponse = self.api.nerDemoResponse.data;
    
    // create a demo doc letter document from input text

    self.flagIsDemo = true;
    self.flagIsNoDataAvailable = false; 

    self.totalNumPages = 1;
    self.pageIdxSelected = 0;

    let docObject = {
      "_id" : "Demo",
      "pages" : [
        {
          "entities" :  self.sortEntities(nerResponse.entities),
          "read_text" : nerResponse.text, 
          "read_text_raw" : nerResponse.text
        }
      ]

    }

    this.textObj = docObject;

    this.makeText();

  }

  getNerLabelObject(objectId?){
    const self = this;
    self.api.isLoading = true;
    self.flagIsNoDataAvailable = false; 

    // reset the pages visited for the new object
    self.pagesReVisited = [];

    self.api.getNerLabelObject(objectId).then( (data : any) => {

      if (typeof(data._id) == "undefined"){
          self.flagIsNoDataAvailable = true;
          self.updateUrlParams(true);
      }else{

        self.objId = data._id; 

        console.log(this.objId);

      

        self.updateUrlParams();

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
      }
       self.api.isLoading = false; 

    }).catch(err => {
      console.log(err);
      self.api.isLoading = false;
      self.flagIsNoDataAvailable = false; 
    })

   }

   selectEntity(index){
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

    if (this.textObj.pages[this.pageIdxSelected].entities.findIndex(x => x.start == tag.start) == -1 && 
      this.textObj.pages[this.pageIdxSelected].entities.findIndex(x => x.end == tag.end) == -1
      ){

        if (!this.doesTagInterfereWithOthers(tag)){
          this.textObj.pages[this.pageIdxSelected].entities.push(tag);
          this.makeText();
        }else{
          console.log("interfering tag...cannot add")
        }        

      }else{
        console.log("cannot add the same tag again...")
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
        if ((element.start <= tag.start && element.end >= tag.start) || (element.start <= tag.end && element.end >= tag.end)){
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
     
     return {
        "created_at": new Date(),
        "end": endIdx,
        "ent_id":  entID,
        "start": startIdx,
        "tag": this.tags[this.tagIdxSelected].value,
        "_id":this.tags[this.tagIdxSelected]._id,
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

      var s = this.getEntity(ent);

      var start = offset + ent.start; 
      var end = offset + ent.end;

      text = text.substring(0, start) + s + text.substring(end,text.length)

      offset = offset + (s.length - ent.value.length);


    }

    this.cd.detectChanges();
    
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

     if (this.flagHidePerson && this.getEntHlValue(ent._id) == "PER"){

        let origLen = ent.value.length;
        let hidden_val = new Array( origLen ).fill( 1 ).map( ( _, i ) => String.fromCharCode( 65 + 23 ) ).join(""); 
        ent.value = hidden_val;

     }
    var snippit = '<span class="entity hl-' + this.getEntHlId(ent._id) + " " + classShowEnt + '" data-tag-id="' + this.getEntHlId(ent._id) + '" data-ent-id="' + ent.ent_id + '">' + ent.value + '<span class="ent-tooltip">' + this.getEntHlValue(ent._id) + '</span><div class="removeEnt" data-ent-id="' + ent.ent_id + '">X</div></span>'
    return snippit
   }

   getEntHlId(tag_id){
    var entInd = this.tags.findIndex(x => x._id == tag_id); 

    if (entInd > -1){
      return entInd;
    }else{
      return 9999;
    }
    
   }

   getEntHlValue(tag_id){
    var entInd = this.tags.findIndex(x => x._id == tag_id); 

    if (entInd > -1){
      return  this.tags[entInd].value;
    }else{
      return "unknown";
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
          this.api.isLoading = true; 

          this.api.approveNerLabelObject(this.textObj).then(res => {

              this.snackBar.open('Dokument bestätigt.', null, {
                  duration: 1500,
                });
  
              this.getNerLabelObject();

          }).catch(err => {
              this.snackBar.open('Etwas hat nicht geklappt.', null, {
                  duration: 1500,
              });
              this.api.isLoading = false; 
              console.error(err);
          })
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

          }).catch(err => {
              this.snackBar.open('Etwas hat nicht geklappt.', null, {
                  duration: 1500,
              });
              console.error(err);
          });

        }
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

  navToLabelObj(){

    this.router.navigate(["/admin/label"], { queryParams: { objId: this.objId } }).then( (e) => {
    });

  }

}
