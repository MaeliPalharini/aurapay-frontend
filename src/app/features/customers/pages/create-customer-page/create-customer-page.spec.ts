import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateCustomerPage } from './create-customer-page';

describe('CreateCustomerPage', () => {
  let component: CreateCustomerPage;
  let fixture: ComponentFixture<CreateCustomerPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CreateCustomerPage],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateCustomerPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
