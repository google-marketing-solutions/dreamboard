import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeneratedVideosTableComponent } from './generated-videos-table.component';

describe('GeneratedVideosTableComponent', () => {
  let component: GeneratedVideosTableComponent;
  let fixture: ComponentFixture<GeneratedVideosTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeneratedVideosTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeneratedVideosTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
