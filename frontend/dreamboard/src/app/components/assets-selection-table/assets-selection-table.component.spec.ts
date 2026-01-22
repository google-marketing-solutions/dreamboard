import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssetsSelectionTableComponent } from './assets-selection-table.component';

describe('GeneratedImagesTableComponent', () => {
  let component: AssetsSelectionTableComponent;
  let fixture: ComponentFixture<AssetsSelectionTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetsSelectionTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssetsSelectionTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
