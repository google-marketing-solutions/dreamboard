import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssetsSelectionDialogComponent } from './assets-selection-dialog.component';

describe('AssetsSelectionDialogComponent', () => {
  let component: AssetsSelectionDialogComponent;
  let fixture: ComponentFixture<AssetsSelectionDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetsSelectionDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssetsSelectionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
