import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageSelectionSettingsComponent } from './image-selection-settings.component';

describe('ImageSelectionSettingsComponent', () => {
  let component: ImageSelectionSettingsComponent;
  let fixture: ComponentFixture<ImageSelectionSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageSelectionSettingsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImageSelectionSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
