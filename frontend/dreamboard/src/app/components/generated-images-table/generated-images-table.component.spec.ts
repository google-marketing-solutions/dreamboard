import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeneratedImagesTableComponent } from './generated-images-table.component';

describe('GeneratedImagesTableComponent', () => {
  let component: GeneratedImagesTableComponent;
  let fixture: ComponentFixture<GeneratedImagesTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeneratedImagesTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeneratedImagesTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
