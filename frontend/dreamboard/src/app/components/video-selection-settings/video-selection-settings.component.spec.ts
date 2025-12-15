import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoSelectionSettingsComponent } from './video-selection-settings.component';

describe('VideoSelectionSettingsComponent', () => {
  let component: VideoSelectionSettingsComponent;
  let fixture: ComponentFixture<VideoSelectionSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoSelectionSettingsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VideoSelectionSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
