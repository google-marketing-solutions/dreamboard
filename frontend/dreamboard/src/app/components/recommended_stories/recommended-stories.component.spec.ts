import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecommendedStoriesComponent } from './recommended-stories.component';

describe('RecommendedStoriesComponent', () => {
  let component: RecommendedStoriesComponent;
  let fixture: ComponentFixture<RecommendedStoriesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecommendedStoriesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecommendedStoriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
