import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WalletDetailsPage } from './wallet-details-page';

describe('WalletDetailsPage', () => {
  let component: WalletDetailsPage;
  let fixture: ComponentFixture<WalletDetailsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [WalletDetailsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(WalletDetailsPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
