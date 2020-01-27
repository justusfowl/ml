import { Component, ViewChild, OnInit, HostListener, ViewEncapsulation, AfterViewInit } from '@angular/core';
import { FormGroup, FormBuilder, FormArray } from '@angular/forms';
import {DomSanitizer} from '@angular/platform-browser'; 
import { v1 as uuid } from 'uuid';
import { ApiService } from '../../api.service';
import { MatSnackBar, MatDrawer, MatSidenav } from '@angular/material';
import { Router, ActivatedRoute } from '@angular/router';
import { NavDrawerService } from 'src/app/services/nav.service';
import { ProgressService } from 'src/app/services/progress.service';


@Component({
  selector: 'app-label',
  templateUrl: './label.component.html',
  styleUrls: ['./label.component.scss'], 
  encapsulation: ViewEncapsulation.None
})
export class LabelComponent implements OnInit, AfterViewInit {

  objId : string = ""; 

  flagIsPageCalledFromWorkflow : boolean = true;

  selectedObjectId : string = ""; 

  loadedObjects = [];

  isLoading : boolean = true; 
  flagIsNoDataAvailable : boolean = false; 

  labelObject : any = {
      ObjectId : null, 
      pages : []
  }

  skipPagesIndex = []

  showPage : number = 0;
  numPages : number = 0; 
  activePage : any = null; 

  imagePath : string; 

  isFinal : boolean = false; 

  public myForm: FormGroup;

  activeIndex : number;

  quickBox : boolean = false;

  replaceInitialLabel : boolean = true;

  mouse = {
      x: 0,
      y: 0,
      startX: 0,
      startY: 0
  };

  element = null;
  crossHairHorizontal = null;
  crossHairVertical = null; 

  selectedLabel : any = null;

  itemDateLoaded : any;

  sessionCount : number = 0;

  totalTimesWorkedOn =  [];

  sessionStartedDate : number;

  // withdraw images with different preconditions (pre-labeled, crawled, uploaded, ...)
  getImageMode = "pre";

  templateAttrCategory = ""; 
  templateAttrType = ""; 


  @HostListener('document:keydown', ['$event']) onKeydownHandler(evt: KeyboardEvent) {
      
      if (evt.key == "Escape"){
          this.detectEscape();
          console.log("detectEscape")
      }

      if (evt.key == "x" && evt.altKey){
        let newPageIndex = this.showPage + 1; 
        this.goToPage(newPageIndex)
      }

      if (evt.key == "y" && evt.altKey){
        let newPageIndex = this.showPage - 1; 
        this.goToPage(newPageIndex)
      }

      if (evt.key == "s" && evt.altKey){
        this.approveObject();
      }

      if (evt.key == "a" && evt.altKey){
        this.disregardObject();
      }

  }

  isSetTrainOnly : boolean = false;
  availableGroupLabels = [];
  availableCrawlGroupLabels = [];

  isValidatedGroupLabelInfo : any = { 
      "total" : "-"
  };

  groupLabelInfoSelected : any; 

