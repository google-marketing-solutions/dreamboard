import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileUploaderNewComponent } from './file-uploader-new.component';

describe('FileUploaderNewComponent', () => {
  let component: FileUploaderNewComponent;
  let fixture: ComponentFixture<FileUploaderNewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileUploaderNewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FileUploaderNewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
