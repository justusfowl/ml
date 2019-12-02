import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NlpComponent } from './nlp.component';

describe('NlpComponent', () => {
  let component: NlpComponent;
  let fixture: ComponentFixture<NlpComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NlpComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NlpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