  groupLabelsInfoChangedItem : any;


  
  @ViewChild('drawer', {static: true}) drawer: MatSidenav;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private _fb: FormBuilder,
    private progressService : ProgressService,
    private api: ApiService,
    public snackBar: MatSnackBar,
    private navService : NavDrawerService,
    private sanitizer: DomSanitizer) {

     } 

  ngOnInit() {

    this.router.routeReuseStrategy.shouldReuseRoute = () => false;

    let objId = this.route.snapshot.queryParamMap.get('objId'); 
    let wfCalled = this.route.snapshot.queryParamMap.get('wf');

    if (!wfCalled || wfCalled == "false"){
        this.flagIsPageCalledFromWorkflow = false;
    }else{
        this.flagIsPageCalledFromWorkflow = true;
    }

    console.log(objId);

    this.clearView();

    if (objId){
     
      this.objId = objId;
      this.getLabelObject(this.objId);
    }else{
        this.myForm = this._fb.group({
            ObjectId: "",
            _childDocuments_: this._fb.array([
                this.initLabel()
            ])
          });

          this.getLabelObject();
    }

  this.sessionStartedDate = new Date().getTime();


  }

  ngAfterViewInit() {
      console.log("I am from workflow?")
      console.log(this.flagIsPageCalledFromWorkflow)
  }

  clearView(){

    this.isLoading = false; 

    this.labelObject  = {
        ObjectId : null, 
        pages : []
    }

    this.skipPagesIndex = []; 
  
    this.showPage  = 0;
    this.numPages = 0; 
    this.activePage  = null; 
  
    this.imagePath = null; 
  
    this.isFinal = false; 

  }

  getLabelObject(objectId?, isActiveClick?){

    // this.api.isLoading = true;
    this.progressService.loaderIsLoading();

    this.isLoading = true;

    if (!isActiveClick){
        this.flagIsNoDataAvailable = false;
    }

    this.api.getLabelObject(objectId, this.flagIsPageCalledFromWorkflow).then((result : any) => {

        if (typeof(result._id) == "undefined"){
            this.isLoading = false; 
            this.flagIsNoDataAvailable = true; 
        }else{

            if (!objectId){
                this.loadedObjects.push(result._id);
                this.objId = result._id; 
               
            }

           

            this.selectedObjectId = result._id; 

            this.labelObject = result;
            this.showPage = 0;
    
            if (typeof(this.labelObject.pages) != "undefined"){
    
                this.numPages = this.labelObject.pages.length; 
            }
    
            this.selectPage(0);
    
            this.isLoading = false; 
            
            this.flagIsNoDataAvailable = false; 
        }

        // this.api.isLoading = false; 
        this.progressService.loaderIsComplete();
    
    })
  }

  handleSelectObjChange(evt){
      console.log(evt);

      this.getLabelObject(evt.value)
  }

  selectPage(pageIndex){
    if (typeof(this.labelObject.pages) != "undefined"){
        if (this.labelObject.pages.length >= pageIndex+1 && pageIndex >= 0){
            this.activePage = this.labelObject.pages[pageIndex];

            if (typeof(this.activePage.bbox) != "undefined"){
                this.addLabel(this.activePage.bbox, true)
            }else{
                this.addLabel()
            }

            this.showPage = pageIndex; 

        }
    }
  }

  goToPage(pageIndex){
      this.selectPage(pageIndex);
      var elmnt = document.getElementById("prev_"+pageIndex);
      if (elmnt){
        elmnt.scrollIntoView();
      }
      
  }

  detectEscape(){

        this.element = null;
        let canvas = document.getElementsByClassName("large-image")[0] as any;
        canvas.style.cursor = "default";
        
        let tmpBox = document.getElementById("tmp_rect");
        if (tmpBox){
            tmpBox.remove();
        }

        delete this.activePage.bbox; 

    }

    skipLabelPage(){

        this.skipPagesIndex.push(this.showPage);
        this.activePage.isSkipped = true;

        this.detectEscape();

        let newPageIndex = this.showPage + 1; 
        this.goToPage(newPageIndex);

    }

    getPageIsSkipped(i){
        let self = this; 

        if ( self.skipPagesIndex.findIndex(x => x == i) != -1 || typeof(this.labelObject.pages[i].isSkipped) != "undefined" ){
            return true;
        }else{
            return false;
        }

    }   
  
  setMousePosition(e) {
        var ev = e || window.event; //Moz || IE
        let menuBandX = ev.target.offsetParent.getClientRects()[0].x;
        
        if (menuBandX > 0){
           this.navService.closeNav();
        }

        if (ev.pageX) { //Moz          

            this.mouse.x = ev.pageX + window.pageXOffset - 2;
            this.mouse.y = ev.pageY + window.pageYOffset - 2;
        } else if (ev.clientX) { //IE
            this.mouse.x = ev.clientX + document.body.scrollLeft - 2;
            this.mouse.y = ev.clientY + document.body.scrollTop - 2;
        }
    };

    getBboxStyle(){

        if (typeof(this.activePage.bbox) != "undefined"){
            let bbox = this.activePage.bbox;

            // let bbox = label.value.bbox; 
    
            let style = "";
    
            let image = document.getElementsByClassName("large-image")[0];
    
            let clientRects = image.getClientRects()[0] as any;
    
            let relWidth = (bbox.relWidth) ? bbox.relWidth : 0; 
            let relHeight = (bbox.relHeight) ? bbox.relHeight : 0; 
    
            let relX = ((bbox.relX) ? bbox.relX : 0); 
            let relY = ((bbox.relY) ? bbox.relY : 0); 
    
            style += "top: " + (relY*clientRects.height + clientRects.y) + "px;";
            style += "left: " + (relX*clientRects.width + clientRects.x) + "px;";
            style += "width: " + (relWidth*clientRects.width) + "px;";
            style += "height: " + (relHeight*clientRects.height) + "px;";
            style += "position:absolute;";
            style += "pointer-events:none !important;";   
    
            return this.sanitizer.bypassSecurityTrustStyle(style);
        }

    }

    dragImage(event){
        this.imageClick(event)
        return false;
    }

    imageDblClick(evt){

        evt.stopPropagation()

        return false;
    }

    imageClick(evt){

        let canvas = evt.target;
        let parent = canvas.parentNode;

        if (this.element !== null) {

            // end of clicking the bounding box
            // create the coords of left-top corner for x/y (+ in relative terms to image size)

            let clientRects = canvas.getClientRects()[0];

            let width = Math.abs(this.mouse.x - this.mouse.startX);
            let height = Math.abs(this.mouse.y - this.mouse.startY);

            let relWidth = width / clientRects.width; 
            let relHeight = height / clientRects.height; 

            let xOffset = clientRects.x;
            let initX = (this.mouse.x - this.mouse.startX < 0) ? this.mouse.x : this.mouse.startX;

            let yOffset = clientRects.y;
            let initY = (this.mouse.y - this.mouse.startY < 0) ? this.mouse.y : this.mouse.startY;

            let x = initX - xOffset;
            let y = initY - yOffset;

            let relX = x/clientRects.width;
            let relY = y/clientRects.height;

            let bbox = {
                origin: "manual",
                relWidth : relWidth,
                relHeight : relHeight,
                width: width, 
                height: height,
                relX: relX,
                relY: relY,
                x : x,
                y : y
            }

            this.element = null;
            canvas.style.cursor = "default";

            this.addLabel(bbox);
            console.log("addLabel")
            document.getElementById("tmp_rect").remove();
        } else {
            this.mouse.startX = this.mouse.x;
            this.mouse.startY = this.mouse.y;
            this.element = document.createElement('div');
            this.element.id = 'tmp_rect';
            this.element.className = 'rectangle';
            this.element.style.position = "absolute";
            this.element.style.border = "1px solid red";
            this.element.style.left = this.mouse.x + 'px';
            this.element.style.top = this.mouse.y + 'px';
            parent.appendChild(this.element)
            canvas.style.cursor = "crosshair";
        }
        
        

    }

    enterImageMouse(evt){
        let canvas = evt.target;
        let parent = canvas.parentNode;

        let imgRects = canvas.getClientRects()[0]; 

        this.crossHairHorizontal = document.createElement('div');
        this.crossHairHorizontal.id = 'crosshair_hor';
        this.crossHairHorizontal.className = 'crosshair horizontal';
        this.crossHairHorizontal.style.left = this.mouse.x + 'px';
        this.crossHairHorizontal.style.top = this.mouse.y + 'px';
        this.crossHairHorizontal.style.position = "absolute";
        this.crossHairHorizontal.style.width = imgRects.width + "px";
        this.crossHairHorizontal.style.height = "1px";
        this.crossHairHorizontal.style.border = "0.5px dashed red";

        this.crossHairVertical = document.createElement('div');
        this.crossHairVertical.id = 'crosshair_ver';
        this.crossHairVertical.className = 'crosshair vertical';
        this.crossHairVertical.style.left = this.mouse.x + 'px';
        this.crossHairVertical.style.top = this.mouse.y + 'px';
        this.crossHairVertical.style.position = "absolute";
        this.crossHairVertical.style.height = imgRects.height + "px";
        this.crossHairVertical.style.width = "1px";
        this.crossHairVertical.style.border = "0.5px dashed red";

        parent.appendChild(this.crossHairHorizontal);
        parent.appendChild(this.crossHairVertical);
    }

    exitImageMouse(evt){
        this.crossHairHorizontal = null;
        this.crossHairVertical = null;

        document.getElementById("crosshair_hor").remove();
        document.getElementById("crosshair_ver").remove();
    }

    imageMouseMove(evt){

        this.setMousePosition(evt);

        if (this.element !== null) {
            this.element.style.width = Math.abs(this.mouse.x - this.mouse.startX) + 'px';
            this.element.style.height = Math.abs(this.mouse.y - this.mouse.startY) + 'px';
            this.element.style.left = (this.mouse.x - this.mouse.startX < 0) ? this.mouse.x + 'px' : this.mouse.startX + 'px';
            this.element.style.top = (this.mouse.y - this.mouse.startY < 0) ? this.mouse.y + 'px' : this.mouse.startY + 'px';
        }

        let canvas = evt.target;
        let imgRects = canvas.getClientRects()[0]; 

        this.crossHairHorizontal.style.left = imgRects.left + 'px' ;
        this.crossHairHorizontal.style.top = (this.mouse.y - 2) + 'px' ;

        this.crossHairVertical.style.left = (this.mouse.x - 2) + 'px' ;
        this.crossHairVertical.style.top = imgRects.top + 'px' ;

    }

    addLabel(bbox?, setup?) {

        let id = uuid().replace(/-/g, "");
        
        delete this.activePage.bbox;

        if (bbox){

            // remove potential index from skip-list
            if ( this.skipPagesIndex.findIndex(x => x == this.showPage) != -1){
                this.skipPagesIndex.splice( this.skipPagesIndex.findIndex(x => x == this.showPage), 1)
            }

            if (typeof(this.activePage.isSkipped) != "undefined"){
                delete this.activePage.isSkipped;
            }
            
            this.activePage.bbox = bbox;

            if (!setup){
                this.goToPage(this.showPage+1)   
            }
    
        }
    }

    initLabel(id?, bbox?) {
        // initialize our address

        let cntExistingBboxes;
        try{
            cntExistingBboxes  = this.myForm.value._childDocuments_.length; 
        }catch(err){
            cntExistingBboxes  = 0;
        }
        

        if (this.quickBox && cntExistingBboxes > 0){

            let template = this.myForm.value._childDocuments_[cntExistingBboxes-1];

            return this._fb.group({
                
                id: id || '',
                prob: '',
                sex : template.sex || '' ,
                attr_color: template.attr_color || '',
                attr_category:  template.attr_category  || '',
                attr_fabric: template.attr_fabric || '',
                attr_texture: template.attr_texture || '',
                attr_type: template.attr_type || '',
                bbox: bbox || ''
            });
        }else{
            return this._fb.group({
                
                id: id || '',
                prob: '',
                sex : '',
                attr_color: '',
                attr_category: (cntExistingBboxes == 0) ? this.templateAttrCategory : '' || '',
                attr_fabric: '',
                attr_texture: '',
                attr_type: (cntExistingBboxes == 0) ? this.templateAttrType : '' || '',
                bbox: bbox || ''
            });
        }
    
    }

    test(){
        console.log(this.labelObject)
    }

    approveObject(){
        

        if (this.getIsFinal()){

            if(!this.flagIsPageCalledFromWorkflow){
                this.updateUrlParamsToWF();
            }

            this.isLoading = true;
            this.progressService.loaderIsLoading();

            this.api.approveLabelObject(this.labelObject).then(res => {


                this.snackBar.open('Dokument bestätigt.', null, {
                    duration: 1500,
                  });
    
                this.clearView(); 
                this.getLabelObject();



            }).catch(err => {
                this.snackBar.open('Etwas hat nicht geklappt.', null, {
                    duration: 1500,
                });

                this.isLoading = false;
                this.progressService.loaderIsLoading();
                console.error(err);
            })
            
        }else{
            this.snackBar.open('Bitte erst alle Seiten labeln.', 'OK', {
                duration: 3000
              });
        }
        
    }

    getIsFinal(){
        let isFinal = true; 
        this.labelObject.pages.forEach((element, index) => {
            if (!element.bbox && this.skipPagesIndex.findIndex(x => x==index) == -1 && typeof(element.isSkipped) == "undefined"){
                isFinal = false;
            }
        });

        return isFinal;
    }

    disregardObject(){
        if (confirm('Dieses Objekt für die weitere Bearbeitung aussortieren?')) {
            
            if(!this.flagIsPageCalledFromWorkflow){
                this.updateUrlParamsToWF();
            }

            this.isLoading = true;

            this.progressService.loaderIsLoading();

            this.api.disregardObject(this.labelObject).then(res => {

                this.snackBar.open('Dokument wurde deaktiviert.', null, {
                    duration: 1500,
                  });
    
                this.clearView(); 
                this.getLabelObject();

                this.isLoading = false;
                // this.api.isLoading = false; 
                this.progressService.loaderIsComplete();

            }).catch(err => {
                this.snackBar.open('Etwas hat nicht geklappt.', null, {
                    duration: 1500,
                });
                console.error(err);
            });

        }
    }

    updateUrlParams(){
        this.router.navigate(
            [], 
            {
              relativeTo: this.route,
              queryParams: { objId: this.objId },
              queryParamsHandling: 'merge'
            });

        this.flagIsPageCalledFromWorkflow = true;
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


}
