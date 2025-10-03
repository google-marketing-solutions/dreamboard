import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FrameExtractionComponent } from './frame-extraction.component';

describe('FrameExtractionComponent', () => {
  let component: FrameExtractionComponent;
  let fixture: ComponentFixture<FrameExtractionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FrameExtractionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FrameExtractionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});