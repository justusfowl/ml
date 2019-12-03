import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NerlabelComponent } from './nerlabel.component';

describe('NerlabelComponent', () => {
  let component: NerlabelComponent;
  let fixture: ComponentFixture<NerlabelComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NerlabelComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NerlabelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
