import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FichapacientesPage } from './fichapacientes.page';

describe('FichapacientesPage', () => {
  let component: FichapacientesPage;
  let fixture: ComponentFixture<FichapacientesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(FichapacientesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
